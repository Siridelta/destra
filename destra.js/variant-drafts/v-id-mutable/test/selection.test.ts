import { describe, it, expect } from 'vitest';
import { expl, selection, builder } from '../src/core';

describe('Selection', () => {
    it('should create a selection object that retains original keys', () => {
        const a = expl`(1, 2)`.id('a');
        const b = expl`(3, 4)`.id('b');
        
        const sel = selection({ a, b });
        
        expect(sel.a).toBe(a);
        expect(sel.b).toBe(b);
    });

    it('should prepend ID to all items in the selection', () => {
        const a = expl`(1, 2)`.id('a');
        const b = expl`(3, 4)`.id('b');
        
        const sel = selection({ a, b });
        sel.idPrepend('group');
        
        expect(a.id()).toBe('group.a');
        expect(b.id()).toBe('group.b');
    });

    it('should handle nested selections recursively', () => {
        const a = expl`(1, 2)`.id('a');
        const b = expl`(3, 4)`.id('b');
        
        // inner selection
        const inner = selection({ b });
        
        // outer selection containing an expl and the inner selection
        const outer = selection({ a, inner });
        
        outer.idPrepend('root');
        
        expect(a.id()).toBe('root.a');
        expect(b.id()).toBe('root.b');
    });

    it('should handle multiple levels of nesting and prepending', () => {
        const myVar = expl`x`.id('myVar');
        
        const level1 = selection({ myVar });
        level1.idPrepend('L1'); // myVar -> L1.myVar
        
        const level2 = selection({ level1 });
        level2.idPrepend('L2'); // myVar -> L2.L1.myVar
        
        expect(myVar.id()).toBe('L2.L1.myVar');
    });

    it('should ignore non-IdMutable items gracefully (if any)', () => {
        // calculate: strictly typed selection only accepts IdMutable, 
        // but in JS runtime anything could happen. 
        // Our implementation checks `isIdMutable`.
        const a = expl`a`.id('a');
        const sel = selection({ a, random: 123 } as any);
        
        sel.idPrepend('test');
        
        expect(a.id()).toBe('test.a');
        expect(sel.random).toBe(123);
        // Should not crash
    });

    it('should work with builders inside selection', () => {
        const createPoint = builder((idDrvs) => (name: string) => {
            return expl`(0, 0)`.id(name).applyIdDrvs(idDrvs);
        });

        const sel = selection({ createPoint });
        sel.idPrepend('lib');

        const pt = createPoint('origin');
        expect(pt.id()).toBe('lib.origin');
    });
});

