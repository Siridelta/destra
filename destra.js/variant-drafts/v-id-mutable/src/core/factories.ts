/**
 * 核心工厂函数模块
 *
 * 本模块提供 `expr` 和 `expl` 两个核心工厂函数，用于创建表达式和具名声明。
 * 以及提供 `For`, `With`, `Sum`, `Int`, `Func` 等上下文语句工厂函数。
 */

import { Substitutable, Expr, Expl, Formula, CtxExpBody, FuncExpl } from "./formula/base";
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
    type CtxExp,
    isCtxExp,
} from "./formula/base";
import { getState } from "./state";
import { FormulaASTNode } from "./expr-dsl/parse-ast/sematics/visitor-parts/formula";
import { parseCtxFactoryExprDefHead, parseCtxFactoryNullDefHead, parseCtxFactoryRangeDefHead, parseFormula } from "./expr-dsl/parse-ast";
import { analyzeTypeAndCheck } from "./expr-dsl/analyzeFormulaType";
import { CtxFactoryHeadASTNode } from "./expr-dsl/parse-ast/sematics/visitor-parts/ctx-header";

import { evalAndSetCtxValidityState } from "./formula/validity";

declare module "./state" {
    interface ASTState {
        root: FormulaASTNode | CtxFactoryHeadASTNode;
    }
}

export function setASTState(formula: Formula, ast: FormulaASTNode | CtxFactoryHeadASTNode) {
    const s = getState(formula);
    if (s.ast) s.ast.root = ast;
    else s.ast = { root: ast };
}

export function setSourceCtx(ctxVar: CtxVar, sourceCtx: CtxExp) {
    const s = getState(ctxVar);
    s.ctxVar ??= {};
    s.ctxVar.sourceCtx = sourceCtx;
}

// ============================================================================
// 基础工厂
// ============================================================================

interface ExprFactory {
    (strings: TemplateStringsArray, ...values: Substitutable[]): Expr;
    type: 'expr'  // okay tbh this is only to make expr highlighted the same color as expl (being considered as a object rather than a pure function)
}

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
export const expr: ExprFactory = Object.assign((strings: TemplateStringsArray, ...values: Substitutable[]): Expr => {
    const template = createTemplatePayload(strings, values);
    const ast = parseFormula(template);
    const info = analyzeTypeAndCheck(ast, "expr");

    let result: Expr;
    switch (info.type) {
        case FormulaType.Expression:
            result = new Expression(template);
            break;
        case FormulaType.ExplicitEquation:
            result = new ExplicitEquation(template);
            break;
        case FormulaType.ImplicitEquation:
            result = new ImplicitEquation(template);
            break;
        case FormulaType.Regression:
            result = new Regression(template);
            break;
    }
    setASTState(result, ast);
    evalAndSetCtxValidityState(result);
    return result;
}, {
    type: 'expr' as const
});

let explFn = (strings: TemplateStringsArray, ...values: Substitutable[]): Expl => {
    const template = createTemplatePayload(strings, values);
    const ast = parseFormula(template);
    const info = analyzeTypeAndCheck(ast, "expl");

    let result: Expl;
    switch (info.type) {
        case FormulaType.Variable:
            const varExpl = new VarExpl(template);
            if (info.name) {
                varExpl.id(info.name);
            }
            result = varExpl;
            break;
        case FormulaType.Function:
            const funcExpl = createCallableFuncExpl(template, info);
            result = funcExpl;
            break;
    }
    setASTState(result, ast);
    evalAndSetCtxValidityState(result);
    return result;
};

// ============================================================================
// 上下文语句工厂通用逻辑
// ============================================================================

type ContextObject = Record<string, CtxVar>;

// 通用的上下文对象构建器
const buildContextObj = (ctxVars: CtxVar[]): ContextObject => {
    return Object.fromEntries(ctxVars.map(v => [v.name, v]));
};

// 检查同语句内变量定义重名
const checkNoDuplicateVarDefinitions = (names: readonly string[]) => {
    if (new Set(names).size !== names.length) {
        throw new TypeError("在同个上下文语句中，变量名不能重复。");
    }
}

const getCtxVarNames = (ast: CtxFactoryHeadASTNode): string[] => {
    switch (ast.subtype) {
        case 'expr':
            return ast.ctxVarDefs.map(d => d.name);
        case 'range':
            return [ast.ctxVarDef.name];
        case 'null':
            return ast.ctxVarDefs.map(d => d.name);
    }
}

type CtxKindNotFunc = 'with' | 'for' | 'sum' | 'int' | 'prod' | 'diff';
type IntermediateType<K extends CtxKindNotFunc, R extends CtxExp> =
    K extends 'with' | 'for' ?
    (callback: (ctx: ContextObject) => CtxExpBody) => R :
    K extends 'sum' | 'int' | 'prod' | 'diff' ?
    (callback: (v: CtxVar) => CtxExpBody) => R :
    never;

// For/With 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxExpression)
const createCtxExpressionIntermediate = <K extends CtxKindNotFunc>(
    kind: K,
    strings: TemplateStringsArray,
    values: Substitutable[]
): IntermediateType<K, CtxExpression> => {
    const template = createTemplatePayload(strings, values);
    const ast =
        kind === 'for' || kind === 'with' ?
            parseCtxFactoryExprDefHead(template) :
            kind === 'sum' || kind === 'int' || kind === 'prod' ?
                parseCtxFactoryRangeDefHead(template) :
                parseCtxFactoryNullDefHead(template);

    const ctxVarNames = getCtxVarNames(ast);
    checkNoDuplicateVarDefinitions(ctxVarNames);

    const ctxVars = ctxVarNames.map(name => {
        const v = new CtxVar(name);
        // Initialize validity for CtxVar
        evalAndSetCtxValidityState(v);
        return v;
    });
    const ctxObj = buildContextObj(ctxVars);

    const mkResult = (body: CtxExpBody) => {
        const result = new CtxExpression(template, ctxVars, body, kind);
        setASTState(result, ast);
        ctxVars.forEach(v => setSourceCtx(v, result));
        evalAndSetCtxValidityState(result);
        return result;
    }

    return (
        kind === 'with' || kind === 'for' ?
            (callback: (ctx: ContextObject) => CtxExpBody) => mkResult(callback(ctxObj)) :
            (callback: (v: CtxVar) => CtxExpBody) => mkResult(callback(ctxVars[0]))
    ) as IntermediateType<K, CtxExpression>;
};

// For/With 上下文语句创建逻辑 (中间体，接收回调被调用之后返回 CtxVarExpl)
const createCtxVarExplIntermediate = <K extends CtxKindNotFunc>(
    kind: K,
    strings: TemplateStringsArray,
    values: Substitutable[]
): IntermediateType<K, CtxVarExpl> => {
    const template = createTemplatePayload(strings, values);
    const ast =
        kind === 'for' || kind === 'with' ?
            parseCtxFactoryExprDefHead(template) :
            kind === 'sum' || kind === 'int' || kind === 'prod' ?
                parseCtxFactoryRangeDefHead(template) :
                parseCtxFactoryNullDefHead(template);

    const ctxVarNames = getCtxVarNames(ast);
    checkNoDuplicateVarDefinitions(ctxVarNames);

    const ctxVars = ctxVarNames.map(name => {
        const v = new CtxVar(name);
        evalAndSetCtxValidityState(v);
        return v;
    });
    const ctxObj = buildContextObj(ctxVars);

    const mkResult = (body: CtxExpBody) => {
        const result = new CtxVarExpl(template, ctxVars, body, kind);
        setASTState(result, ast);
        ctxVars.forEach(v => setSourceCtx(v, result));
        evalAndSetCtxValidityState(result);
        return result;
    }

    return (
        kind === 'with' || kind === 'for' ?
            (callback: (ctx: ContextObject) => CtxExpBody) => mkResult(callback(ctxObj)) :
            (callback: (v: CtxVar) => CtxExpBody) => mkResult(callback(ctxVars[0]))
    ) as IntermediateType<K, CtxVarExpl>;
};

// ============================================================================
// 上下文语句工厂导出
// ============================================================================

/**
 * For 列表推导式 上下文语句工厂
 * @example For`i = [1...10]`(({i}) => expr`${i}^2`)
 */
export const For = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('for', strings, values);

/**
 * With 局部变量绑定式 上下文语句工厂
 * @example With`a = 1`(({a}) => expr`${a} + 1`)
 */
export const With = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('with', strings, values);

/**
 * Sum 求和 上下文语句工厂
 * @example Sum`n = 1, 10`(n => expr`${n}^2`)
 */
export const Sum = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('sum', strings, values);

/**
 * Prod 求积 上下文语句工厂
 * @example Prod`n = 1, 10`(n => expr`${n}^2`)
 */
export const Prod = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('prod', strings, values);

/**
 * Int 积分 上下文语句工厂
 * @example Int`x = 0, 1`(x => expr`${x}^2`)
 */
export const Int = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('int', strings, values);

/**
 * Diff 微分 上下文语句工厂
 * @example Diff`x`(x => expr`${x}^2`)
 */
export const Diff = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxExpressionIntermediate('diff', strings, values);

/**
 * Func 函数定义 上下文语句工厂
 * @example Func`x, y`(({x, y}) => expr`${x}^2 + ${y}^2`)
 */
export const Func = (strings: TemplateStringsArray, ...values: Substitutable[]) => {
    const template = createTemplatePayload(strings, values);
    const ast = parseCtxFactoryNullDefHead(template);
    const params = getCtxVarNames(ast);
    const ctxVars = params.map(name => {
        const v = new CtxVar(name);
        evalAndSetCtxValidityState(v);
        return v;
    });
    const ctxObj = buildContextObj(ctxVars);

    // 返回一个接收 callback 的函数，该 callback 返回 CtxExpBody，
    // 最终返回 CtxFuncExpl (FuncExpl 的子类，可调用)
    return <TFunc extends FuncExplTFuncBase>(
        callback: (ctx: ContextObject) => CtxExpBody
    ): CtxFuncExpl<TFunc> => {
        const body = callback(ctxObj);
        const result = createCallableCtxFuncExpl<TFunc>(template, params, ctxVars, body);
        setASTState(result, ast);
        ctxVars.forEach(v => setSourceCtx(v, result));
        evalAndSetCtxValidityState(result);
        return result;
    };
}

// ============================================================================
// expl 扩展导出
// ============================================================================

const explFor = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('for', strings, values);

const explWith = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('with', strings, values);

const explSum = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('sum', strings, values);

const explProd = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('prod', strings, values);

const explInt = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('int', strings, values);

const explDiff = (strings: TemplateStringsArray, ...values: Substitutable[]) =>
    createCtxVarExplIntermediate('diff', strings, values);

// 导出 expl 工厂，携带完善文档
interface ExplFactory {
    /**
     * expl.For: For 上下文语句工厂，创建为 Expl 变量
     */
    For: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'for', CtxVarExpl>;
    /**
     * expl.With: With 上下文语句工厂，创建为 Expl 变量
     */
    With: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'with', CtxVarExpl>;
    /**
     * expl.Sum: Sum 上下文语句工厂，创建为 Expl 变量
     */
    Sum: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'sum', CtxVarExpl>;
    /**
     * expl.Prod: Prod 上下文语句工厂，创建为 Expl 变量
     */
    Prod: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'prod', CtxVarExpl>;
    /**
     * expl.Int: Int 上下文语句工厂，创建为 Expl 变量
     */
    Int: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'int', CtxVarExpl>;
    /**
     * expl.Diff: Diff 上下文语句工厂，创建为 Expl 变量
     */
    Diff: (strings: TemplateStringsArray, ...values: Substitutable[]) => IntermediateType<'diff', CtxVarExpl>;

    (strings: TemplateStringsArray, ...values: Substitutable[]): Expl;

    type: 'expl'
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
    Prod: explProd,
    Int: explInt,
    Diff: explDiff,
    type: 'expl' as const
});
