import { describe, it, expect } from 'vitest';
import { calculate, financials } from '../frontend/susave/engine';
import { blankProject, parseDecimal, type Measure, type Project } from '../frontend/susave/model';
function fixture(): Project {
  const p = blankProject();
  p.usage.shower = 8; p.usage.toilet = 6; p.usage.kitchen = 6;
  p.reuse.collectionPercent = 100; p.reuse.yieldPercent = 75; p.reuse.capacity = 100;
  return p;
}
function measure(overrides: Partial<Measure> = {}): Measure {
  return { id: crypto.randomUUID(), name: 'Мера', category: 'shower', mode: 'volume', value: 4,
    equipment: 0, installation: 0, monthly: 0, hotWater: false, heatingSavings: 0, ...overrides };
}
describe('Обязательные примеры и физический баланс', () => {
  it('1: 5 м³ при тарифах 200 + 100 × 0,5 дают 1250 ₸; при коэффициенте 0 — 1000', () => {
    const p = fixture(); p.measures = [measure({ value: 5 })]; p.tariffWater = 200; p.tariffSewer = 100; p.sewerFactor = 0.5;
    expect(calculate(p).scenarios[1].billSaving).toBe(1250);
    p.sewerFactor = 0; expect(calculate(p).scenarios[1].billSaving).toBe(1000);
  });
  it('2: 8 × 75% → 6 м³ повторно, с обслуживанием 1 м³ покупается 15 из исходных 20', () => {
    const p = fixture(); p.reuse.serviceWater = 1;
    const s = calculate(p).scenarios[2];
    expect(s.reused).toBe(6); expect(s.purchased).toBe(15); expect(s.saved).toBe(5);
  });
  it('3: душ −4 м³ уменьшает источник; комбинированный расход 13 м³ и экономия 7', () => {
    const p = fixture(); p.measures = [measure()];
    const r = calculate(p), s = r.scenarios[3];
    expect(s.collected).toBe(4); expect(s.reused).toBe(3); expect(s.purchased).toBe(13); expect(s.saved).toBe(7);
    expect(s.saved).not.toBe(r.scenarios[1].saved + r.scenarios[2].saved);
  });
  it('4: 120000 / 5000 = 24 месяца', () => {
    const f = financials(120000, 5000, 0, 0);
    expect(f.paybackMonths).toBe(24); expect(f.cumulative).toHaveLength(61);
    expect(f.cumulative[0]).toBe(-120000); expect(f.cumulative[24]).toBe(0); expect(f.cumulative[60]).toBe(180000);
  });
  it('5: 3500 − 4000 = −500, окупаемости нет', () => {
    const f = financials(120000, 3500, 0, 4000);
    expect(f.net).toBe(-500); expect(f.paybackMonths).toBeNull(); expect(f.cumulative[60]).toBe(-150000);
  });
  it('6: повторное использование не добавляет экономию нагрева', () => {
    const p = fixture(); p.measures = [measure({ hotWater: true, heatingSavings: 2000 })];
    const r = calculate(p); expect(r.scenarios[2].heatingSaving).toBe(0);
    expect(r.scenarios[1].heatingSaving).toBe(2000); expect(r.scenarios[3].heatingSaving).toBe(2000);
    p.heatingIncluded = true; expect(calculate(p).scenarios.every(s => s.heatingSaving === 0)).toBe(true);
  });
  it('последовательные проценты не суммируются: 50% + 50% от 8 оставляют 2', () => {
    const p = fixture(); p.measures = [measure({ mode: 'percent', value: 50 }), measure({ mode: 'percent', value: 50 })];
    const s = calculate(p).scenarios[1]; expect(s.afterMeasures.shower).toBe(2); expect(s.applied.map(x => x.saved)).toEqual([4, 2]);
  });
  it('порядок абсолютных и процентных сокращений учитывается', () => {
    const p = fixture(); p.measures = [measure({ value: 2 }), measure({ mode: 'percent', value: 50 })];
    expect(calculate(p).scenarios[1].afterMeasures.shower).toBe(3);
    p.measures.reverse(); expect(calculate(p).scenarios[1].afterMeasures.shower).toBe(2);
  });
  it('сокращение ограничено остатком категории, нагрев нулевой меры исключён', () => {
    const p = fixture(); p.measures = [measure({ value: 100 }), measure({ value: 5, hotWater: true, heatingSavings: 1000 })];
    const s = calculate(p).scenarios[1]; expect(s.afterMeasures.shower).toBe(0); expect(s.saved).toBe(8);
    expect(s.heatingSaving).toBe(0); expect(s.applied[1].saved).toBe(0);
  });
  it('нулевой расход не вызывает деления на ноль', () => {
    const r = calculate(blankProject());
    for (const s of r.scenarios) {
      expect(s.purchased).toBe(0); expect(s.savedPercent).toBeNull(); expect(s.paybackMonths).toBeNull();
      expect(s.cumulative.every(Number.isFinite)).toBe(true);
    }
  });
  it('ограничение производительности действует по готовой воде', () => {
    const p = fixture(); p.reuse.capacity = 2;
    expect(calculate(p).scenarios[2].reused).toBe(2);
  });
  it('отсутствие подключённых источников даёт нулевое повторное использование', () => {
    const p = fixture(); p.reuse.shower = false; p.reuse.basin = false;
    expect(calculate(p).scenarios[2].reused).toBe(0);
  });
  it('кухня, стирка, туалет, полив и утечки не образуют доступный источник', () => {
    const p = fixture(); p.usage.shower = 0; p.usage.kitchen = 100; p.usage.leaks = 100;
    p.usage.irrigation = 100; p.usage.other = 100;
    expect(calculate(p).scenarios[2].collected).toBe(0);
  });
  it('сбор и очистка — независимые множители, смыв ограничивает результат', () => {
    const p = fixture(); p.usage.basin = 4; p.reuse.basin = true; p.reuse.collectionPercent = 50;
    let s = calculate(p).scenarios[2]; expect(s.collected).toBe(6); expect(s.reused).toBe(4.5);
    p.usage.toilet = 1; s = calculate(p).scenarios[2]; expect(s.reused).toBe(1);
  });
  it('сокращение смыва снижает спрос в комбинированном сценарии', () => {
    const p = fixture(); p.measures = [measure({ category: 'toilet', value: 5 })];
    const s = calculate(p).scenarios[3]; expect(s.demand).toBe(1); expect(s.reused).toBe(1); expect(s.purchased).toBe(14);
  });
  it('дополнительная вода честно увеличивает покупной расход и даёт отрицательную экономию', () => {
    const p = fixture(); p.reuse.serviceWater = 10; p.tariffWater = 200;
    const s = calculate(p).scenarios[2]; expect(s.purchased).toBe(24); expect(s.saved).toBe(-4); expect(s.savedPercent).toBe(-20);
    expect(s.billSaving).toBe(-800); expect(s.net).toBe(-800); expect(s.paybackMonths).toBeNull();
  });
  it('обслуживание и вложения учитываются даже при отсутствии источника', () => {
    const p = blankProject(); p.reuse.serviceWater = 1; p.reuse.monthly.service = 4000; p.reuse.costs.design = 1000;
    const s = calculate(p).scenarios[2]; expect(s.purchased).toBe(1); expect(s.saved).toBe(-1);
    expect(s.net).toBe(-4000); expect(s.investment).toBe(1000); expect(s.savedPercent).toBeNull();
  });
  it('в комбинированном сценарии каждую статью затрат считает один раз', () => {
    const p = fixture(); p.measures = [measure({ equipment: 100, installation: 200, monthly: 10 })];
    p.reuse.costs = { equipment: 1000, design: 2000, installation: 3000, commissioning: 4000 };
    p.reuse.monthly = { electricity: 1, consumables: 2, service: 3, quality: 4, repair: 5 };
    const r = calculate(p); expect(r.scenarios[0].investment).toBe(0); expect(r.scenarios[1].investment).toBe(300);
    expect(r.scenarios[2].investment).toBe(10000); expect(r.scenarios[3].investment).toBe(10300); expect(r.scenarios[3].operating).toBe(25);
  });
  it('нулевые вложения и положительная экономия дают нулевой срок', () => {
    expect(financials(0, 500, 0, 0).paybackMonths).toBe(0);
    expect(financials(0, 0, 0, 0).paybackMonths).toBeNull();
  });
  it('не возвращает Infinity при арифметическом переполнении', () => {
    expect(() => financials(Number.MAX_VALUE, Number.MIN_VALUE, 0, 0)).toThrow();
    expect(() => financials(0, Number.MAX_VALUE, Number.MAX_VALUE, 0)).toThrow();
    const p = fixture(); p.tariffWater = Number.MIN_VALUE;
    expect(() => calculate(p)).toThrow();
  });
  it('расчёт не изменяет исходные данные и повторяем', () => {
    const p = fixture(); p.measures = [measure()]; const copy = structuredClone(p);
    expect(calculate(p)).toEqual(calculate(p)); expect(p).toEqual(copy);
  });
  it.each([-1, NaN, Infinity, -Infinity])('отвергает некорректный объём %s', value => {
    const p = fixture(); p.usage.shower = value; expect(() => calculate(p)).toThrow();
  });
  it('отвергает отрицательные затраты, проценты больше 100 и коэффициент больше 1', () => {
    const p = fixture(); p.reuse.costs.design = -1; expect(() => calculate(p)).toThrow();
    p.reuse.costs.design = 0; p.reuse.yieldPercent = 101; expect(() => calculate(p)).toThrow();
    p.reuse.yieldPercent = 75; p.sewerFactor = 1.1; expect(() => calculate(p)).toThrow();
  });
  it('невозможна экономия нагрева для меры на туалете', () => {
    const p = fixture(); p.measures = [measure({ category: 'toilet', hotWater: true, heatingSavings: 1000 })];
    expect(() => calculate(p)).toThrow();
  });
});
describe('Русскоязычный числовой ввод', () => {
  it.each([['12,5', 12.5], ['12.5', 12.5], [' 0,5 ', 0.5], ['0', 0], [',25', 0.25]])('%s → %s', (text, value) => expect(parseDecimal(text)).toBe(value));
  it.each(['', ' ', '-1', 'NaN', 'Infinity', '1e9', '1,2,3', 'abc', '10000000000'])('отвергает %s', value => expect(() => parseDecimal(value)).toThrow());
  it('проверяет верхнюю границу', () => expect(() => parseDecimal('101', 100)).toThrow());
  it('не допускает исчезающе малых ненулевых входов', () => {
    expect(() => parseDecimal('0,0000001')).toThrow();
    expect(parseDecimal('0,000001')).toBe(0.000001);
  });
});
