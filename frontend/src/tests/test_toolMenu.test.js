/**
 * Tests for toolMenu.js — STUDIO_ITEMS configuration.
 */

import { describe, it, expect } from 'vitest';
import { STUDIO_ITEMS } from '../tools/toolMenu';

describe('STUDIO_ITEMS', () => {
    /** Tests for the toolbox menu configuration array. */

    it('exports a non-empty array', () => {
        /** Verifies STUDIO_ITEMS is defined and has entries. */
        expect(Array.isArray(STUDIO_ITEMS)).toBe(true);
        expect(STUDIO_ITEMS.length).toBeGreaterThan(0);
    });

    it('each item has a title and icon', () => {
        /** Verifies every item has the required shape. */
        STUDIO_ITEMS.forEach((item) => {
            expect(item).toHaveProperty('title');
            expect(typeof item.title).toBe('string');
            expect(item).toHaveProperty('icon');
            // lucide-react icons are React forwardRef objects (typeof 'object')
            expect(item.icon).toBeTruthy();
        });
    });

    it('has no duplicate titles', () => {
        /** Verifies every item has a unique title. */
        const titles = STUDIO_ITEMS.map((i) => i.title);
        expect(new Set(titles).size).toBe(titles.length);
    });
});
