/**
 * 样式属性 API 模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Formula 类实现样式相关方法。
 */

import { Formula, Expression, VarExpl, type PrimitiveValue } from "./base";

// ============================================================================
// 类型定义 (来自 样式API结构.md)
// ============================================================================

export enum LineStyle {
    SOLID = "SOLID",
    DASHED = "DASHED",
    DOTTED = "DOTTED",
}

export enum PointStyle {
    POINT = "POINT",
    OPEN = "OPEN",
    CROSS = "CROSS",
    SQUARE = "SQUARE",
    PLUS = "PLUS",
    TRIANGLE = "TRIANGLE",
    DIAMOND = "DIAMOND",
    STAR = "STAR",
}

export enum DragMode {
    AUTO = "AUTO",
    NONE = "NONE",
    X = "X",
    Y = "Y",
    XY = "XY",
}

export enum LabelOrientation {
    DEFAULT = "default",
    CENTER = "center",
    CENTER_AUTO = "center_auto",
    AUTO_CENTER = "auto_center",
    ABOVE = "above",
    ABOVE_LEFT = "above_left",
    ABOVE_RIGHT = "above_right",
    ABOVE_AUTO = "above_auto",
    BELOW = "below",
    BELOW_LEFT = "below_left",
    BELOW_RIGHT = "below_right",
    BELOW_AUTO = "below_auto",
    LEFT = "left",
    AUTO_LEFT = "auto_left",
    RIGHT = "right",
    AUTO_RIGHT = "auto_right",
}

export type NumericPrimitiveValue = number | string;

// 数值型的、可嵌入公式的样式值类型
export type NumericStyleValue = NumericPrimitiveValue | Expression | VarExpl;
// 颜色
export type ColorStyleValue = VarExpl | string;

export interface DestraStyle {
    /**
     * 主可见性开关，对应 Desmos 的 `hidden` 属性。
     */
    hidden?: boolean;

    /**
     * 精细控制表达式各个部分的可见性。
     */
    showParts?: {
        lines?: boolean;
        points?: boolean;
        fill?: boolean;
        label?: boolean;
    };

    /**
     * 颜色。
     */
    color?: ColorStyleValue;

    /**
     * 线条样式
     */
    line?: {
        style?: LineStyle;
        width?: NumericStyleValue;
        opacity?: NumericStyleValue;
    };

    /**
     * 点的样式
     */
    point?: {
        style?: PointStyle;
        size?: NumericStyleValue;
        opacity?: NumericStyleValue;
        dragMode?: DragMode;
    };

    /**
     * 填充样式
     */
    fill?: {
        opacity?: NumericStyleValue;
    };

    /**
     * 标签样式
     */
    label?: {
        text?: string;
        size?: NumericStyleValue;
        orientation?: LabelOrientation;
        angle?: NumericStyleValue;
    };
    
    /**
     * 特定类型表达式的定义域。
     */
    theta?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    phi?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    t?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    u?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    v?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
}

// ============================================================================
// 辅助函数
// ============================================================================

function isPlainObject(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null && obj.constructor === Object;
}

function deepMerge(target: any, source: any) {
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (isPlainObject(sourceValue)) {
            if (!isPlainObject(targetValue)) {
                target[key] = {};
            }
            deepMerge(target[key], sourceValue);
        } else {
            target[key] = sourceValue;
        }
    }
    return target;
}

// ============================================================================
// StyleAccessor 实现
// ============================================================================

/**
 * StyleAccessorClass
 * 
 * 这是一个中间类，用于定义 style 访问器的属性（getters/setters）。
 * 最终的 style 访问器是一个混合对象（函数 + 此类的实例属性）。
 */
class StyleAccessorClass implements DestraStyle {
    // 必须公开 formula 属性，以便混合后的对象能够访问到它
    public formula: Formula;

    constructor(formula: Formula) {
        this.formula = formula;
    }

    // --- 顶层属性代理 ---

    get hidden() { return this.formula._styleState.hidden; }
    set hidden(v) { this.formula._styleState.hidden = v; }

    get color() { return this.formula._styleState.color; }
    set color(v) { this.formula._styleState.color = v; }

    // --- 嵌套对象代理 ---
    // 对于嵌套对象，我们返回内部状态对象的引用。
    // 因为我们是 Mutable 的，用户直接修改返回的对象是允许的。
    // 如果内部对象不存在，我们需要初始化它。

    get showParts() {
        if (!this.formula._styleState.showParts) this.formula._styleState.showParts = {};
        return this.formula._styleState.showParts;
    }
    set showParts(v) { this.formula._styleState.showParts = v; }

    get line() {
        if (!this.formula._styleState.line) this.formula._styleState.line = {};
        return this.formula._styleState.line;
    }
    set line(v) { this.formula._styleState.line = v; }

    get point() {
        if (!this.formula._styleState.point) this.formula._styleState.point = {};
        return this.formula._styleState.point;
    }
    set point(v) { this.formula._styleState.point = v; }

    get fill() {
        if (!this.formula._styleState.fill) this.formula._styleState.fill = {};
        return this.formula._styleState.fill;
    }
    set fill(v) { this.formula._styleState.fill = v; }

    get label() {
        if (!this.formula._styleState.label) this.formula._styleState.label = {};
        return this.formula._styleState.label;
    }
    set label(v) { this.formula._styleState.label = v; }

    // --- 定义域 ---

    get theta() {
        if (!this.formula._styleState.theta) this.formula._styleState.theta = { min: 0, max: "2pi" }; // 默认值? 暂时不设默认值，由 Desmos 决定
        // 修正：这里不应该设默认值，除非我们确定。
        // 如果是 undefined，我们初始化为空对象？
        // DestraStyle 定义里 theta 是 { min, max }，必选属性。
        // 但在初始化时可能为空。我们需要断言或者允许部分初始化。
        // 实际上 JS 允许部分初始化。
        if (!this.formula._styleState.theta) this.formula._styleState.theta = {} as any;
        return this.formula._styleState.theta!;
    }
    set theta(v) { this.formula._styleState.theta = v; }

    get phi() {
        if (!this.formula._styleState.phi) this.formula._styleState.phi = {} as any;
        return this.formula._styleState.phi!;
    }
    set phi(v) { this.formula._styleState.phi = v; }

    get t() {
        if (!this.formula._styleState.t) this.formula._styleState.t = {} as any;
        return this.formula._styleState.t!;
    }
    set t(v) { this.formula._styleState.t = v; }

    get u() {
        if (!this.formula._styleState.u) this.formula._styleState.u = {} as any;
        return this.formula._styleState.u!;
    }
    set u(v) { this.formula._styleState.u = v; }

    get v() {
        if (!this.formula._styleState.v) this.formula._styleState.v = {} as any;
        return this.formula._styleState.v!;
    }
    set v(v) { this.formula._styleState.v = v; }
}

// 定义混合类型
export type StyleAccessor = StyleAccessorClass & ((styles: DestraStyle) => Formula);

// ============================================================================
// 模块扩展 (Module Augmentation)
// ============================================================================

declare module "./base" {
    interface Formula {
        /**
         * 样式访问器。
         * 既可以作为函数调用以批量设置样式，也可以作为对象访问单个样式属性。
         * 
         * @example
         * ```ts
         * // 批量设置
         * expr.style({ color: 'red', line: { width: 2 } });
         * 
         * // 单个设置
         * expr.style.color = 'blue';
         * expr.style.line.width = 3;
         * ```
         */
        readonly style: StyleAccessor;

        /**
         * 内部样式状态存储
         */
        _styleState: DestraStyle;
        
        /**
         * 内部缓存的 style accessor 实例
         */
        _styleAccessor?: StyleAccessor;
    }
}

// ============================================================================
// 原型注入
// ============================================================================

Object.defineProperty(Formula.prototype, "style", {
    get(this: Formula) {
        // 懒初始化 _styleState
        if (!this._styleState) {
            this._styleState = {};
        }

        // 懒初始化 _styleAccessor 并缓存
        if (!this._styleAccessor) {
            const instance = new StyleAccessorClass(this);
            
            // 创建可调用函数
            const accessorFunc = function(this: StyleAccessorClass, styles: DestraStyle) {
                deepMerge(instance.formula._styleState, styles);
                return instance.formula;
            };

            // 混合：将实例属性复制到函数上
            Object.assign(accessorFunc, instance);
            // 混合：设置原型以继承 getter/setter
            Object.setPrototypeOf(accessorFunc, StyleAccessorClass.prototype);

            this._styleAccessor = accessorFunc as StyleAccessor;
        }
        return this._styleAccessor;
    },
    configurable: true
});
