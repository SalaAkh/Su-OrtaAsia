import { categories, objectTypes, type Project, type Workspace } from './model';
const fail = (path: string): never => { throw new Error(`Некорректные данные: ${path}.`); };
function record(v: unknown, path: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(path);
  return v as Record<string, unknown>;
}
function text(v: unknown, path: string, max = 2000, nonempty = false) {
  if (typeof v !== 'string' || v.length > max || (nonempty && !v.trim())) fail(path);
}
function number(v: unknown, path: string, max = 1e9) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max || (v > 0 && v < 0.000001)) fail(path);
}
function bool(v: unknown, path: string) { if (typeof v !== 'boolean') fail(path); }
function choice(v: unknown, options: string[], path: string) { if (typeof v !== 'string' || !options.includes(v)) fail(path); }
function knownFields(obj: Record<string, unknown>, names: string[], path: string) {
  if (Object.keys(obj).some(key => !names.includes(key))) fail(`${path}: неизвестное поле`);
}
function numericFields(v: unknown, names: string[], path: string) {
  const obj = record(v, path);
  knownFields(obj, names, path);
  names.forEach(key => number(obj[key], `${path}.${key}`));
}
export function validateProject(value: unknown): asserts value is Project {
  const p = record(value, 'объект');
  knownFields(p, ['id', 'name', 'kind', 'city', 'demo', 'tariffWater', 'tariffSewer', 'sewerFactor', 'tariffDate', 'tariffSource', 'heatingIncluded', 'usage', 'measures', 'reuse'], 'объект');
  text(p.id, 'идентификатор объекта', 100, true); text(p.name, 'название', 120, true);
  text(p.city, 'город', 120); text(p.tariffSource, 'источник тарифа');
  text(p.tariffDate, 'дата тарифа', 10);
  if (p.tariffDate !== '') {
    const date = String(p.tariffDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail('дата тарифа');
  }
  choice(p.kind, Object.keys(objectTypes), 'тип объекта');
  bool(p.demo, 'признак примера'); bool(p.heatingIncluded, 'учёт нагрева');
  number(p.tariffWater, 'тариф воды'); number(p.tariffSewer, 'тариф водоотведения'); number(p.sewerFactor, 'коэффициент водоотведения', 1);
  numericFields(p.usage, Object.keys(categories), 'расход');
  if (!Array.isArray(p.measures) || p.measures.length > 100) fail('список мер (до 100)');
  const ids = new Set<string>();
  for (const entry of p.measures as unknown[]) {
    const m = record(entry, 'мера');
    knownFields(m, ['id', 'name', 'category', 'mode', 'value', 'equipment', 'installation', 'monthly', 'hotWater', 'heatingSavings'], 'мера');
    text(m.id, 'идентификатор меры', 100, true);
    if (ids.has(String(m.id))) fail('повторяющийся идентификатор меры');
    ids.add(String(m.id));
    text(m.name, 'название меры', 120, true); choice(m.category, Object.keys(categories), 'категория меры');
    choice(m.mode, ['percent', 'volume'], 'единица сокращения');
    number(m.value, 'сокращение', m.mode === 'percent' ? 100 : 1e9);
    ['equipment', 'installation', 'monthly', 'heatingSavings'].forEach(k => number(m[k], `мера.${k}`));
    bool(m.hotWater, 'уменьшение горячей воды');
    if (m.hotWater && !['shower', 'basin', 'kitchen'].includes(String(m.category))) fail('нагрев доступен только для душа, умывальника, кухни и стирки');
  }
  const r = record(p.reuse, 'повторное использование');
  knownFields(r, ['shower', 'basin', 'collectionPercent', 'yieldPercent', 'capacity', 'serviceWater', 'costs', 'monthly'], 'повторное использование');
  bool(r.shower, 'сбор душа'); bool(r.basin, 'сбор умывальников');
  number(r.collectionPercent, 'доля сбора', 100); number(r.yieldPercent, 'выход очищенной воды', 100);
  number(r.capacity, 'производительность'); number(r.serviceWater, 'вода для обслуживания');
  numericFields(r.costs, ['equipment', 'design', 'installation', 'commissioning'], 'вложения системы');
  numericFields(r.monthly, ['electricity', 'consumables', 'service', 'quality', 'repair'], 'обслуживание системы');
}
export function validateWorkspace(value: unknown): Workspace {
  const w = record(value, 'файл');
  knownFields(w, ['version', 'activeId', 'projects'], 'файл');
  if (w.version !== 1) fail('версия формата (ожидается 1)');
  if (!Array.isArray(w.projects) || w.projects.length < 1 || w.projects.length > 50) fail('объекты (от 1 до 50)');
  const ids = new Set<string>();
  for (const p of w.projects as unknown[]) {
    validateProject(p);
    if (ids.has(p.id)) fail('повторяющийся идентификатор объекта');
    ids.add(p.id);
  }
  if (typeof w.activeId !== 'string' || !ids.has(w.activeId)) fail('активный объект');
  return structuredClone(value) as Workspace;
}
