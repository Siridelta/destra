
import { describe, test, expect } from 'vitest';
import { expl, type VarExpl, type FuncExpl, type Substitutable } from "../src/core/index";

describe('Realname API Tests', () => {

    // ============================================================================
    // 1. 基本设置和获取功能
    // ============================================================================
    describe('Basic Setters & Getters', () => {
        test('should set and get realname correctly', () => {
            const vec1 = expl`(1, 2)` as VarExpl;
            vec1.id("physics.vec");
            vec1.realname("v_ec");
            
            expect(vec1.realname()).toBe("v_ec");
            expect(vec1.id()).toBe("physics.vec");
        });

        test('should return undefined when realname is not set', () => {
            const vec2 = expl`(3, 4)` as VarExpl;
            vec2.id("math.vec");
            expect(vec2.realname()).toBeUndefined();
        });

        test('should overwrite existing realname', () => {
            const vec1 = expl`(1, 2)` as VarExpl;
            vec1.realname("v_ec");
            vec1.realname("v_elocity");
            expect(vec1.realname()).toBe("v_elocity");
        });
    });

    // ============================================================================
    // 2. 链式调用支持
    // ============================================================================
    describe('Chaining Support', () => {
        test('should support chaining', () => {
            const vec3 = expl`(5, 6)` as VarExpl;
            vec3.id("physics.vector").realname("v_ec");
            
            expect(vec3.id()).toBe("physics.vector");
            expect(vec3.realname()).toBe("v_ec");
        });

        test('should support multiple chaining calls', () => {
            const vec4 = expl`(7, 8)` as VarExpl;
            vec4.id("math.vector").realname("v_1").realname("v_2");
            expect(vec4.realname()).toBe("v_2");
        });
    });

    // ============================================================================
    // 3. 合法格式测试
    // ============================================================================
    describe('Valid Formats', () => {
        test('should accept simple letters', () => {
            const a = expl`10` as VarExpl;
            a.realname("a");
            expect(a.realname()).toBe("a");
        });

        test('should accept letter with numeric subscript', () => {
            const a1 = expl`20` as VarExpl;
            a1.realname("a_1");
            expect(a1.realname()).toBe("a_1");
        });

        test('should accept letter with letter subscript', () => {
            const ab = expl`30` as VarExpl;
            ab.realname("a_b");
            expect(ab.realname()).toBe("a_b");
        });

        test('should accept letter with mixed subscript', () => {
            const a1xy = expl`40` as VarExpl;
            a1xy.realname("a_1xy");
            expect(a1xy.realname()).toBe("a_1xy");
        });

        test('should accept greek aliases', () => {
            const alpha = expl`1` as VarExpl;
            alpha.realname("alpha");
            expect(alpha.realname()).toBe("alpha");

            const Alpha = expl`3` as VarExpl;
            Alpha.realname("Alpha");
            expect(Alpha.realname()).toBe("Alpha");

            const alpha1 = expl`5` as VarExpl;
            alpha1.realname("alpha_1");
            expect(alpha1.realname()).toBe("alpha_1");
        });

        test('should convert greek characters to aliases', () => {
            const α = expl`10` as VarExpl;
            α.realname("α");
            expect(α.realname()).toBe("alpha");

            const Ω = expl`50` as VarExpl;
            Ω.realname("Ω");
            expect(Ω.realname()).toBe("Omega");

            const α1 = expl`60` as VarExpl;
            α1.realname("α_1");
            expect(α1.realname()).toBe("alpha_1");
        });
    });

    // ============================================================================
    // 4. 非法格式测试
    // ============================================================================
    describe('Invalid Formats', () => {
        test('should throw on empty string', () => {
            const invalid1 = expl`100` as VarExpl;
            expect(() => invalid1.realname("")).toThrow();
        });

        test('should throw on number start', () => {
            const invalid2 = expl`200` as VarExpl;
            expect(() => invalid2.realname("1a")).toThrow();
        });

        test('should throw on underscore start', () => {
            const invalid3 = expl`300` as VarExpl;
            expect(() => invalid3.realname("_a")).toThrow();
        });

        test('should throw on multiple underscores', () => {
            const invalid4 = expl`400` as VarExpl;
            expect(() => invalid4.realname("a__1")).toThrow();
        });

        test('should throw on empty subscript', () => {
            const invalid5 = expl`500` as VarExpl;
            expect(() => invalid5.realname("a_")).toThrow();
        });

        test('should throw on special characters', () => {
            const invalid6 = expl`600` as VarExpl;
            expect(() => invalid6.realname("a-b")).toThrow();
            
            const invalid7 = expl`700` as VarExpl;
            expect(() => invalid7.realname("a b")).toThrow();

            const invalid8 = expl`800` as VarExpl;
            expect(() => invalid8.realname("a.b")).toThrow();
        });

        test('should throw on greek characters in subscript', () => {
            const invalid9 = expl`900` as VarExpl;
            expect(() => invalid9.realname("alpha_α")).toThrow();
        });
    });

    // ============================================================================
    // 5. realname 与 ID 的关系
    // ============================================================================
    describe('Relationship with ID', () => {
        test('realname should be independent of ID', () => {
            const vec5 = expl`(1, 2)` as VarExpl;
            vec5.id("physics.velocity");
            vec5.realname("v_el");
            
            expect(vec5.id()).toBe("physics.velocity");
            expect(vec5.realname()).toBe("v_el");
        });

        test('changing ID should not affect realname', () => {
            const vec5 = expl`(1, 2)` as VarExpl;
            vec5.id("physics.velocity");
            vec5.realname("v_el");
            
            vec5.id("math.speed");
            expect(vec5.id()).toBe("math.speed");
            expect(vec5.realname()).toBe("v_el");
        });

        test('changing realname should not affect ID', () => {
            const vec5 = expl`(1, 2)` as VarExpl;
            vec5.id("math.speed");
            vec5.realname("v_el");

            vec5.realname("v_elocity");
            expect(vec5.id()).toBe("math.speed");
            expect(vec5.realname()).toBe("v_elocity");
        });
    });

    // ============================================================================
    // 6. 函数声明的 realname 测试
    // ============================================================================
    describe('Function Realname', () => {
        test('should support realname for anonymous functions', () => {
            const square = expl`(x) => x^2` as FuncExpl<(x: Substitutable) => any>;
            square.id("math.square");
            square.realname("s_q");
            
            expect(square.id()).toBe("math.square");
            expect(square.realname()).toBe("s_q");
        });

        test('should support realname for named functions', () => {
            const namedFunc = expl`fn(x) = x^2 + 1` as FuncExpl<(x: Substitutable) => any>;
            namedFunc.realname("f");
            expect(namedFunc.realname()).toBe("f");
        });
    });
});
