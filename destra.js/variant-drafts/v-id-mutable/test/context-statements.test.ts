
import { describe, test, expect } from 'vitest';
import { 
    For, With, Sum, Int, Func, 
    expl, expr, type CtxVarExpl, type CtxVar, type CtxFuncExpl, type Expression, type Substitutable, FormulaType
} from "../src/core/index";

describe('Context Statements Factories', () => {

    // ============================================================================
    // 1. For (List Comprehension)
    // ============================================================================
    describe('For (List Comprehension)', () => {
        test('should create a For loop', () => {
            const result = For`i = [1...10]`(({i}) => {
                return expr`${i}^2` as Expression;
            });

            expect(result.constructor.name).toBe('CtxExpression');
            expect(result.ctxKind).toBe('for');
            expect(result.ctxVars.length).toBe(1);
            expect(result.ctxVars[0].name).toBe('i');
            expect(result.body).toBeDefined();
        });

        test('should create a For loop with multiple variables', () => {
            const result = For`i = [1...10], j = [1...5]`(({i, j}) => {
                return expr`${i} + ${j}` as Expression;
            });

            expect(result.ctxVars.length).toBe(2);
            expect(result.ctxVars[0].name).toBe('i');
            expect(result.ctxVars[1].name).toBe('j');
        });

        test('should create a named For variable using expl.For', () => {
            const result = expl.For`i = [1...10]`(({i}) => {
                return expr`${i}^2` as Expression;
            }).id('myList');

            expect(result.constructor.name).toBe('CtxVarExpl');
            expect(result.ctxKind).toBe('for');
            expect(result.id()).toBe('myList');
        });
    });

    // ============================================================================
    // 2. With (Scope / Let-binding)
    // ============================================================================
    describe('With (Local Variables)', () => {
        test('should create a With block', () => {
            const result = With`a = 10`(({a}) => {
                return expr`${a} * 2` as Expression;
            });

            expect(result.constructor.name).toBe('CtxExpression');
            expect(result.ctxKind).toBe('with');
            expect(result.ctxVars[0].name).toBe('a');
        });

        test('should create a With block with multiple variables', () => {
            const result = With`a = 10, b = 20`(({a, b}) => {
                return expr`${a} + ${b}` as Expression;
            });

            expect(result.ctxVars.length).toBe(2);
        });

        test('should throw error on nested With statements', () => {
            expect(() => {
                With`a = 1`(({a}) => {
                    // Nested With should throw
                    return With`b = 2`(({b}) => {
                        return expr`${a} + ${b}` as Expression;
                    });
                });
            }).toThrow(/with 语句不支持嵌套/);
        });

        test('should create a named With variable using expl.With', () => {
            const result = expl.With`val = 5`(({val}) => {
                return expr`${val}^2` as Expression;
            }).id('myVal');

            expect(result.constructor.name).toBe('CtxVarExpl');
            expect(result.id()).toBe('myVal');
        });
    });

    // ============================================================================
    // 3. Sum (Summation)
    // ============================================================================
    describe('Sum (Summation)', () => {
        test('should create a Sum expression', () => {
            const result = Sum`n = 1, 10`((n: CtxVar) => {
                return expr`${n}^2` as Expression;
            });

            expect(result.constructor.name).toBe('CtxExpression');
            expect(result.ctxKind).toBe('sum');
            expect(result.ctxVars.length).toBe(1);
            expect(result.ctxVars[0].name).toBe('n');
        });

        test('should create a named Sum variable using expl.Sum', () => {
            const result = expl.Sum`k = 0, 5`((k: CtxVar) => {
                return expr`${k} * 2` as Expression;
            }).id('sumVal');

            expect(result.constructor.name).toBe('CtxVarExpl');
            expect(result.id()).toBe('sumVal');
        });
    });

    // ============================================================================
    // 4. Int (Integration)
    // ============================================================================
    describe('Int (Integration)', () => {
        test('should create an Int expression', () => {
            const result = Int`x = 0, 1`((x: CtxVar) => {
                return expr`${x}^2` as Expression;
            });

            expect(result.constructor.name).toBe('CtxExpression');
            expect(result.ctxKind).toBe('int');
            expect(result.ctxVars.length).toBe(1);
            expect(result.ctxVars[0].name).toBe('x');
        });

        test('should create a named Int variable using expl.Int', () => {
            const result = expl.Int`t = 0, 10`((t: CtxVar) => {
                return expr`${t}` as Expression;
            }).id('area');

            expect(result.constructor.name).toBe('CtxVarExpl');
            expect(result.id()).toBe('area');
        });
    });

    // ============================================================================
    // 5. Func (Function Definition)
    // ============================================================================
    describe('Func (Function Definition)', () => {
        test('should create a Func definition', () => {
            const f = Func`x, y`(({x, y}) => {
                return expr`${x}^2 + ${y}^2` as Expression;
            }).id('f');

            expect(f.type).toBe(FormulaType.Function);
            // @ts-ignore
            expect(f.ctxKind).toBe('func');
            // @ts-ignore
            expect(f.params).toEqual(['x', 'y']);
        });

        test('should be callable', () => {
            const f = Func`x`(({x}) => expr`${x} + 1` as Expression) as CtxFuncExpl<(x: Substitutable) => Expression>;
            const callExpr = f(10);
            expect(callExpr.deps).toContain(f);
        });

        test('should throw error when external context variable is passed to Func', () => {
             expect(() => {
                // External context variable
                With`a = 10`(({a}) => {
                    // Function definition inside With using 'a'
                    const g = Func`x`(({x}) => {
                        return expr`${x} + ${a}` as Expression; // Using 'a' from outer scope
                    }) as CtxFuncExpl<(x: Substitutable) => Expression>;
                    return g(10);
                });
            }).toThrow(/外源上下文变量被传递到函数定义内/);
        });
    });

    // ============================================================================
    // 6. General Constraints
    // ============================================================================
    describe('General Constraints', () => {
        test('should throw error when context variable is leaked to outer scope', () => {
            expect(() => {
                let leakedVar: CtxVar;
                For`i = [1...10]`(({i}) => {
                    leakedVar = i;
                    return expr`${i}` as Expression;
                });
                
                // Usage outside of context
                // Note: Ideally this check happens at creation time of the outer expression that uses the leaked var.
                // But since we are just testing creation logic, we need to simulate a scenario where a CtxExp is created 
                // that depends on a leaked var from an inner CtxExp, and that inner CtxExp is *inside* the outer one's scope?
                // Wait, the check `checkNoCtxVarPassingToOuter` checks if *within the CtxExp being created*, 
                // there is a dependency on a CtxVar whose sourceCtx is *inside* the dependency tree but we are at a point *outside* of it?
                
                // Let's try to construct the specific case that triggers `checkNoCtxVarPassingToOuter`.
                // It iterates the formula. If it sees a CtxExp, it records it. If it sees a CtxVar, it records it.
                // Finally it checks if any seen CtxVar has a sourceCtx that is in seen CtxExps.
                
                // Actually, the logic `checkNoCtxVarPassingToOuter` seems to check:
                // If I am creating `OuterResult`, and I traverse `OuterResult`, 
                // if I see a `InnerCtxExp` (e.g. a For loop inside), I add it to `seenCtxExps`.
                // If I see a `CtxVar` (e.g. `i` from that For loop), I add it to `seenCtxVars`.
                // If `i.sourceCtx` is `InnerCtxExp`, it means `i` is used *outside* of `InnerCtxExp` (because `InnerCtxExp` is a dependency, and `i` is also a dependency of `OuterResult` directly or via other path).
                
                // Example:
                // OuterResult = expr`${InnerLoop} + ${InnerLoopVar}`
                
                let innerVar: CtxVar;
                const innerLoop = For`i=[1..10]`(({i}) => {
                    innerVar = i;
                    return expr`${i}` as Expression;
                });
                
                // Now create an expression that uses both innerLoop and innerVar
                // This is not exactly creating a CtxExp, just a regular Expr. 
                // But `checkNoCtxVarPassingToOuter` is called inside CtxExp factories.
                // So we need to wrap this in another CtxExp to trigger the check.
                
                With`dummy = 1`(() => {
                    return expr`${innerLoop} + ${innerVar}` as Expression;
                });

            }).toThrow(/上下文变量被传递到上下文语句外/);
        });

        test('should throw error for duplicate variable definitions', () => {
            expect(() => {
                With`a = 1, a = 2`(() => expr`0` as Expression);
            }).toThrow(/变量名不能重复/);
        });
        
        test('should parse complex definition correctly', () => {
             const a = expl`a = 5` as CtxVarExpl;
             // With definitions using interpolation
             const result = With`x = ${a} + 1`(({x}) => expr`${x}` as Expression);
             expect(result.ctxVars[0].name).toBe('x');
        });
    });
});

