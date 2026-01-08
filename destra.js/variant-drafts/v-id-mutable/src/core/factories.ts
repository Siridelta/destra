/**
 * 核心工厂函数模块
 *
 * 本模块提供 `expr` 和 `expl` 两个核心工厂函数，用于创建表达式和具名声明。
 * 以及提供 `For`, `With`, `Sum`, `Int`, `Func` 等上下文语句工厂函数。
 */

import { Substitutable, Expr, Expl, Formula, TemplatePayload, PrimitiveValue, CtxExpBody, FuncExpl } from "./formula/base";
import {
    FormulaType,
    createTemplatePayload,
    Expression,
    ExplicitEquation,
    ImplicitEquation,
    Regression,
    VarExpl,
    createCallableFuncExpl,
    CtxVar,
    CtxExpression,
    CtxVarExpl,
    createCallableCtxFuncExpl,
    type FuncExplTFuncBase,
    type CtxFuncExpl,
    type CtxKind,
    type CtxExp,
    isCtxExp,
} from "./formula/base";
import { analyzeType } from "./expr-dsl/analyzeType";
import { analyzeCtxVarBoundsDefinition, analyzeCtxVarDefinitions, type CtxVarDef } from "./expr-dsl/analyzeCtxVar";
import { extractParameters, iterativeCheckBrackets, buildInspectableSource } from "./expr-dsl/utils";
import { anyOf, createRegExp, wordBoundary } from "magic-regexp";
import { idPattern } from "./expr-dsl/syntax/commonRegExpPatterns";
import { getState } from "./state";
import { FormulaASTNode } from "./expr-dsl-new/parse-ast/sematics/formula";

declare module "./state" {
    interface ASTState {
        ast: FormulaASTNode;
    }
}


// ============================================================================
// 基础工厂
// ============================================================================

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

const explFn = (strings: TemplateStringsArray, ...values: Substitutable[]): Expl => {
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
            const funcExpl = createCallableFuncExpl(template, info);
            // 检查函数定义内是否收到外源上下文变量
            checkNoExternalCtxVarPassingToFunc(funcExpl);
            return funcExpl;
    }
};

// ============================================================================
// 上下文语句工厂通用逻辑
// ============================================================================

type ContextObject = Record<string, CtxVar>;

// 通用的上下文对象构建器
const buildContextObj = (ctxVars: CtxVar[]): ContextObject => {
    return Object.fromEntries(ctxVars.map(v => [v.name, v]));
};


// 检查是否包含嵌套的 With 语句
// 只能检查起点为 with CtxExp 对象，终点为 with CtxExp 对象或 DSL 内 with 语句的情况。
const roughWithKeywordCheckRegex = createRegExp(
    wordBoundary,
    anyOf("with", "With"),
    wordBoundary,
);
const idRegex = createRegExp(idPattern);

const checkNoNestedWith = (formula: Formula, isStarterWith = false, visited = new Set<Formula>()) => {
    if (visited.has(formula)) return;
    visited.add(formula);

    // Check if the formula itself is a 'with' CtxExp
    if (isCtxExp(formula) && formula.ctxKind === 'with' && !isStarterWith) {
        throw new TypeError("在同个函数作用域 / 全局作用域内，with 语句不支持嵌套。");
    }

    // Check if the formula is a FuncExpl / CtxFuncExpl / VarExpl
    // If so, we don't need to check for nested with; neither its DSL content.
    if (formula.type === FormulaType.Function || formula.type === FormulaType.Variable) {
        return;
    }

    // Check if the formula's embedded DSL content has 'with' keyword
    formula.template.strings.forEach(str => {
        const strNoIds = str.replace(idRegex, '');
        if (roughWithKeywordCheckRegex.test(strNoIds)) {
            throw new TypeError("该公式内部包含 with 语句或包含语法错误。在同个函数作用域 / 全局作用域内，with 语句不支持嵌套。");
        }
    });

    // Recursive check
    const checkRange = isCtxExp(formula) ? [...formula.deps, formula.body] : formula.deps;
    for (const dep of checkRange) {
        // If meet a CtxExp, skip it since it is already checked
        // And exclude the case of the dep is PrimitiveValue
        if (dep instanceof Formula) {
            checkNoNestedWith(dep, false, visited);
        }
    }
};

// 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
// 方法：递归检查依赖树，在遇到内层 CtxExp 时停止并收集引用；在遇到 CtxVar 时收集引用。收集完毕后检查是否存在 CtxVar 的 sourceCtx 指向已收集的 CtxExp。
const checkNoCtxVarPassingToOuter = (formula: CtxExp) => {
    const seenCtxExps = new Set<CtxExp>();
    const seenCtxVars = new Set<CtxVar>();

    const visited = new Set<Formula>();
    const iterate = (f: Formula) => {
        if (visited.has(f)) return;
        visited.add(f);

        if (isCtxExp(f) && f !== formula) {
            seenCtxExps.add(f);
            return; // Stop recursion for nested CtxExp
        }

        if (f instanceof CtxVar) {
            seenCtxVars.add(f);
            return;
        }

        f.deps.forEach(dep => iterate(dep));
        // Check body for CtxExp
        if (isCtxExp(f) && f.body instanceof Formula) {
            iterate(f.body);
        }
    }
    iterate(formula);
    seenCtxExps.forEach(e => {
        if (e.ctxVars.some(v => seenCtxVars.has(v))) {
            throw new TypeError("检测到上下文变量被传递到上下文语句外。");
        }
    });
}

// 检查 expl 创建的 FuncExpl 或 Func CtxExp 是否收到并非来源于自己的 CtxVar
const checkNoExternalCtxVarPassingToFunc = (formula: FuncExpl<FuncExplTFuncBase> | CtxFuncExpl<FuncExplTFuncBase>) => {
    const seenCtxVars = new Set<CtxVar>();

    const visited = new Set<Formula>();
    const iterate = (f: Formula) => {
        if (visited.has(f)) return;
        visited.add(f);

        if (f.type === FormulaType.Function && f !== formula) {
            return;
        }

        if (f instanceof CtxVar) {
            seenCtxVars.add(f);
            return;
        }

        f.deps.forEach(dep => iterate(dep));
        if (isCtxExp(f) && f.body instanceof Formula) {
            iterate(f.body);
        }
    }
    iterate(formula);

    const internalVars: readonly CtxVar[] = 'ctxVars' in formula ? formula.ctxVars : [];

    seenCtxVars.forEach(v => {
        if (!internalVars.includes(v)) {
            throw new TypeError("检测到外源上下文变量被传递到函数定义内。");
        }
    });
}

// 检查同语句内变量定义重名
const checkNoDuplicateVarDefinitions = (defs: readonly CtxVarDef[]) => {
    const names = defs.map(d => d.name)
    if (new Set(names).size !== names.length) {
        throw new TypeError("在同个上下文语句中，变量名不能重复。");
    }
}

// For/With 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxExpression)
const createGenericCtxExpressionIntermediate = (
    kind: CtxKind,
    strings: TemplateStringsArray,
    values: Substitutable[]
): (callback: (ctx: ContextObject) => CtxExpBody) => CtxExpression => {
    const template = createTemplatePayload(strings, values);
    const defs = analyzeCtxVarDefinitions(template);
    checkNoDuplicateVarDefinitions(defs);

    const ctxVars = defs.map(def => new CtxVar(def.name));
    const ctx = buildContextObj(ctxVars);

    return callback => {
        const body = callback(ctx);
        const result = new CtxExpression(template, ctxVars, body, kind);

        // With 语句嵌套检查
        if (kind === 'with') {
            checkNoNestedWith(result, true);
        }
        // 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
        checkNoCtxVarPassingToOuter(result);

        ctxVars.forEach(v => {
            const state = getState(v);
            state.ctxVar ??= {};
            state.ctxVar.sourceCtx = result;
        });
        return result;
    };
};

// For/With 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxVarExpl)
const createGenericCtxVarExplIntermediate = (
    kind: CtxKind,
    strings: TemplateStringsArray,
    values: Substitutable[]
): (callback: (ctx: ContextObject) => CtxExpBody) => CtxVarExpl => {
    const template = createTemplatePayload(strings, values);
    const defs = analyzeCtxVarDefinitions(template);
    checkNoDuplicateVarDefinitions(defs);

    const ctxVars = defs.map(def => new CtxVar(def.name));
    const ctx = buildContextObj(ctxVars);

    return callback => {
        const body = callback(ctx);
        const result = new CtxVarExpl(template, ctxVars, body, kind);

        // With 语句嵌套检查
        if (kind === 'with') {
            checkNoNestedWith(result, true);
        }
        // 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
        checkNoCtxVarPassingToOuter(result);

        ctxVars.forEach(v => {
            const state = getState(v);
            state.ctxVar ??= {};
            state.ctxVar.sourceCtx = result;
        });
        return result;
    };
};

// Sum/Int 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxExpression)
const createSingleVarCtxExpressionIntermediate = (
    kind: CtxKind,
    strings: TemplateStringsArray,
    values: Substitutable[]
): (callback: (v: CtxVar) => CtxExpBody) => CtxExpression => {
    const template = createTemplatePayload(strings, values);
    const def = analyzeCtxVarBoundsDefinition(template);
    const ctxVar = new CtxVar(def.name);

    return callback => {
        const body = callback(ctxVar);
        const result = new CtxExpression(template, [ctxVar], body, kind);

        // 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
        checkNoCtxVarPassingToOuter(result);

        const state = getState(ctxVar);
        state.ctxVar ??= {};
        state.ctxVar.sourceCtx = result;

        return result;
    }
}

// Sum/Int 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxVarExpl)
const createSingleVarCtxVarExplIntermediate = (
    kind: CtxKind,
    strings: TemplateStringsArray,
    values: Substitutable[]
): (callback: (v: CtxVar) => CtxExpBody) => CtxVarExpl => {
    const template = createTemplatePayload(strings, values);
    const def = analyzeCtxVarBoundsDefinition(template);
    const ctxVar = new CtxVar(def.name);

    return callback => {
        const body = callback(ctxVar);
        const result = new CtxVarExpl(template, [ctxVar], body, kind);

        // 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
        checkNoCtxVarPassingToOuter(result);

        const state = getState(ctxVar);
        state.ctxVar ??= {};
        state.ctxVar.sourceCtx = result;

        return result;
    }
}

// ============================================================================
// 上下文语句工厂导出
// ============================================================================

/**
 * For 列表推导式 上下文语句工厂
 * @example For`i = [1...10]`(({i}) => expr`${i}^2`)
 */
export const For = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createGenericCtxExpressionIntermediate('for', strings, values);

/**
 * With 局部变量绑定式 上下文语句工厂
 * @example With`a = 1`(({a}) => expr`${a} + 1`)
 */
export const With = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createGenericCtxExpressionIntermediate('with', strings, values);

/**
 * Sum 求和 上下文语句工厂
 * @example Sum`n = 1, 10`(n => expr`${n}^2`)
 */
export const Sum = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createSingleVarCtxExpressionIntermediate('sum', strings, values);

/**
 * Int 积分 上下文语句工厂
 * @example Int`x = 0, 1`(x => expr`${x}^2`)
 */
export const Int = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createSingleVarCtxExpressionIntermediate('int', strings, values);

/**
 * Func 函数定义 上下文语句工厂
 * @example Func`x, y`(({x, y}) => expr`${x}^2 + ${y}^2`)
 */
export const Func = (strings: TemplateStringsArray, ...values: Substitutable[]) => {
    const template = createTemplatePayload(strings, values);
    const source = buildInspectableSource(template);
    const params = extractParameters(source);
    const ctxVars = params.map(name => new CtxVar(name));
    const ctx = buildContextObj(ctxVars);

    // 返回一个接收 callback 的函数，该 callback 返回 CtxExpBody，
    // 最终返回 CtxFuncExpl (FuncExpl 的子类，可调用)
    return <TFunc extends FuncExplTFuncBase>(
        callback: (ctx: ContextObject) => CtxExpBody
    ): CtxFuncExpl<TFunc> => {
        const body = callback(ctx);
        const result = createCallableCtxFuncExpl<TFunc>(template, params, ctxVars, body);

        // 检查函数定义内是否收到外源上下文变量
        checkNoExternalCtxVarPassingToFunc(result);
        // 检查本 CtxExp 可视范围内，是否存在内层 CtxExp 的 CtxVar 被传递到外层
        checkNoCtxVarPassingToOuter(result);

        ctxVars.forEach(v => {
            const state = getState(v);
            state.ctxVar ??= {};
            state.ctxVar.sourceCtx = result;
        });
        return result;
    };
}

// ============================================================================
// expl 扩展导出
// ============================================================================

const explFor = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createGenericCtxVarExplIntermediate('for', strings, values);

const explWith = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createGenericCtxVarExplIntermediate('with', strings, values);

const explSum = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createSingleVarCtxVarExplIntermediate('sum', strings, values);

const explInt = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createSingleVarCtxVarExplIntermediate('int', strings, values);

// 导出 expl 工厂，携带完善文档
interface ExplFactory {
    /**
     * expl.For: For 上下文语句工厂，创建为 Expl 变量
     */
    For: (strings: TemplateStringsArray, ...values: Substitutable[]) => (callback: (ctx: ContextObject) => CtxExpBody) => CtxVarExpl;
    /**
     * expl.With: With 上下文语句工厂，创建为 Expl 变量
     */
    With: (strings: TemplateStringsArray, ...values: Substitutable[]) => (callback: (ctx: ContextObject) => CtxExpBody) => CtxVarExpl;
    /**
     * expl.Sum: Sum 上下文语句工厂，创建为 Expl 变量
     */
    Sum: (strings: TemplateStringsArray, ...values: Substitutable[]) => (callback: (v: CtxVar) => CtxExpBody) => CtxVarExpl;
    /**
     * expl.Int: Int 上下文语句工厂，创建为 Expl 变量
     */
    Int: (strings: TemplateStringsArray, ...values: Substitutable[]) => (callback: (v: CtxVar) => CtxExpBody) => CtxVarExpl;
    // 
    (strings: TemplateStringsArray, ...values: Substitutable[]): Expl;
}

// 将扩展挂载到 expl 函数对象上

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
export const expl: ExplFactory = Object.assign(explFn, {
    For: explFor,
    With: explWith,
    Sum: explSum,
    Int: explInt,
});
