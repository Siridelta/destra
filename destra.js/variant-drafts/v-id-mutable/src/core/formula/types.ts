import { CtxVar, Expression, FuncExplClass, FuncExplTFuncBase, Image, RegrParam, VarExpl } from "./base";
import { NumericStyleValue, PointStyleValue } from "./style"
import { Dt, Formula } from "./base";


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



export interface ImageOptions {
    /**
     * 图片中心点坐标 (必须是 Point 类型的 Expression，如 expr`(0,0)`)
     */
    center?: PointStyleValue;

    /**
     * 图片宽度 (单位：坐标轴单位)
     * 默认值: 10
     */
    width?: NumericStyleValue;

    /**
     * 图片高度 (单位：坐标轴单位)
     * 默认值: 10
     */
    height?: NumericStyleValue;

    /**
     * 旋转角度 (弧度)
     * 默认值: 0
     */
    angle?: NumericStyleValue;

    /**
     * 不透明度 (0-1)
     * 默认值: 1
     */
    opacity?: NumericStyleValue;

    /**
     * Desmos 界面中显示的名称
     */
    name?: string;

    /**
     * 是否允许拖拽
     * 默认值: true
     */
    draggable?: boolean;

    /**
     * 点击时触发的动作 (Action)
     */
    onClick?: ActionStyleValue;

    /**
     * 鼠标悬停时显示的图片 URL
     */
    hoverImage?: string;

    /**
     * 鼠标按下时显示的图片 URL
     */
    depressedImage?: string;
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

export type NoAst = CtxVar | RegrParam | Dt | Image;

export const isNoAst = (formula: Formula): formula is NoAst => {
    return formula instanceof CtxVar || formula instanceof RegrParam || formula instanceof Dt || formula instanceof Image;
}