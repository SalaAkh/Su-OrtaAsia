import { categoryKeys, type Project, type Usage } from './model';
import { validateProject } from './validation';
export type ScenarioId = 'baseline' | 'measures' | 'reuse' | 'combined';
export interface AppliedMeasure { id: string; name: string; before: number; after: number; saved: number }
export interface Scenario {
  id: ScenarioId; name: string; afterMeasures: Usage; applied: AppliedMeasure[];
  source: number; collected: number; cleaned: number; demand: number; reused: number; serviceWater: number;
  purchased: number; saved: number; savedPercent: number | null;
  investment: number; billSaving: number; heatingSaving: number; operating: number; net: number;
  paybackMonths: number | null; monthlyCost: number; cumulative: number[];
}
export interface Calculation { baselineVolume: number; baselineBill: number; scenarios: Scenario[] }
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
export function financials(investment: number, billSaving: number, heatingSaving: number, operating: number) {
  if (![investment, billSaving, heatingSaving, operating].every(Number.isFinite) || investment < 0 || heatingSaving < 0 || operating < 0) throw new Error('Некорректные финансовые данные');
  const net = billSaving + heatingSaving - operating;
  const paybackMonths = net > 0 ? investment / net : null;
  const cumulative = Array.from({ length: 61 }, (_, m) => -investment + m * net);
  if (!Number.isFinite(net) || (paybackMonths !== null && !Number.isFinite(paybackMonths)) || !cumulative.every(Number.isFinite)) throw new Error('Параметры выходят за пределы точности расчёта.');
  return { net, paybackMonths, cumulative };
}
export function calculate(p: Project): Calculation {
  validateProject(p);
  const baselineVolume = sum(categoryKeys.map(k => p.usage[k]));
  const baselineBill = baselineVolume * (p.tariffWater + p.tariffSewer);
  const scenarios = ([
    ['baseline', 'Исходное состояние', false, false],
    ['measures', 'Обычные меры', true, false],
    ['reuse', 'Повторное использование', false, true],
    ['combined', 'Меры + повторное использование', true, true],
  ] as const).map(([id, name, useMeasures, useReuse]): Scenario => {
    const usage = { ...p.usage };
    const applied: AppliedMeasure[] = [];
    let investment = 0, operating = 0, heatingSaving = 0;
    if (useMeasures) for (const m of p.measures) {
      const before = usage[m.category];
      const saved = Math.min(before, m.mode === 'percent' ? before * m.value / 100 : m.value);
      usage[m.category] = Math.max(0, before - saved);
      applied.push({ id: m.id, name: m.name, before, after: usage[m.category], saved });
      investment += m.equipment + m.installation;
      operating += m.monthly;
      if (!p.heatingIncluded && m.hotWater && saved > 0 && ['shower', 'basin', 'kitchen'].includes(m.category)) heatingSaving += m.heatingSavings;
    }
    const r = p.reuse;
    const source = useReuse ? (r.shower ? usage.shower : 0) + (r.basin ? usage.basin : 0) : 0;
    const collected = source * r.collectionPercent / 100;
    const cleaned = collected * r.yieldPercent / 100;
    const demand = usage.toilet;
    const reused = useReuse ? Math.min(cleaned, demand, r.capacity) : 0;
    const serviceWater = useReuse ? r.serviceWater : 0;
    if (useReuse) { investment += sum(Object.values(r.costs)); operating += sum(Object.values(r.monthly)); }
    const purchased = Math.max(0, sum(Object.values(usage)) - reused + serviceWater);
    const saved = baselineVolume - purchased;
    const billSaving = saved * p.tariffWater + saved * p.tariffSewer * p.sewerFactor;
    const f = financials(investment, billSaving, heatingSaving, operating);
    return { id, name, afterMeasures: usage, applied, source, collected, cleaned, demand, reused, serviceWater, purchased, saved,
      savedPercent: baselineVolume > 0 ? saved / baselineVolume * 100 : null,
      investment, billSaving, heatingSaving, operating, ...f, monthlyCost: baselineBill - billSaving + operating - heatingSaving };
  });
  return { baselineVolume, baselineBill, scenarios };
}
