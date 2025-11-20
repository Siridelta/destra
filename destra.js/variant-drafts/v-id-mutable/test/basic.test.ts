/**
 * Destra.js 基础功能测试/示例文件
 * 
 * 本文件展示了如何使用 Destra 的核心 API 来创建和管理数学表达式。
 * 这些示例涵盖了基本的表达式创建、变量声明、函数定义和使用等场景。
 * 
 * 注意，这里没有使用创作形式，而是模拟了预处理器的工作，手写标准形式。
 * （因为预处理器还没写，以及这个测试用例是基础功能测试，所以先这样x）
 */

import { describe, test, expect } from 'vitest';
import { expr, expl, type Expression, type VarExpl, type FuncExpl, type Substitutable, type Expl } from "../src/core/index";

describe('Basic Functionality Tests', () => {

    // ============================================================================
    // 1. 基础变量声明和表达式创建
    // ============================================================================
    describe('Basic Variable & Expression Creation', () => {
        test('should create basic variables correctly', () => {
            const a = expl`a = 3` as VarExpl;
            const b = expl`b = 5` as VarExpl;

            expect(a.constructor.name).toBe('VarExpl');
            expect(a.isEmbeddable).toBe(true);
            expect(a.deps).toEqual([]); // Variables shouldn't have deps in this context unless defined by others
            expect(b.constructor.name).toBe('VarExpl');
        });

        test('should create expressions using variables', () => {
            const a = expl`a = 3` as VarExpl;
            const b = expl`b = 5` as VarExpl;
            const sum = expr`${a} + ${b}`;

            expect(sum.deps).toContain(a);
            expect(sum.deps).toContain(b);
        });

        test('should handle complex IDs and types correctly', () => {
            // 左边并非合法 id，识别为 implicit equation
            const complexIdExpr = expr`_a1.1.sin.b.c_.8.x = 10`;
            expect(complexIdExpr.constructor.name).toBe('ImplicitEquation');

            // 左边为合法 id，识别为 explicit equation
            const complexIdExpr2 = expr`_a1.1.sin.b.c_.8.c = 10`;
            expect(complexIdExpr2.constructor.name).toBe('ExplicitEquation');

            // 左边为合法 id，识别为 variable
            const complexIdExpl = expl`_a1.1.sin.b.c_.8.d = 10`;
            expect(complexIdExpl.constructor.name).toBe('VarExpl');
        });

        test('should throw error for illegal ID in variable definition', () => {
            expect(() => {
                expl`_a1.1.sin.b.c_.8.x = 10`;
            }).toThrow();
        });

        test('should create pure numeric expressions', () => {
            const pureExpr = expr`2 + 3`;
            expect(pureExpr).toBeDefined();
        });
    });

    // ============================================================================
    // 2. 函数定义和调用
    // ============================================================================
    describe('Function Definition & Invocation', () => {
        test('should define and invoke arrow functions', () => {
            const square = expl`(x) => x^2` as FuncExpl<(x: Substitutable) => Expression>;
            expect((square as any).params).toEqual(['x']);

            const result1 = square(5);
            expect(result1.deps).toContain(square);
        });

        test('should define and invoke multi-parameter functions', () => {
            const distance = expl`(x, y) => sqrt(x^2 + y^2)` as FuncExpl<(x: Substitutable, y: Substitutable) => Expression>;
            expect((distance as any).params).toEqual(['x', 'y']);
        });

        test('should define named functions', () => {
            const namedFunc = expl`f(x) = x^2 + 1` as FuncExpl<any>;
            // 假设 expl 会自动提取函数名作为 ID 的最后一部分，或者如果只是匿名函数引用则不同
            // 这里主要测试对象创建成功
            expect(namedFunc).toBeDefined();
        });
    });

    // ============================================================================
    // 3. 复杂表达式组合
    // ============================================================================
    describe('Complex Expression Composition', () => {
        test('should compose complex expressions with multiple variables', () => {
            const p = expl`p = 2` as VarExpl;
            const q = expl`q = 3` as VarExpl;
            const C = expr`1` as Expression;

            const complexExpr = expr`${p}^2 + ${q}^2 + ${p} * ${q} + ${C}`;
            expect(complexExpr.deps).toContain(p);
            expect(complexExpr.deps).toContain(q);
            // C might be merged or referenced depending on implementation details of expr
        });

        test('should handle nested function calls', () => {
            const p = expl`p = 2` as VarExpl;
            const q = expl`q = 3` as VarExpl;
            
            const add = (expl`(a, b) => a + b` as FuncExpl<(a: Substitutable, b: Substitutable) => Expression>).id("add", true);
            const multiply = (expl`(a, b) => a * b` as FuncExpl<(a: Substitutable, b: Substitutable) => Expression>).id("multiply", true);

            const combined2 = add(multiply(p, q), p);
            expect(combined2.deps).toContain(add);
            // dependencies should be transitive or contained
        });
    });

    // ============================================================================
    // 4. 方程类型
    // ============================================================================
    describe('Equation Types', () => {
        test('should identify ExplicitEquation', () => {
            const explicitEq = expr`y = x^2`;
            expect(explicitEq.constructor.name).toBe('ExplicitEquation');
            expect(explicitEq.isEmbeddable).toBe(false);
        });

        test('should identify ImplicitEquation', () => {
            const implicitEq = expr`x^2 + y^2 = 1`;
            expect(implicitEq.constructor.name).toBe('ImplicitEquation');
            expect(implicitEq.isEmbeddable).toBe(false);
        });

        test('should identify Inequality (as generic Expression for now or specific type if impl)', () => {
            const inequality = expr`x >= 0`;
            // Depending on current implementation, it might be just Expression or specific
            expect(inequality).toBeDefined();
        });
    });

    // ============================================================================
    // 5. ID 设置
    // ============================================================================
    describe('ID Settings', () => {
        test('should set ID via DSL', () => {
            const myValue = (expl`myLib.myValue = 10` as VarExpl);
            expect(myValue.id()).toBe('myLib.myValue');
        });

        test('should set ID via method', () => {
            const myValue2 = (expl`10` as VarExpl);
            myValue2.id("myLib.myValue2");
            expect(myValue2.id()).toBe("myLib.myValue2");
        });
    });

    // ============================================================================
    // 6. 依赖关系验证
    // ============================================================================
    describe('Dependency Verification', () => {
        test('should collect dependencies correctly', () => {
            const base = expl`base = 10` as VarExpl;
            const power = expl`power = 2` as VarExpl;
            const calculation = expr`${base}^${power}`;

            expect(calculation.deps).toContain(base);
            expect(calculation.deps).toContain(power);
        });
    });

    // ============================================================================
    // 7. 错误处理示例
    // ============================================================================
    describe('Error Handling', () => {
        test('should throw error when embedding non-embeddable expressions', () => {
            const invalid = expr`y = x^2`; // ExplicitEquation, not embeddable
            
            expect(() => {
                expr`${invalid as any} + 1`;
            }).toThrow();
        });
    });
});
