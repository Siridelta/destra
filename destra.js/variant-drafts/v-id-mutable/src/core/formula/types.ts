
import { CtxVar, Expression, FuncExplClass, FuncExplTFuncBase, RegrParam, VarExpl } from "./base";


// ============================================================================
// 类型定义
// ============================================================================

/**
 * 原始值类型：字符串、数字、布尔值、null、undefined
 */
export type PrimitiveValue =
    // | string
    | number
//    | boolean
//    | null
//    | undefined;

/**
 * 模板字符串载荷，包含字符串片段和插值值
 */
export interface TemplatePayload {
    readonly strings: readonly string[];
    readonly values: readonly Substitutable[];
}

/**
 * 公式类型枚举
 */
export enum FormulaType {
    Expression = "expression",
    Variable = "variable",
    ContextVariable = "context-variable",
    Function = "function",
    ExplicitEquation = "explicit-equation",
    ImplicitEquation = "implicit-equation",
    Regression = "regression",
    RegressionParameter = "regression-parameter",
    Dt = "dt",
    Image = "image",
}

// ============================================================================
// 并集类型
// ============================================================================

/**
 * Embeddable：可嵌入的表达式类型（可用于其他表达式中）
 */
export type Embeddable = Expression | VarExpl | FuncExplClass<FuncExplTFuncBase> | CtxVar | RegrParam;

/**
 * Substitutable：可代入模板字符串插值的值类型（原始值或可嵌入的表达式）
 */
export type Substitutable = Embeddable | PrimitiveValue;