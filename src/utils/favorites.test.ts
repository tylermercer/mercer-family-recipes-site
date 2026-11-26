import { describe, it, expect, vi } from 'vitest';
import { FAVORITES_KEY, favoritesFirst, getFavorites, isFavorite, setFavorite } from '@utils/favorites';

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(FAVORITES_KEY, initial);
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('getFavorites', () => {
  it('reads stored ids', () => {
    expect(getFavorites(memoryStorage('["a","b"]'))).toEqual(['a', 'b']);
  });

  it.each([
    ['nothing stored', undefined],
    ['invalid JSON', '{nope'],
    ['a non-array', '{"a":1}'],
  ])('reads %s as no favorites', (_, stored) => {
    expect(getFavorites(memoryStorage(stored))).toEqual([]);
  });

  it('drops non-string entries and duplicates', () => {
    expect(getFavorites(memoryStorage('["a",1,null,"a","b"]'))).toEqual(['a', 'b']);
  });

  it('reads as none when storage throws', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(),
    };
    expect(getFavorites(storage)).toEqual([]);
  });
});

describe('setFavorite / isFavorite', () => {
  it('adds and removes a favorite', () => {
    const storage = memoryStorage();
    expect(setFavorite('pie', true, storage)).toBe(true);
    expect(isFavorite('pie', storage)).toBe(true);
    expect(setFavorite('pie', false, storage)).toBe(false);
    expect(isFavorite('pie', storage)).toBe(false);
    expect(storage.data.get(FAVORITES_KEY)).toBe('[]');
  });

  it('does not duplicate an existing favorite, and moves it to the end', () => {
    const storage = memoryStorage('["pie","cake"]');
    setFavorite('pie', true, storage);
    expect(getFavorites(storage)).toEqual(['cake', 'pie']);
  });

  it('reports the unchanged state when storage cannot be written', () => {
    const storage = {
      getItem: () => '["pie"]',
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
    };
    expect(setFavorite('cake', true, storage)).toBe(false);
    expect(setFavorite('pie', false, storage)).toBe(true);
  });
});

describe('favoritesFirst', () => {
  const recipes = ['apple', 'banana', 'cherry', 'date'].map((id) => ({ id }));
  const idOf = (r: { id: string }) => r.id;

  it('moves favorites to the front, keeping each group in order', () => {
    expect(favoritesFirst(recipes, idOf, ['date', 'banana']).map(idOf)).toEqual(['banana', 'date', 'apple', 'cherry']);
  });

  it('ignores favorites that are not in the list', () => {
    expect(favoritesFirst(recipes, idOf, ['gone']).map(idOf)).toEqual(['apple', 'banana', 'cherry', 'date']);
  });

  it('does not change the input array', () => {
    const copy = [...recipes];
    favoritesFirst(recipes, idOf, ['date']);
    expect(recipes).toEqual(copy);
  });
});
