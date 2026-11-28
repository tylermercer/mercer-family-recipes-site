import { describe, it, expect } from 'vitest';
import { recipeTitleTransitionName } from '@utils/recipeTitleTransitionName';

describe('recipeTitleTransitionName', () => {
	it('prefixes the recipe id', () => {
		expect(recipeTitleTransitionName('pumpkin-cookies')).toBe('recipe-title-pumpkin-cookies');
	});

	it('stays a valid identifier for ids starting with a digit', () => {
		expect(recipeTitleTransitionName('3-ingredient-pumpkin-cookies')).toBe('recipe-title-3-ingredient-pumpkin-cookies');
	});

	it('keeps letters, digits, underscores, and hyphens', () => {
		expect(recipeTitleTransitionName('african-peanut-stew-1QpER4_O')).toBe('recipe-title-african-peanut-stew-1QpER4_O');
	});

	it('replaces characters that are not valid in an identifier', () => {
		expect(recipeTitleTransitionName('mac n cheese/v2.1')).toBe('recipe-title-mac-n-cheese-v2-1');
		expect(recipeTitleTransitionName('crème-brûlée')).toBe('recipe-title-cr-me-br-l-e');
	});

	it('gives different recipes different names', () => {
		expect(recipeTitleTransitionName('pie-crust')).not.toBe(recipeTitleTransitionName('pie-crust-2'));
	});
});
