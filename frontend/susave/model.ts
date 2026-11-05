export const categories = {
  shower: 'Душ и ванна', basin: 'Умывальники', toilet: 'Смыв туалетов',
  kitchen: 'Кухня и стирка', irrigation: 'Полив', leaks: 'Предполагаемые утечки', other: 'Прочее',
} as const;
export type Category = keyof typeof categories;
export const categoryKeys = Object.keys(categories) as Category[];
export const objectTypes = { apartment: 'Квартира', house: 'Частный дом', hotel: 'Гостиница', gym: 'Спортклуб', other: 'Другой объект' } as const;
export type Usage = Record<Category, number>;
export interface Measure {
  id: string; name: string; category: Category; mode: 'volume' | 'percent'; value: number;
  equipment: number; installation: number; monthly: number; hotWater: boolean; heatingSavings: number;
}
export interface Reuse {
  shower: boolean; basin: boolean; collectionPercent: number; yieldPercent: number;
  capacity: number; serviceWater: number;
  costs: { equipment: number; design: number; installation: number; commissioning: number };
  monthly: { electricity: number; consumables: number; service: number; quality: number; repair: number };
}
export interface Project {
  id: string; name: string; kind: keyof typeof objectTypes; city: string; demo: boolean;
  tariffWater: number; tariffSewer: number; sewerFactor: number; tariffDate: string; tariffSource: string;
  heatingIncluded: boolean; usage: Usage; measures: Measure[]; reuse: Reuse;
}
export interface Workspace { version: 1; activeId: string; projects: Project[] }
export function id(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // getRandomValues also works on HTTP LAN origins, unlike randomUUID.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function blankProject(name = 'Новый объект'): Project {
  return {
    id: id(), name, kind: 'apartment', city: '', demo: false,
    tariffWater: 0, tariffSewer: 0, sewerFactor: 1, tariffDate: '', tariffSource: '', heatingIncluded: false,
    usage: { shower: 0, basin: 0, toilet: 0, kitchen: 0, irrigation: 0, leaks: 0, other: 0 }, measures: [],
    reuse: { shower: true, basin: false, collectionPercent: 0, yieldPercent: 0, capacity: 0, serviceWater: 0,
      costs: { equipment: 0, design: 0, installation: 0, commissioning: 0 },
      monthly: { electricity: 0, consumables: 0, service: 0, quality: 0, repair: 0 } },
  };
}
export function demoProject(): Project {
  const p = blankProject('Дом в Алматы · пример');
  p.demo = true; p.kind = 'house'; p.city = 'Алматы';
  p.tariffWater = 200; p.tariffSewer = 100; p.sewerFactor = 0.5;
  p.tariffSource = 'Вымышленные значения для знакомства. Не тарифы города.';
  p.usage = { shower: 8, basin: 2, toilet: 6, kitchen: 6, irrigation: 3, leaks: 1, other: 2 };
  p.measures = [
    { id: id(), name: 'Экономичная душевая лейка', category: 'shower', mode: 'percent', value: 30, equipment: 14000, installation: 2000, monthly: 0, hotWater: true, heatingSavings: 0 },
    { id: id(), name: 'Устранение утечки', category: 'leaks', mode: 'volume', value: 1, equipment: 3000, installation: 6000, monthly: 0, hotWater: false, heatingSavings: 0 },
  ];
  p.reuse = { shower: true, basin: true, collectionPercent: 90, yieldPercent: 80, capacity: 8, serviceWater: 0.2,
    costs: { equipment: 180000, design: 20000, installation: 50000, commissioning: 10000 },
    monthly: { electricity: 200, consumables: 250, service: 200, quality: 100, repair: 150 } };
  return p;
}
export function parseDecimal(raw: string, max = 1e9): number {
  const normalized = raw.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) throw new Error('Введите неотрицательное число. Можно использовать запятую.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`Допустимое значение: от 0 до ${max.toLocaleString('ru-RU')}.`);
  if (n > 0 && n < 0.000001) throw new Error('Минимальное ненулевое значение — 0,000001.');
  return n;
}
