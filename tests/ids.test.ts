import { afterEach, expect, it, vi } from 'vitest';
import { blankProject, id } from '../frontend/susave/model';
afterEach(() => vi.unstubAllGlobals());
it('создание объектов работает по HTTP в локальной сети без crypto.randomUUID', () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  const first = blankProject();
  expect(first.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(id()).not.toBe(first.id);
});
