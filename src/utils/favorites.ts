/**
 * Favorite recipes, kept per browser in localStorage (there are no accounts). Stored as a JSON
 * array of recipe ids (slugs), most recently favorited last.
 */
export const FAVORITES_KEY = 'favorite-recipes';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** The favorited recipe ids. Missing, unreadable, or malformed storage reads as none. */
export function getFavorites(storage: Storage = localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(FAVORITES_KEY) ?? '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: string, storage: Storage = localStorage): boolean {
  return getFavorites(storage).includes(id);
}

/**
 * Adds or removes a recipe from the favorites and returns whether it's now a favorite. Returns
 * the previous state if storage can't be written (private browsing, quota), so the UI doesn't
 * claim a change that wasn't saved.
 */
export function setFavorite(id: string, favorite: boolean, storage: Storage = localStorage): boolean {
  const current = getFavorites(storage);
  const without = current.filter((existing) => existing !== id);
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(favorite ? [...without, id] : without));
    return favorite;
  } catch {
    return current.includes(id);
  }
}

/**
 * Moves favorites to the front, keeping the existing order within each group. Takes items with a
 * recipe id and returns a new array.
 */
export function favoritesFirst<T>(items: readonly T[], idOf: (item: T) => string, favorites: Iterable<string>): T[] {
  const favoriteIds = new Set(favorites);
  return [
    ...items.filter((item) => favoriteIds.has(idOf(item))),
    ...items.filter((item) => !favoriteIds.has(idOf(item))),
  ];
}
