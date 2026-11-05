import './style.css';
import { blankProject, demoProject, id, categories, categoryKeys, objectTypes, parseDecimal, type Project, type Measure, type Category } from './model';
import { calculate, sum, type Scenario, type ScenarioId } from './engine';
import { loadWorkspace, saveWorkspace, importJSON, type StoragePort } from './storage';
import { comparisonCSV } from './export';

const storage: StoragePort = { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) };
const loaded = loadWorkspace(storage);
let workspace = loaded.workspace;
let storageError = loaded.error;
let savingBlocked = !!loaded.error;
let step = 0;
let selectedScenario: ScenarioId = 'combined';
let notice = '';
const invalid = new Set<string>();
const app = document.querySelector<HTMLDivElement>('#app')!;
const money = (v: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v)} ₸`;
const num = (v: number, digits = 2) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(Object.is(v, -0) ? 0 : v);
const esc = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const current = (): Project => workspace.projects.find(p => p.id === workspace.activeId)!;
const drop = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3C13 8 6 16 6 21a10 10 0 0 0 20 0C26 16 19 8 16 3Z" fill="currentColor"/><path d="M11 21a5 5 0 0 0 5 5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
const steps = ['Объект и расход', 'Способы экономии', 'Повторное использование', 'Сравнение и окупаемость'];
const tips = ['Начните с вашего потребления', 'Сначала — простые изменения', 'Дайте воде вторую задачу', 'Принимайте решение с цифрами'];
const unitLabels = { equipment: 'Оборудование', design: 'Проектирование', installation: 'Монтаж и переделка коммуникаций', commissioning: 'Ввод в эксплуатацию' };
const runningLabels = { electricity: 'Электричество', consumables: 'Расходные материалы', service: 'Сервис', quality: 'Контроль качества', repair: 'Резерв ремонта' };
function valueAt(path: string): unknown { return path.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], current()); }
function setAt(path: string, value: unknown) {
  const keys = path.split('.');
  let target: unknown = current();
  for (const k of keys.slice(0, -1)) target = (target as Record<string, unknown>)[k];
  (target as Record<string, unknown>)[keys.at(-1)!] = value;
}
function field(path: string, label: string, options: { unit?: string; hint?: string; max?: number; text?: boolean; date?: boolean; required?: boolean; disabled?: boolean } = {}) {
  const fid = 'f-' + path.replaceAll('.', '-');
  const value = valueAt(path);
  return `<label class="field" for="${fid}"><span class="field-label">${label}</span><span class="input-wrap"><input id="${fid}" data-field="${path}" ${options.text || options.date ? '' : `data-number="${options.max ?? 1e9}" inputmode="decimal"`} type="${options.date ? 'date' : 'text'}" value="${esc(typeof value === 'number' ? String(value).replace('.', ',') : value)}" ${options.required ? 'required' : ''} ${options.disabled ? 'disabled' : ''} ${options.text ? `maxlength="${path === 'tariffSource' ? 2000 : 120}"` : ''} aria-describedby="${fid}-hint ${fid}-error" autocomplete="off">${options.unit ? `<span class="unit">${options.unit}</span>` : ''}</span><span class="hint" id="${fid}-hint">${options.hint ?? ''}</span><span class="field-error" id="${fid}-error"></span></label>`;
}
function checkbox(path: string, label: string, hint = '') {
  return `<label class="check"><input type="checkbox" data-field="${path}" ${valueAt(path) ? 'checked' : ''}><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
}
function select(path: string, label: string, values: Record<string, string>) {
  return `<label class="field"><span class="field-label">${label}</span><select data-field="${path}">${Object.entries(values).map(([v, l]) => `<option value="${v}" ${valueAt(path) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
}
function section(title: string, subtitle: string, content: string, extra = '') {
  return `<section class="card ${extra}"><div class="section-head"><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${content}</section>`;
}
function header() {
  const p = current();
  return `<aside class="sidebar"><a class="brand" href="#" data-action="home"><span class="brand-icon">${drop}</span>Su<span>Save</span></a><p class="brand-note">Умные решения для воды</p><div class="side-label">ВАШ РАСЧЁТ</div><nav aria-label="Разделы расчёта">${steps.map((s, i) => `<button class="nav-item ${step === i ? 'active' : ''}" data-step="${i}" ${step === i ? 'aria-current="step"' : ''}><span class="step-num">0${i + 1}</span><span>${s}</span>${i === step ? '<b>›</b>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="privacy-icon">⌘</div><b>Только на вашем устройстве</b><p>Без регистрации. Объекты и расчёты сохраняются в этом браузере.</p><span class="country">КАЗАХСТАН <i>·</i> KZT</span></div></aside>
  <div class="workspace"><header class="topbar"><div class="project-select"><span class="eyebrow">МОИ ОБЪЕКТЫ</span><select id="project-select" aria-label="Выбрать объект">${workspace.projects.map(o => `<option value="${esc(o.id)}" ${o.id === p.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></div><div class="top-actions"><span id="save-state" class="save-state">${storageError ? 'Не сохранено' : '✓ Сохранено локально'}</span><button data-action="new" class="btn secondary small">＋ Новый объект</button></div></header>
  <div class="sticky-total"><span>${drop} Исходный расход <strong id="baseline-total">${num(calculate(p).baselineVolume)} м³</strong><small>/ 30 дней</small></span><span class="local-caption">Ваши данные → понятный результат</span></div>
  <div id="storage-error" class="storage-error" role="alert" ${storageError ? '' : 'hidden'}>${esc(storageError ?? '')}${savingBlocked ? '<button class="btn secondary small" data-action="enable-save">Разрешить перезапись</button>' : ''}</div>
  <div id="validation-warning" role="alert" hidden>Исправьте выделенные поля. Показаны результаты по последним корректным данным.</div>
  <div class="page"><div class="page-heading"><div><div class="eyebrow">SU SAVE / ШАГ 0${step + 1}</div><h1>${steps[step]}</h1><p>${tips[step]}</p></div><button class="btn example" data-action="demo">→ Загрузить условный пример</button></div>
  ${p.demo ? '<div class="demo-notice"><b>Условный пример.</b> Все объёмы, цены и тарифы вымышлены. Это не нормативы и не тарифы города.</div>' : ''}
  <div id="notice" class="notice" role="status" ${notice ? '' : 'hidden'}>${esc(notice)}</div>`;
}
function overview() {
  const p = current();
  return `<div class="content-grid"><div class="form-stack">${section('01 / Ваш объект', 'Один объект — один независимый расчёт.', `<div class="fields two">${field('name', 'Название объекта', { text: true, required: true })}${select('kind', 'Тип объекта', objectTypes)}${field('city', 'Город', { text: true, hint: 'Информационное поле. Тарифы не подставляются автоматически.' })}<div class="period"><span class="field-label">Расчётный период</span><strong>30 дней</strong><span class="hint">Условный месяц для всех сценариев</span></div></div><div class="inline-actions"><button class="text-btn" data-action="rename">Переименовать</button><button class="text-btn danger" data-action="delete">Удалить объект</button></div>`)}
  ${section('02 / На что уходит вода', 'Введите объёмы за 30 дней. Каждую порцию воды учитывайте только в одной категории.', `<div class="usage-fields">${categoryKeys.map((k, i) => `<div class="usage-row"><span class="category-dot color-${i}"></span>${field(`usage.${k}`, categories[k], { unit: 'м³' })}</div>`).join('')}</div><div class="total-row"><span>Всего за расчётный месяц</span><strong data-total>${num(calculate(p).baselineVolume)} м³</strong></div>`)}
  ${section('03 / Тарифы и начисления', 'Укажите значения из квитанции или договора. Нулевой тариф означает, что эта статья не учитывается.', `<div class="fields two">${field('tariffWater', 'Водоснабжение', { unit: '₸/м³' })}${field('tariffSewer', 'Водоотведение', { unit: '₸/м³' })}${field('tariffDate', 'Дата тарифа', { date: true })}${field('tariffSource', 'Источник или примечание', { text: true, hint: 'Необязательно: квитанция, договор или ссылка.' })}</div>${field('sewerFactor', 'Коэффициент уменьшения оплачиваемого водоотведения', { max: 1, hint: 'От 0 до 1. Это финансовое допущение о начислениях, а не физический объём стоков.' })}<div class="explanation"><b>Как выбрать коэффициент</b><p><strong>1</strong> — каждый сэкономленный м³ покупной воды уменьшает оплачиваемое водоотведение на 1 м³.<br><strong>0</strong> — платёж за водоотведение не меняется. Постоянные платежи экономией не считаются.</p></div>`)}
  </div>${summary()}</div>`;
}
function summary() {
  return `<aside class="summary-column"><div class="summary-card"><div class="summary-art">${drop}<div class="orbit one"></div><div class="orbit two"></div><span class="art-dot"></span></div><span class="eyebrow">ПОТЕНЦИАЛ ВАШЕГО ОБЪЕКТА</span><h2>Каждый кубометр<br>имеет значение.</h2><p>Сравните изменения до покупки оборудования.</p><div id="live-summary"></div><button class="btn primary full" data-step="3">Смотреть сравнение <span>→</span></button></div><div class="side-note"><span>ⓘ</span><p>Предварительная оценка. Точность результата зависит от ваших исходных данных и допущений.</p></div><div class="side-note muted"><span>↓</span><p>Начинайте с измерений и устранения утечек. Затем оцените более сложные системы.</p></div></aside>`;
}
const templates: { name: string; category: Category }[] = [
  { name: 'Экономичная душевая лейка', category: 'shower' }, { name: 'Ограничение расхода умывальника', category: 'basin' },
  { name: 'Изменение расхода бачка', category: 'toilet' }, { name: 'Устранение утечки', category: 'leaks' }, { name: 'Собственная мера', category: 'other' },
];
function measuresPage() {
  const p = current();
  return `<div class="content-grid"><div class="form-stack">${section('Добавьте способ экономии', 'Эффект задаёте вы. Готовые названия не содержат нормативов или обещанной экономии.', `<div class="templates">${templates.map((t, i) => `<button class="template" data-template="${i}"><span>＋</span>${t.name}</button>`).join('')}</div>`)}
  <div class="explanation"><b>Порядок имеет значение</b><p>Меры применяются сверху вниз к оставшемуся расходу категории. Например, два сокращения по 50% оставляют 25% исходного расхода. Измените порядок стрелками.</p></div>
  ${p.measures.length ? p.measures.map((m, i) => measureCard(m, i)).join('') : '<div class="empty-state"><span>＋</span><h2>Начните с одной меры</h2><p>Выберите вариант выше и укажите ожидаемое сокращение воды и стоимость.</p></div>'}
  ${section('Экономия на нагреве', 'Только отдельная пользовательская оценка для мер, которые действительно сокращают использование горячей воды.', checkbox('heatingIncluded', 'Нагрев уже включён в оценку платежей', 'При включении отдельная экономия нагрева не прибавляется ни в одном сценарии.') + '<p class="hint">Повторное использование воды после душа само по себе не экономит энергию на нагрев.</p>')}
  </div>${summary()}</div>`;
}
function measureCard(m: Measure, i: number) {
  const prefix = `measures.${i}`;
  const hotEligible = ['shower', 'basin', 'kitchen'].includes(m.category);
  return section(`<span class="pill">${i + 1}</span> ${esc(m.name)}`, '', `<div class="measure-tools"><button class="text-btn" data-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Переместить меру ${i + 1} выше">↑ Выше</button><button class="text-btn" data-move="${i}" data-dir="1" ${i === current().measures.length - 1 ? 'disabled' : ''} aria-label="Переместить меру ${i + 1} ниже">↓ Ниже</button><button class="text-btn danger" data-remove="${i}">Удалить меру</button></div><div class="fields two">${field(`${prefix}.name`, 'Название меры', { text: true, required: true })}${select(`${prefix}.category`, 'Категория расхода', categories)}${select(`${prefix}.mode`, 'Способ задания сокращения', { volume: 'Объём, м³/месяц', percent: 'Процент от остатка категории' })}${field(`${prefix}.value`, 'Ожидаемое сокращение', { unit: m.mode === 'percent' ? '%' : 'м³/мес', max: m.mode === 'percent' ? 100 : 1e9 })}${field(`${prefix}.equipment`, 'Оборудование', { unit: '₸' })}${field(`${prefix}.installation`, 'Монтаж', { unit: '₸' })}${field(`${prefix}.monthly`, 'Обслуживание', { unit: '₸/мес' })}</div>${hotEligible ? `<div class="heating-box">${checkbox(`${prefix}.hotWater`, 'Мера уменьшает использование горячей воды')}${field(`${prefix}.heatingSavings`, 'Отдельная оценка экономии нагрева', { unit: '₸/мес', disabled: !m.hotWater || current().heatingIncluded, hint: 'По умолчанию 0. Укажите только эффект этой меры с учётом предыдущих; не дублируйте другие статьи. При нулевом сокращении воды не учитывается.' })}</div>` : ''}<div class="measure-result" data-measure-result="${i}"></div>`, 'measure-card');
}
function reusePage() {
  return `<div class="content-grid"><div class="form-stack"><div class="flow-banner"><div><span>01</span><b>Душ и умывальники</b><small>Допустимые источники</small></div><i>→</i><div><span>02</span><b>Сбор и обработка</b><small>С учётом потерь</small></div><i>→</i><div><span>03</span><b>Смыв туалетов</b><small>Замещение свежей воды</small></div></div>
  ${section('Источник и возможности системы', 'Вода кухни, стирки и туалетные стоки в источник не входят.', `<div class="source-checks">${checkbox('reuse.shower', 'Душ и ванна')}${checkbox('reuse.basin', 'Выбранные умывальники', 'Доля сбора ниже учитывает в том числе частичное подключение.')}</div><div class="fields two">${field('reuse.collectionPercent', 'Доля стока, которую удаётся собрать', { unit: '%', max: 100 })}${field('reuse.yieldPercent', 'Выход очищенной воды', { unit: '%', max: 100, hint: 'Какая часть собранного объёма остаётся после обработки.' })}${field('reuse.capacity', 'Производительность по готовой воде', { unit: 'м³/мес' })}${field('reuse.serviceWater', 'Свежая вода для обслуживания', { unit: 'м³/мес', hint: 'Добавляется к покупному расходу даже при нулевом повторном использовании.' })}</div><div id="reuse-balance"></div>`)}
  ${section('Полные вложения', 'Разовые затраты. Учитывайте каждую статью только один раз.', `<div class="fields two">${Object.entries(unitLabels).map(([key, label]) => field(`reuse.costs.${key}`, label, { unit: '₸' })).join('')}</div>`)}
  ${section('Эксплуатационные расходы', 'Дополнительные расходы системы за условный месяц из 30 дней.', `<div class="fields two">${Object.entries(runningLabels).map(([key, label]) => field(`reuse.monthly.${key}`, label, { unit: '₸/мес' })).join('')}</div>`)}
  <div class="explanation"><b>Что не проверяет месячный баланс</b><p>Совпадение потоков по времени, размер накопителя и техническую допустимость установки. Программа не определяет питьевую безопасность воды и не управляет оборудованием.</p></div></div>${summary()}</div>`;
}
function payback(s: Scenario) {
  return s.id === 'baseline' ? 'Не применяется' : s.paybackMonths === null ? 'При этих условиях не окупается' : s.paybackMonths === 0 ? 'Без первоначальных вложений' : `${num(s.paybackMonths, 1)} мес.`;
}
function metric(label: string, value: string, detail = '', extra = '') { return `<div class="metric ${extra}"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</div>`; }
function resultsPage() {
  const p = current(); const r = calculate(p); const s = r.scenarios.find(x => x.id === selectedScenario)!;
  return `<div class="result-toolbar"><div class="scenario-picker" role="group" aria-label="Сценарий результатов">${r.scenarios.map(x => `<button data-scenario="${x.id}" class="${s.id === x.id ? 'selected' : ''}" aria-pressed="${s.id === x.id}">${x.name}</button>`).join('')}</div></div>
  <div class="result-heading"><div><span class="eyebrow">ВЫБРАННЫЙ СЦЕНАРИЙ</span><h2>${s.name}</h2></div><span class="tag">30 дней · тенге</span></div>
  <div class="metrics-grid">${metric('Исходный → покупной расход', `${num(r.baselineVolume)} → ${num(s.purchased)}`, 'м³ за расчётный месяц')}${metric('Сокращение покупной воды', `${num(s.saved)} м³`, s.savedPercent === null ? 'Процент не определён: исходный расход равен нулю' : `${num(s.savedPercent, 1)}% от исходного расхода`, 'teal')}${metric('Повторно используется', `${num(s.reused)} м³`, `Вода для обслуживания: ${num(s.serviceWater)} м³`)}${metric('Снижение платежей', money(s.billSaving), 'До эксплуатационных расходов и нагрева')}${metric('Дополнительная эксплуатация', money(s.operating), 'В месяц, все выбранные меры и система')}${metric('Чистая экономия за месяц', money(s.net), `Допустимая экономия нагрева: ${money(s.heatingSaving)}`, s.net < 0 ? 'negative' : 'teal')}${metric('Полные вложения', money(s.investment), 'Оборудование, проектирование, монтаж и запуск')}${metric('Простая окупаемость', payback(s), s.net < 0 ? `Дополнительные расходы: ${money(-s.net)}/мес` : s.net === 0 ? 'Чистая экономия равна нулю' : `Результат за 5 лет: ${money(s.cumulative[60])}`, 'payback')}</div>
  ${r.baselineVolume === 0 ? '<div class="explanation">Исходный расход равен нулю. Заполните категории, чтобы оценить потенциал объекта. Расходы системы учитываются и при отсутствии источника.</div>' : ''}
  <div class="charts-grid">${section('Покупная вода по сценариям', 'Объём за 30 дней, м³. Включает воду для обслуживания.', volumeChart(r.scenarios))}${section('Денежный результат за 5 лет', 'Накопленный результат с учётом первоначальных вложений.', cashChart(r.scenarios))}</div>
  ${comparisonTable(r.scenarios)}
  ${section('Как получился результат', 'Для выбранного сценария все значения рассчитаны из текущих данных.', `<div class="calculation-grid"><div><h3>Водный баланс</h3><dl><dt>После обычных мер</dt><dd>${num(sum(Object.values(s.afterMeasures)))} м³</dd><dt>Собрано серой воды G</dt><dd>${num(s.collected)} м³</dd><dt>После обработки G × η</dt><dd>${num(s.cleaned)} м³</dd><dt>Оставшийся смыв D</dt><dd>${num(s.demand)} м³</dd><dt>Производительность C</dt><dd>${num(p.reuse.capacity)} м³</dd><dt>Повторно R = min(G × η, D, C)</dt><dd>${num(s.reused)} м³</dd></dl></div><div><h3>Финансовый баланс</h3><p class="formula">${num(s.saved)} × (${num(p.tariffWater)} + ${num(p.tariffSewer)} × ${num(p.sewerFactor)}) = ${money(s.billSaving)}</p><p>Чистая экономия = снижение платежей + допустимая экономия нагрева − эксплуатационные расходы.</p><p class="hint">Оценка исходных переменных платежей: ${money(r.baselineBill)}/мес. После изменений с эксплуатацией и отдельным эффектом нагрева: ${money(s.monthlyCost)}/мес.</p></div></div>`)}
  <div class="explanation"><b>Допущения финансовой модели</b><p>Одинаковый режим каждый месяц, неизменные тарифы, без дисконтирования и стоимости финансирования. Постоянные платежи не считаются экономией. Комбинированный сценарий заново рассчитывает источник серой воды и смыв после обычных мер.</p></div>
  <div class="export-card"><div><h2>Сохраните своё решение</h2><p>JSON — все объекты и настройки. CSV — сравнение текущего объекта. Печать — полный отчёт.</p></div>${exportButtons()}</div>`;
}
const colors = ['#9baebb', '#598bcc', '#71afa8', '#117c82'];
function volumeChart(scenarios: Scenario[]) {
  const max = Math.max(...scenarios.map(s => s.purchased), 1);
  return `<div class="bar-chart" role="img" aria-label="Расход покупной воды: ${scenarios.map(s => `${s.name} ${num(s.purchased)} м³`).join('; ')}">${scenarios.map((s, i) => `<div class="bar-group"><div class="bar-label"><span>${s.name}</span><b>${num(s.purchased)} <small>м³</small></b></div><div class="bar-track"><span style="width:${s.purchased / max * 100}%;background:${colors[i]}"></span></div></div>`).join('')}</div>`;
}
function cashChart(scenarios: Scenario[]) {
  const values = scenarios.flatMap(s => [s.cumulative[0], s.cumulative[60]]);
  const min = Math.min(...values, 0), max = Math.max(...values, 0);
  const span = max - min || 1;
  const y = (v: number) => 185 - (v - min) / span * 160;
  const x = (m: number) => 75 + m / 60 * 410;
  return `<svg class="cash-chart" viewBox="0 0 520 230" role="img" aria-label="Накопленный денежный результат за пять лет. Начальная точка — минус вложения; каждый месяц прибавляется чистая экономия. Точные значения за пять лет — в таблице.">
  ${[0, 0.5, 1].map(f => { const v = min + span * f; return `<line x1="75" x2="485" y1="${y(v)}" y2="${y(v)}" stroke="#e2e9ed"/><text x="65" y="${y(v) + 4}" text-anchor="end">${num(v / 1000, 1)}</text>`; }).join('')}<text x="12" y="12">тыс. ₸</text>
  <line x1="75" x2="485" y1="${y(0)}" y2="${y(0)}" stroke="#879da7" stroke-dasharray="4 4"/>
  ${scenarios.map((s, i) => `<polyline points="${s.cumulative.map((v, m) => `${x(m)},${y(v)}`).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="${i === 3 ? 3 : 2}" ${i === 0 ? 'stroke-dasharray="5 5"' : ''}/><circle cx="485" cy="${y(s.cumulative[60])}" r="3" fill="${colors[i]}"/>`).join('')}
  ${[0, 12, 24, 36, 48, 60].map(m => `<text x="${x(m)}" y="210" text-anchor="middle">${m}</text>`).join('')}<text x="485" y="227" text-anchor="end">месяцы</text></svg><div class="chart-legend">${scenarios.map((s, i) => `<span><i style="background:${colors[i]}"></i>${s.name}</span>`).join('')}</div>`;
}
function comparisonTable(scenarios: Scenario[]) {
  const rows: [string, (s: Scenario) => string][] = [
    ['Покупная вода, м³/мес', s => num(s.purchased)], ['Сокращение воды, м³/мес', s => num(s.saved)],
    ['Сокращение, %', s => s.savedPercent === null ? '—' : num(s.savedPercent, 1)], ['Повторно используется, м³/мес', s => num(s.reused)],
    ['Снижение платежей, ₸/мес', s => money(s.billSaving)], ['Экономия нагрева, ₸/мес', s => money(s.heatingSaving)],
    ['Эксплуатация, ₸/мес', s => money(s.operating)], ['Чистая экономия, ₸/мес', s => money(s.net)],
    ['Полные вложения, ₸', s => money(s.investment)], ['Простая окупаемость', payback], ['Результат за 5 лет, ₸', s => money(s.cumulative[60])],
  ];
  return section('Четыре сценария — одна модель', 'Сравнивайте каждый вариант с исходным состоянием.', `<div class="table-scroll" tabindex="0" role="region" aria-label="Таблица сравнения сценариев"><table><thead><tr><th scope="col">Показатель</th>${scenarios.map(s => `<th scope="col">${s.name}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, fn]) => `<tr><th scope="row">${label}</th>${scenarios.map(s => `<td class="${s.id === 'combined' ? 'combined-cell' : ''}">${fn(s)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
}
function exportButtons() {
  return `<div class="export-buttons"><button class="btn secondary" data-action="json">↓ Экспорт JSON</button><button class="btn secondary" data-action="import">↑ Импорт JSON</button><button class="btn secondary" data-action="csv">↓ Сравнение CSV</button><button class="btn primary" data-action="print">Печатный отчёт</button></div>`;
}
function render() {
  invalid.clear();
  app.innerHTML = header() + [overview, measuresPage, reusePage, resultsPage][step]() + `<div class="step-footer"><span>SuSave <small>· Предварительный расчёт</small></span><div>${step > 0 ? `<button class="btn secondary" data-step="${step - 1}">← Назад</button>` : ''}${step < 3 ? `<button class="btn primary" data-step="${step + 1}">Далее: ${steps[step + 1]} →</button>` : ''}</div></div>${step !== 3 ? `<details class="data-actions"><summary>Сохранение и перенос данных</summary>${exportButtons()}</details>` : ''}</div></div><input type="file" accept=".json,application/json" id="import-file" hidden><div id="print-report"></div>`;
  refreshComputed();
}
function refreshComputed() {
  const p = current(), r = calculate(p), s = r.scenarios[3];
  document.querySelector('#baseline-total')!.textContent = `${num(r.baselineVolume)} м³`;
  document.querySelectorAll('[data-total]').forEach(el => el.textContent = `${num(r.baselineVolume)} м³`);
  const live = document.querySelector('#live-summary');
  if (live) live.innerHTML = `<div class="summary-stat"><span>Меры + повторное использование</span><strong>${num(s.purchased)} <small>м³/месяц</small></strong></div><dl><dt>Сокращение воды</dt><dd>${num(s.saved)} м³</dd><dt>Чистая экономия</dt><dd class="${s.net < 0 ? 'negative-text' : ''}">${money(s.net)}/мес</dd></dl>`;
  const balance = document.querySelector('#reuse-balance');
  if (balance) balance.innerHTML = `<div class="balance-strip"><span>После обычных мер</span><b>Собрано ${num(s.collected)} м³ → готово ${num(s.cleaned)} м³ → повторно ${num(s.reused)} м³</b><small>Смыв: ${num(s.demand)} м³ · мощность: ${num(p.reuse.capacity)} м³ · берётся наименьший объём.</small></div>`;
  s.applied.forEach((m, i) => { const el = document.querySelector(`[data-measure-result="${i}"]`); if (el) el.textContent = `Категория: ${num(m.before)} → ${num(m.after)} м³. Фактическое сокращение: ${num(m.saved)} м³/месяц.`; });
}
function persist() {
  if (!savingBlocked) storageError = saveWorkspace(storage, workspace);
  const el = document.querySelector('#save-state'); if (el) el.textContent = storageError ? 'Не сохранено' : '✓ Сохранено локально';
  const banner = document.querySelector<HTMLDivElement>('#storage-error');
  if (banner && !savingBlocked) { banner.hidden = !storageError; banner.textContent = storageError ?? ''; }
}
function validToLeave() {
  if (!invalid.size) return true;
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  return false;
}
function download(contents: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function updateField(target: HTMLInputElement | HTMLSelectElement) {
  const path = target.dataset.field!;
  const previous = structuredClone(current());
  if (invalid.size && (target instanceof HTMLSelectElement || target.type === 'checkbox')) {
    if (target instanceof HTMLInputElement) target.checked = Boolean(valueAt(path));
    else target.value = String(valueAt(path));
    validToLeave();
    return;
  }
  try {
    let value: unknown;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') value = target.checked;
    else if (target.dataset.number !== undefined) value = parseDecimal(target.value, Number(target.dataset.number));
    else {
      value = target.value;
      if (target.required && !String(value).trim()) throw new Error('Введите название.');
      if (target instanceof HTMLInputElement && target.type === 'date' && target.validity.badInput) throw new Error('Введите корректную дату.');
    }
    setAt(path, value);
    invalid.delete(path); target.removeAttribute('aria-invalid');
    const error = document.getElementById(target.id + '-error'); if (error) error.textContent = '';
    if (path.startsWith('measures.') && path.endsWith('.category')) {
      const m = current().measures[Number(path.split('.')[1])];
      if (!['shower', 'basin', 'kitchen'].includes(m.category)) { m.hotWater = false; m.heatingSavings = 0; }
    }
    if (path.endsWith('.mode')) {
      const m = current().measures[Number(path.split('.')[1])];
      if (m.mode === 'percent' && m.value > 100) { m.value = 100; notice = 'Сокращение ограничено 100% при переходе на проценты.'; }
    }
    calculate(current());
    persist(); refreshComputed();
    if (path === 'name') {
      const option = document.querySelector<HTMLOptionElement>('#project-select option:checked'); if (option) option.textContent = current().name;
    }
    if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === 'checkbox')) {
      // Do not discard invalid text in another field when toggling a setting.
      if (!invalid.size) render();
    }
  } catch (e) {
    workspace.projects[workspace.projects.findIndex(p => p.id === previous.id)] = previous;
    invalid.add(path); target.setAttribute('aria-invalid', 'true');
    const error = document.getElementById(target.id + '-error'); if (error) error.textContent = e instanceof Error ? e.message : 'Проверьте значение.';
  }
  const warning = document.querySelector<HTMLDivElement>('#validation-warning'); if (warning) warning.hidden = invalid.size === 0;
}
app.addEventListener('input', e => {
  const t = e.target;
  if (t instanceof HTMLInputElement && t.dataset.field && t.type !== 'checkbox') updateField(t);
});
app.addEventListener('change', async e => {
  const t = e.target;
  if (t instanceof HTMLSelectElement && t.id === 'project-select') {
    if (!validToLeave()) { t.value = workspace.activeId; return; }
    workspace.activeId = t.value; notice = ''; persist(); render();
  } else if ((t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type === 'checkbox')) && t.dataset.field) updateField(t);
  else if (t instanceof HTMLInputElement && t.id === 'import-file' && t.files?.[0]) {
    try {
      const file = t.files[0]; if (file.size > 2_000_000) throw new Error('Файл слишком большой. Максимум 2 МБ.');
      const imported = importJSON(await file.text());
      if (!confirm(`Импорт заменит все текущие объекты (${workspace.projects.length}) объектами из файла (${imported.projects.length}). При необходимости сначала экспортируйте JSON. Продолжить?`)) return;
      workspace = imported; notice = `Импортировано объектов: ${workspace.projects.length}.`; persist(); render();
    } catch (e) { notice = e instanceof Error ? e.message : 'Ошибка импорта файла.'; render(); }
    finally { t.value = ''; }
  }
});
app.addEventListener('click', e => {
  const el = (e.target as Element).closest<HTMLElement>('button, a[data-action]');
  if (!el || (el instanceof HTMLButtonElement && el.disabled)) return;
  e.preventDefault();
  if (!validToLeave()) return;
  if (el.dataset.step !== undefined || el.dataset.action === 'home') {
    step = Number(el.dataset.step ?? 0); notice = ''; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (el.dataset.scenario) { selectedScenario = el.dataset.scenario as ScenarioId; render(); }
  else if (el.dataset.template !== undefined) {
    if (current().measures.length >= 100) { notice = 'Можно добавить до 100 мер.'; render(); return; }
    const t = templates[Number(el.dataset.template)];
    current().measures.push({ id: id(), name: t.name, category: t.category, mode: 'volume', value: 0, equipment: 0, installation: 0, monthly: 0, hotWater: false, heatingSavings: 0 });
    persist(); render(); document.querySelector('.measure-card:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (el.dataset.remove !== undefined) { current().measures.splice(Number(el.dataset.remove), 1); persist(); render(); }
  else if (el.dataset.move !== undefined) {
    const i = Number(el.dataset.move), j = i + Number(el.dataset.dir), measures = current().measures;
    [measures[i], measures[j]] = [measures[j], measures[i]]; persist(); render();
  } else action(el.dataset.action ?? '');
});
function action(name: string) {
  const p = current();
  if (name === 'new' || name === 'demo') {
    if (workspace.projects.length >= 50) { notice = 'Можно сохранить до 50 объектов. Экспортируйте и удалите ненужные.'; render(); return; }
    const title = name === 'new' ? prompt('Название нового объекта', `Объект ${workspace.projects.length + 1}`) : null;
    if (name === 'new' && title === null) return;
    if (name === 'new' && (!title?.trim() || title.length > 120)) { notice = 'Название должно содержать от 1 до 120 символов.'; render(); return; }
    const project = name === 'demo' ? demoProject() : blankProject(title!.trim());
    workspace.projects.push(project); workspace.activeId = project.id; step = 0; notice = ''; persist(); render();
  } else if (name === 'rename') {
    const title = prompt('Новое название объекта', p.name);
    if (title === null) return;
    if (!title.trim() || title.length > 120) { notice = 'Название должно содержать от 1 до 120 символов.'; render(); return; }
    p.name = title.trim(); persist(); render();
  } else if (name === 'delete') {
    if (!confirm(`Удалить объект «${p.name}» и его настройки? Это действие нельзя отменить.`)) return;
    workspace.projects = workspace.projects.filter(x => x.id !== p.id);
    if (!workspace.projects.length) workspace.projects.push(blankProject());
    workspace.activeId = workspace.projects[0].id; notice = 'Объект удалён.'; persist(); render();
  } else if (name === 'json') download(JSON.stringify(workspace, null, 2), 'susave-objects.json', 'application/json;charset=utf-8');
  else if (name === 'csv') download(comparisonCSV(p), 'susave-comparison.csv', 'text/csv;charset=utf-8');
  else if (name === 'import') document.querySelector<HTMLInputElement>('#import-file')!.click();
  else if (name === 'print') { prepareReport(); window.print(); }
  else if (name === 'enable-save' && confirm('Разрешить сохранение текущих объектов поверх непрочитанной записи? Исходные данные могут быть потеряны.')) { savingBlocked = false; persist(); render(); }
}
function prepareReport() {
  const p = current(), r = calculate(p);
  const list = (items: [string, string][]) => `<dl>${items.map(([key, val]) => `<dt>${esc(key)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>`;
  document.querySelector('#print-report')!.innerHTML = `<header><h1>SuSave — отчёт о водосбережении</h1><p>${esc(p.name)} · ${esc(objectTypes[p.kind])} · ${esc(p.city || 'Город не указан')}</p><p>Дата расчёта: ${new Date().toLocaleString('ru-RU')} · Период: 30 дней · Валюта: тенге</p>${p.demo ? '<b>Условный пример: все исходные данные вымышлены.</b>' : ''}${invalid.size ? '<b>Внимание: есть ошибки ввода. Отчёт использует последние корректные данные.</b>' : ''}</header><h2>Исходные данные</h2>${list(categoryKeys.map(k => [categories[k], `${num(p.usage[k])} м³`]))}${list([
    ['Исходный расход', `${num(r.baselineVolume)} м³`], ['Тариф водоснабжения', `${num(p.tariffWater)} ₸/м³`], ['Тариф водоотведения', `${num(p.tariffSewer)} ₸/м³`], ['Коэффициент уменьшения водоотведения', num(p.sewerFactor)], ['Дата тарифа', p.tariffDate || 'Не указана'], ['Источник', p.tariffSource || 'Не указан'], ['Нагрев уже включён в платежи', p.heatingIncluded ? 'Да — отдельная экономия отключена' : 'Нет'],
  ])}<h2>Обычные меры, в порядке применения</h2>${p.measures.length ? p.measures.map((m, i) => `<h3>${i + 1}. ${esc(m.name)}</h3>${list([
    ['Категория', categories[m.category]], ['Ожидаемое сокращение', `${num(m.value)} ${m.mode === 'percent' ? '% от остатка категории' : 'м³/месяц'}`], ['Оборудование', money(m.equipment)], ['Монтаж', money(m.installation)], ['Обслуживание', money(m.monthly) + '/мес'], ['Уменьшает горячую воду', m.hotWater ? 'Да' : 'Нет'], ['Оценка экономии нагрева', money(m.heatingSavings) + '/мес'], ['Фактическое сокращение', num(r.scenarios[1].applied[i].saved) + ' м³/мес'],
  ])}`).join('') : '<p>Меры не добавлены.</p>'}<h2>Система повторного использования</h2>${list([
    ['Подключённые источники', [p.reuse.shower ? 'Душ и ванна' : '', p.reuse.basin ? 'Умывальники' : ''].filter(Boolean).join(', ') || 'Нет'], ['Доля сбора', num(p.reuse.collectionPercent) + '%'], ['Выход очищенной воды', num(p.reuse.yieldPercent) + '%'], ['Производительность', num(p.reuse.capacity) + ' м³/мес'], ['Свежая вода для обслуживания', num(p.reuse.serviceWater) + ' м³/мес'],
    ...Object.entries(unitLabels).map(([k, v]): [string, string] => [v, money(p.reuse.costs[k as keyof typeof p.reuse.costs])]),
    ...Object.entries(runningLabels).map(([k, v]): [string, string] => [v, money(p.reuse.monthly[k as keyof typeof p.reuse.monthly]) + '/мес']),
  ])}${comparisonTable(r.scenarios)}<div class="charts-grid">${section('Покупная вода', 'м³/месяц', volumeChart(r.scenarios))}${section('Накопленный результат', '5 лет, с учётом вложений', cashChart(r.scenarios))}</div><h2>Формулы и допущения</h2><p>G — собранная серая вода после обычных мер; D — оставшийся смыв; η — выход очищенной воды; C — производительность. R = min(G × η, D, C). Покупной расход = расход после мер − R + свежая вода для обслуживания. ΔV = исходный − покупной расход.</p><p>S = ΔV × тариф воды + ΔV × тариф стоков × коэффициент. N = S + допустимая экономия нагрева − эксплуатация. Окупаемость = вложения / N при N &gt; 0; при N ≤ 0 окупаемости нет. Результат месяца m = −вложения + m × N.</p><p>Процентные меры применяются последовательно к остатку категории, не ниже нуля. Комбинированный сценарий пересчитывает источник и спрос. Нагрев от одного только повторного использования не экономится. Коэффициент стоков — финансовое допущение: 1 означает уменьшение оплачиваемых стоков на 1 м³ на каждый сэкономленный м³, 0 — неизменный платёж.</p><p>Одинаковый режим каждый месяц, неизменные тарифы, без дисконтирования и финансирования. Постоянные платежи исключены из экономии. Месячный баланс не проверяет совпадение потоков по времени, объём накопителя и техническую допустимость установки. Программа не определяет питьевую безопасность воды и не управляет оборудованием.</p>`;
}
window.addEventListener('beforeprint', prepareReport);
render();
