import { describe, it, expect } from 'vitest';
import { expl, builder } from '../src/core';

describe('Builder', () => {
    it('should create a callable function', () => {
        const createVal = builder((idDrvs) => (val: number) => {
            return expl`${val}`.id("val").applyIdDrvs(idDrvs);
        });
        
        const v = createVal(42);
        // For a template `42` where 42 is a value, strings are ["", ""] and values is [42]
        expect(v.template.values[0]).toBe(42);
    });

    it('should apply identity transformation by default', () => {
        const createNamed = builder((idDrvs) => (name: string) => {
            return expl`0`.id(name).applyIdDrvs(idDrvs);
        });

        const v = createNamed('test');
        expect(v.id()).toBe('test');
    });

    it('should apply prepended ID segments', () => {
        const createNamed = builder((idDrvs) => (name: string) => {
            return expl`0`.id(name).applyIdDrvs(idDrvs);
        });

        createNamed.prefix('namespace');
        
        const v = createNamed('item');
        expect(v.id()).toBe('namespace.item');
    });

    it('should stack multiple prepends in correct order (LIFO/Outer-last)', () => {
        // Context: Usually we wrap builder in a selection, then wrap that selection in another.
        // The "outer" selection calls prefix LAST.
        // e.g. 
        // inner = selection({ b: builder }).prefix('inner');
        // outer = selection({ inner }).prefix('outer');
        //
        // Effectively: builder.prefix('inner') then builder.prefix('outer')
        // Expected ID: outer.inner.name
        
        const createNamed = builder((idDrvs) => (name: string) => {
            return expl`0`.id(name).applyIdDrvs(idDrvs);
        });

        createNamed.prefix('inner');
        createNamed.prefix('outer');

        const v = createNamed('item');
        expect(v.id()).toBe('outer.inner.item');
    });

    it('should support ID derivation for multiple internal expressions', () => {
        const createComplex = builder((idDrvs) => () => {
            const part1 = expl`1`.id('part1').applyIdDrvs(idDrvs);
            const part2 = expl`2`.id('part2').applyIdDrvs(idDrvs);
            return { part1, part2 };
        });

        createComplex.prefix('sys');

        const { part1, part2 } = createComplex();
        expect(part1.id()).toBe('sys.part1');
        expect(part2.id()).toBe('sys.part2');
    });
    
    it('should handle dynamic parameters in builder', () => {
        const createIndexed = builder((idDrvs) => (index: number) => {
            return expl`0`.id(`var_${index}`).applyIdDrvs(idDrvs);
        });
        
        createIndexed.prefix('loop');
        
        const v1 = createIndexed(1);
        expect(v1.id()).toBe('loop.var_1');
        
        const v2 = createIndexed(99);
        expect(v2.id()).toBe('loop.var_99');
    });
});

