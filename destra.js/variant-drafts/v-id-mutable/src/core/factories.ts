/**
 * 核心工厂函数模块
 *
 * 本模块提供 `expr` 和 `expl` 两个核心工厂函数，用于创建表达式和具名声明。
 */

import type { Substitutable, Expr, Expl } from "./formula/base";
import {
    FormulaType,
    createTemplatePayload,
    collectDependencies,
    Expression,
    ExplicitEquation,
    ImplicitEquation,
    Regression,
    VarExpl,
    createCallableFuncExpl,
} from "./formula/base";
import { analyzeType } from "./expr-dsl/analyzeType";

/**
 * expr 工厂函数：创建表达式（纯表达式、方程等）
 *
 * @param strings 模板字符串片段
 * @param values 插值值（原始值或可嵌入的表达式）
 * @returns 表达式对象（Expr）
 *
 * @example
 * ```typescript
 * const e1 = expr`${a}^2 + ${b}^2`;  // 纯表达式
 * const e2 = expr`y = x^2`;      // 显式方程
 * const e3 = expr`x^2 + y^2 = 1`; // 隐式方程
 * ```
 */
export const expr = (strings: TemplateStringsArray, ...values: Substitutable[]): Expr => {
    const template = createTemplatePayload(strings, values);
    const info = analyzeType(template, "expr");

    switch (info.type) {
        case FormulaType.Expression:
            return new Expression(template);
        case FormulaType.ExplicitEquation:
            return new ExplicitEquation(template);
        case FormulaType.ImplicitEquation:
            return new ImplicitEquation(template);
        case FormulaType.Regression:
            return new Regression(template);
    }
};

/**
 * expl 工厂函数：创建具名声明（变量、函数）
 *
 * @param strings 模板字符串片段
 * @param values 插值值（原始值或可嵌入的表达式）
 * @returns 具名声明对象（Expl）
 *
 * @example
 * ```typescript
 * const v1 = expl`a = 3`;              // 变量声明
 * const f1 = expl`(x, y) => x^2 + y^2`; // 函数声明（箭头函数形式）
 * const f2 = expl`f(x) = x^2`;         // 函数声明（具名函数形式）
 * ```
 */
export const expl = (strings: TemplateStringsArray, ...values: Substitutable[]): Expl => {
    const template = createTemplatePayload(strings, values);
    const info = analyzeType(template, "expl");

    switch (info.type) {
        case FormulaType.Variable:
            const varExpl = new VarExpl(template);
            if (info.name) {
                varExpl.id(info.name);
            }
            return varExpl;
        case FormulaType.Function:
            return createCallableFuncExpl(template, info);
    }
};

