import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1] / '.test-artifacts'
ROOT.mkdir(exist_ok=True)
BASE=os.environ.get('SUSAVE_URL', 'http://127.0.0.1:4173').rstrip('/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
    page=context.new_page()
    errors=[]; external=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:external.append(r.url) if not r.url.startswith(BASE) else None)
    page.goto(BASE,wait_until='networkidle')
    expect(page.locator('#baseline-total')).to_have_text('0 м³')
    def field(path,value): page.locator(f'[data-field="{path}"]').fill(str(value))
    def go(step): page.locator(f'.nav-item[data-step="{step}"]').click()
    field('name','Тестовый дом'); field('city','Алматы')
    field('usage.shower','8');field('usage.toilet','6');field('usage.kitchen','6')
    field('tariffWater','200');field('tariffSewer','100');field('sewerFactor','0,5')
    field('tariffDate','2026-11-04');field('tariffSource','Условные данные для проверки')
    expect(page.locator('#baseline-total')).to_have_text('20 м³')
    field('usage.shower','-1')
    expect(page.locator('#validation-warning')).to_be_visible()
    go(1);expect(page.locator('h1')).to_have_text('Объект и расход')
    field('usage.shower','8')
    page.reload(wait_until='networkidle');expect(page.locator('[data-field="name"]')).to_have_value('Тестовый дом')
    expect(page.locator('[data-field="sewerFactor"]')).to_have_value('0,5')
    go(1);page.locator('[data-template="0"]').click()
    field('measures.0.value','4');field('measures.0.equipment','120000')
    expect(page.locator('[data-measure-result="0"]')).to_contain_text('8 → 4 м³')
    go(2);field('reuse.collectionPercent','100');field('reuse.yieldPercent','75');field('reuse.capacity','20')
    expect(page.locator('#reuse-balance')).to_contain_text('повторно 3 м³')
    go(3);expect(page.locator('.metrics-grid')).to_contain_text('20 → 13')
    expect(page.locator('.metrics-grid')).to_contain_text('1 750 ₸')
    page.screenshot(path=str(ROOT/'desktop-results.png'),full_page=True)
    with page.expect_download() as download:page.locator('[data-action="json"]').click()
    download.value.save_as(ROOT/'objects.json')
    saved=json.loads((ROOT/'objects.json').read_text())
    assert saved['projects'][0]['usage']['shower']==8
    assert saved['projects'][0]['measures'][0]['value']==4
    assert saved['projects'][0]['sewerFactor']==0.5
    with page.expect_download() as download:page.locator('[data-action="csv"]').click()
    download.value.save_as(ROOT/'comparison.csv')
    csv=(ROOT/'comparison.csv').read_text(encoding='utf-8-sig')
    assert '"Меры + повторное использование";"13";"7";"35";"3";"1750"' in csv
    page.evaluate('window.print = () => { window.__printed = true; }')
    page.locator('[data-action="print"]').click()
    assert page.evaluate('window.__printed')
    expect(page.locator('#print-report')).to_contain_text('120 000 ₸')
    page.emulate_media(media='print')
    expect(page.locator('#print-report')).to_be_visible()
    expect(page.locator('.workspace')).to_be_hidden()
    page.pdf(path=str(ROOT/'report.pdf'),print_background=True)
    page.emulate_media(media='screen')
    page.locator('#import-file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{"version":1,"projects":[]}'})
    expect(page.locator('#notice')).to_contain_text('Некорректные данные')
    assert page.evaluate("JSON.parse(localStorage.getItem('susave.workspace.v1')).projects[0].name")=='Тестовый дом'
    renamed=json.loads(json.dumps(saved));renamed['projects'][0]['name']='Импортированный дом'
    page.once('dialog',lambda d:d.accept())
    page.locator('#import-file').set_input_files({'name':'valid.json','mimeType':'application/json','buffer':json.dumps(renamed).encode()})
    expect(page.locator('#notice')).to_contain_text('Импортировано объектов: 1')
    page.once('dialog',lambda d:d.accept('Второй объект'))
    page.locator('[data-action="new"]').click()
    expect(page.locator('[data-field="name"]')).to_have_value('Второй объект')
    page.once('dialog',lambda d:d.accept('Офис'))
    page.locator('[data-action="rename"]').click()
    expect(page.locator('[data-field="name"]')).to_have_value('Офис')
    page.reload(wait_until='networkidle');expect(page.locator('[data-field="name"]')).to_have_value('Офис')
    page.once('dialog',lambda d:d.accept())
    page.locator('[data-action="delete"]').click()
    expect(page.locator('[data-field="name"]')).to_have_value('Импортированный дом')
    page.locator('[data-action="demo"]').click()
    expect(page.locator('.demo-notice')).to_contain_text('вымышлены')
    page.screenshot(path=str(ROOT/'desktop-object.png'),full_page=True)
    # No remote assets or external services are used, including when offline after loading.
    context.set_offline(True)
    field('usage.shower','8,5');expect(page.locator('#baseline-total')).to_have_text('28,5 м³')
    go(3);expect(page.locator('.metrics-grid')).to_be_visible()
    context.set_offline(False)
    # Check all four sections at two narrow viewports.
    for width in [390,320]:
        page.set_viewport_size({'width':width,'height':844})
        for step in range(4):
            go(step)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow at {width}, step {step}'
            expect(page.locator('h1')).to_have_text(['Объект и расход','Способы экономии','Повторное использование','Сравнение и окупаемость'][step])
            if width==390:page.screenshot(path=str(ROOT/f'mobile-{step}.png'),full_page=True)
    assert not errors,errors
    assert not external,external
    # Storage read errors must remain visible; input still works without overwriting unreadable data.
    blocked=browser.new_context()
    blocked.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('Denied','SecurityError')}})")
    bp=blocked.new_page();bp.goto(BASE,wait_until='networkidle')
    expect(bp.locator('#storage-error')).to_contain_text('Не удалось восстановить')
    bp.locator('[data-field="usage.shower"]').fill('3,5')
    expect(bp.locator('#baseline-total')).to_have_text('3,5 м³')
    blocked.close()
    print('PASS: create, edit, decimal comma, invalid input, persistence/reload, sequential measures, reuse, all scenarios, JSON/CSV downloads, validated imports, rename/delete, demo, offline calculation, print PDF, 390px/320px mobile, storage error, no console errors or external requests')
    browser.close()
