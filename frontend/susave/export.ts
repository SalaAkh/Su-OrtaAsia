import { calculate } from './engine';
import { categories, categoryKeys, objectTypes, type Project } from './model';
export function comparisonCSV(p: Project, calculatedAt = new Date()): string {
  const r = calculate(p);
  const rows: (string | number)[][] = [
    ['SuSave — сравнение сценариев'], ['Объект', p.name], ['Тип', objectTypes[p.kind]], ['Город', p.city],
    ['Дата расчёта', calculatedAt.toISOString()], ['Период, дней', 30], ['Условный пример', p.demo ? 'Да, данные вымышлены' : 'Нет'],
    ['Водоснабжение, ₸/м³', p.tariffWater], ['Водоотведение, ₸/м³', p.tariffSewer], ['Коэффициент водоотведения', p.sewerFactor],
    ['Дата тарифа', p.tariffDate], ['Источник тарифа', p.tariffSource],
    ...categoryKeys.map(k => [categories[k] + ', м³', p.usage[k]]), [],
    ['Сценарий', 'Покупная вода, м³', 'Сокращение, м³', 'Сокращение, %', 'Повторно, м³', 'Снижение платежей, ₸/мес', 'Нагрев, ₸/мес', 'Эксплуатация, ₸/мес', 'Чистая экономия, ₸/мес', 'Вложения, ₸', 'Окупаемость, мес', 'Результат за 5 лет, ₸'],
    ...r.scenarios.map(s => [s.name, s.purchased, s.saved, s.savedPercent ?? 'Не определено', s.reused, s.billSaving, s.heatingSaving, s.operating, s.net, s.investment, s.id === 'baseline' ? 'Не применяется' : s.paybackMonths ?? 'При этих условиях не окупается', s.cumulative[60]]), [],
    ['Допущения', '30 дней в месяце; постоянные тарифы и режим; без дисконтирования и стоимости финансирования; месячный баланс не определяет безопасность или техническую допустимость установки.'],
  ];
  // Quoting alone does not prevent spreadsheet formula injection in user-provided text.
  const cell = (v: string | number) => {
    const s = typeof v === 'number' ? String(Number(v.toFixed(6))).replace('.', ',') : (/^[\s]*[=+\-@]/.test(v) ? "'" + v : v);
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
