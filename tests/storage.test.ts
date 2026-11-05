import { it, expect } from 'vitest';
import { blankProject, demoProject, type Workspace } from '../frontend/susave/model';
import { importJSON, freshWorkspace, loadWorkspace, saveWorkspace, type StoragePort } from '../frontend/susave/storage';
import { comparisonCSV } from '../frontend/susave/export';
import { validateWorkspace } from '../frontend/susave/validation';
const wrap = (p = demoProject()): Workspace => ({ version: 1, activeId: p.id, projects: [p] });
it('экспорт и импорт JSON полностью сохраняют объект, меры и настройки', () => {
  const w = wrap(); expect(importJSON(JSON.stringify(w))).toEqual(w);
});
it('пустое хранилище создаёт объект с нулевыми исходными данными', () => {
  const loaded = loadWorkspace({ getItem: () => null, setItem: () => {} });
  expect(loaded.error).toBeNull(); expect(loaded.workspace.projects[0].demo).toBe(false); expect(loaded.workspace.projects[0].tariffWater).toBe(0);
});
it('локальное сохранение и восстановление сохраняют все данные', () => {
  let raw: string | null = null; const port: StoragePort = { getItem: () => raw, setItem: (_, v) => { raw = v; } };
  const w = wrap(); expect(saveWorkspace(port, w)).toBeNull(); expect(loadWorkspace(port).workspace).toEqual(w);
});
it('повреждённая запись не перезаписывается при чтении', () => {
  let writes = 0; const loaded = loadWorkspace({ getItem: () => '{broken', setItem: () => { writes++; } });
  expect(loaded.error).not.toBeNull(); expect(writes).toBe(0); expect(loaded.workspace.projects).toHaveLength(1);
});
it('ошибки доступа и переполнение хранилища возвращают понятное сообщение', () => {
  const port: StoragePort = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  expect(loadWorkspace(port).error).toContain('Не удалось'); expect(saveWorkspace(port, freshWorkspace())).toContain('JSON');
});
it.each(['null', '{}', '[]', '{"version":2}', '{oops'])('некорректная структура отклоняется: %s', input => expect(() => importJSON(input)).toThrow());
it('проверяет поля вложенной системы, типы, идентификаторы и дату', () => {
  const w = wrap();
  const missing = structuredClone(w) as unknown as { projects: { reuse: { monthly: { service?: number } } }[] };
  delete missing.projects[0].reuse.monthly.service; expect(() => validateWorkspace(missing)).toThrow();
  w.projects[0].tariffDate = '2026-02-30'; expect(() => validateWorkspace(w)).toThrow();
  w.projects[0].tariffDate = '2026-02-28'; expect(() => validateWorkspace(w)).not.toThrow();
  w.projects.push(structuredClone(w.projects[0])); expect(() => validateWorkspace(w)).toThrow();
});
it('несуществующий активный объект не принимается', () => { const w = wrap(); w.activeId = 'missing'; expect(() => validateWorkspace(w)).toThrow(); });
it('неизвестные скрытые категории и статьи затрат не влияют на расчёт: файл отвергается', () => {
  const w = wrap();
  Object.assign(w.projects[0].usage, { hidden: 100 });
  expect(() => validateWorkspace(w)).toThrow('неизвестное поле');
  const costs = wrap(); Object.assign(costs.projects[0].reuse.costs, { hiddenFee: 100 });
  expect(() => validateWorkspace(costs)).toThrow('неизвестное поле');
});
it('слишком большой файл отклоняется до разбора', () => expect(() => importJSON(' '.repeat(2_000_001))).toThrow('2 МБ'));
it('CSV содержит те же вычисленные значения, русские заголовки и защищает формулы', () => {
  const p = blankProject('=HYPERLINK("bad")'); p.usage.shower = 10; p.usage.toilet = 5;
  const csv = comparisonCSV(p, new Date('2026-11-04T00:00:00Z'));
  expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('2026-11-04T00:00:00.000Z'); expect(csv).toContain('Окупаемость, мес'); expect(csv).toContain('"15"');
});
