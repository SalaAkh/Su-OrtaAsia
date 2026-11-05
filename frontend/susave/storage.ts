import { blankProject, type Workspace } from './model';
import { validateWorkspace } from './validation';
export const STORAGE_KEY = 'susave.workspace.v1';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function freshWorkspace(): Workspace { const p = blankProject(); return { version: 1, activeId: p.id, projects: [p] }; }
export function importJSON(raw: string): Workspace {
  if (raw.length > 2_000_000) throw new Error('Файл слишком большой. Максимум 2 МБ.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Не удалось прочитать JSON. Проверьте формат файла.'); }
  return validateWorkspace(parsed);
}
export function loadWorkspace(storage: StoragePort): { workspace: Workspace; error: string | null } {
  try { const raw = storage.getItem(STORAGE_KEY); return { workspace: raw ? importJSON(raw) : freshWorkspace(), error: null }; }
  catch { return { workspace: freshWorkspace(), error: 'Не удалось восстановить локальные данные. Исходная запись сохранена без изменений. Экспортируйте новые данные в JSON или разрешите перезапись хранилища.' }; }
}
export function saveWorkspace(storage: StoragePort, workspace: Workspace): string | null {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(validateWorkspace(workspace))); return null; }
  catch { return 'Не удалось сохранить данные на устройстве. Возможно, хранилище недоступно или заполнено. Скачайте JSON, чтобы не потерять расчёт.'; }
}
