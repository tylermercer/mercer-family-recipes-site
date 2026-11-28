/**
 * The view-transition-name shared by a recipe's title in a recipe list and the h1 on its page, so
 * the browser animates one into the other when navigating between them (see the @view-transition
 * rule in base.scss). Names must be valid CSS identifiers and unique on a page; a recipe appears
 * at most once per list, and ids are prefixed so one starting with a digit is still valid.
 */
export function recipeTitleTransitionName(recipeId: string): string {
	return `recipe-title-${recipeId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
