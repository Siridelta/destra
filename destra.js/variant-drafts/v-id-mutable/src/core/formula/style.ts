/**
 * 样式属性 API 模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Formula 类实现样式相关方法。
 * 
 * 这些方法支持：
 * - `.style(editor)`: 核心修改入口，接受 Editor 回调或对象进行样式修改
 * - `.style`: 只读访问器，返回当前样式数据的只读视图
 * - `.point()`, `.label()`, `.line()`, `.fill()`: 便利快捷方式
 */

import { Expression, VarExpl, type Formula } from "./base";

// ============================================================================
// 类型定义和枚举
// ============================================================================

/**
 * 数值型原始值（用于样式属性）
 */
export type NumericPrimitiveValue = number | string;

/**
 * 数值型的、可嵌入公式的样式值类型
 */
export type NumericStyleValue = NumericPrimitiveValue | Expression | VarExpl;

/**
 * 颜色样式值类型
 */
export type ColorStyleValue = VarExpl | string;

/**
 * 线条样式枚举，对应 Desmos.Styles
 */
export enum LineStyle {
    SOLID = "SOLID",
    DASHED = "DASHED",
    DOTTED = "DOTTED",
}

/**
 * 点样式枚举，对应 Desmos.Styles
 */
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

/**
 * 拖动模式枚举，对应 Desmos.DragModes
 */
export enum DragMode {
    AUTO = "AUTO",
    NONE = "NONE",
    X = "X",
    Y = "Y",
    XY = "XY",
}

/**
 * 标签朝向枚举，对应 Desmos.LabelOrientations
 */
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

/**
 * Destra 样式数据结构
 * 这是比 Desmos ExpressionState 更直观、更有组织性的样式模型
 */
export interface DestraStyle {
    /**
     * 主可见性开关，对应 Desmos 的 `hidden` 属性。
     * 如果为 `true`，则表达式完全隐藏，但会保留各组件的可见性设置（记忆状态）。
     * 如果为 `false` 或 `undefined`，则表达式的可见性由 `showParts` 属性决定。
     */
    hidden?: boolean;

    /**
     * 精细控制表达式各个部分的可见性。
     * 仅在 `hidden` 不为 `true` 时生效。
     */
    showParts?: {
        /** 控制线条部分的可见性。对应 Desmos 的 `lines` 属性。 */
        lines?: boolean;
        /** 控制点部分的可见性。对应 Desmos 的 `points` 属性。 */
        points?: boolean;
        /** 控制填充部分的可见性。对应 Desmos 的 `fill` 属性。 */
        fill?: boolean;
        /** 控制标签的可见性。对应 Desmos 的 `showLabel` 属性。 */
        label?: boolean;
    };

    /**
     * 颜色。
     * 适用于线条、点、填充和标签。
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
        /**
         * 标签的放置位置。
         */
        orientation?: LabelOrientation;
        /**
         * 标签的旋转角度。
         */
        angle?: NumericStyleValue;
    };

    /**
     * 特定类型表达式的定义域。
     * 它们严格来说不是"样式"，但与表达式的视觉呈现范围密切相关。
     */
    // 对应 Desmos 的 `polarDomain` 属性
    theta?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    // 对应 Desmos 的 `paramtricDomain3Dphi` 属性
    phi?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    // 对应 Desmos 的 `parametricDomain` 属性
    t?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    // 对应 Desmos 的 `paramtricDomain3Du` 属性
    u?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
    // 对应 Desmos 的 `paramtricDomain3Dv` 属性
    v?: {
        min: NumericStyleValue;
        max: NumericStyleValue;
    };
}

// ============================================================================
// 深层合并工具函数
// ============================================================================

/**
 * 深层合并两个对象
 * 
 * @param target - 目标对象（会被修改）
 * @param source - 源对象（提供新值）
 * @returns 合并后的目标对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            // 如果源值为 undefined，跳过（不覆盖）
            if (sourceValue === undefined) {
                continue;
            }

            // 如果源值和目标值都是对象且都不是数组，进行深层合并
            if (
                sourceValue !== null &&
                typeof sourceValue === "object" &&
                !Array.isArray(sourceValue) &&
                targetValue !== null &&
                typeof targetValue === "object" &&
                !Array.isArray(targetValue)
            ) {
                deepMerge(targetValue, sourceValue);
            } else {
                // 否则直接赋值
                target[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }
    return target;
}

/**
 * 创建样式对象的深拷贝
 */
function cloneStyle(style: DestraStyle | undefined): DestraStyle {
    if (!style) {
        return {};
    }
    return JSON.parse(JSON.stringify(style)) as DestraStyle;
}

// ============================================================================
// Editor 模式实现
// ============================================================================

/**
 * StyleEditor 是进行样式修改的核心交互句柄
 * 
 * 它是一个混合类型对象：
 * - 可以作为对象访问子属性（如 `editor.point.size`）
 * - 可以作为函数调用（如 `editor({ ... })` 或 `editor(e => { ... })`）
 * - 子属性本身也是 Editor，支持链式调用
 * - 支持赋值（`editor.field = value`）和删除（`delete editor.field`）
 */
class StyleEditor {
    private _style: DestraStyle;
    private _parent: Formula | StyleEditor | null;
    private _path: string[];

    constructor(
        style: DestraStyle,
        parent: Formula | StyleEditor | null = null,
        path: string[] = [],
    ) {
        this._style = style;
        this._parent = parent;
        this._path = path;
    }

    /**
     * 确保路径存在，返回路径对应的对象
     */
    private ensurePath(): any {
        let current: any = this._style;
        for (const key of this._path) {
            if (!(key in current) || typeof current[key] !== "object" || current[key] === null || Array.isArray(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        return current;
    }

    /**
     * 获取路径对应的值
     */
    private getValue(): any {
        let current: any = this._style;
        for (const key of this._path) {
            if (!(key in current)) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }

    /**
     * 设置路径对应的值
     */
    private setValue(value: any): void {
        if (this._path.length === 0) {
            // 根路径，直接合并
            if (value && typeof value === "object" && !Array.isArray(value)) {
                deepMerge(this._style, value);
            } else {
                throw new TypeError("根路径只能设置为对象");
            }
            return;
        }

        let current: any = this._style;
        for (let i = 0; i < this._path.length - 1; i++) {
            const key = this._path[i]!;
            if (!(key in current) || typeof current[key] !== "object" || current[key] === null || Array.isArray(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        const lastKey = this._path[this._path.length - 1]!;
        current[lastKey] = value;
    }

    /**
     * 删除路径对应的值
     */
    private deleteValue(): void {
        if (this._path.length === 0) {
            // 根路径，清空所有属性
            Object.keys(this._style).forEach(key => delete (this._style as any)[key]);
            return;
        }

        let current: any = this._style;
        for (let i = 0; i < this._path.length - 1; i++) {
            const key = this._path[i]!;
            if (!(key in current)) {
                return; // 路径不存在，无需删除
            }
            current = current[key];
        }
        const lastKey = this._path[this._path.length - 1]!;
        delete current[lastKey];
    }

    /**
     * 创建子 Editor
     */
    private createSubEditor(key: string): StyleEditor {
        return new StyleEditor(this._style, this._parent, [...this._path, key]);
    }

    /**
     * 导出为 JSON（支持 JSON.stringify）
     */
    public toJSON(): DestraStyle {
        return cloneStyle(this._style);
    }

    /**
     * 设置值（set/rewrite 语义）
     */
    public set(value: any): StyleEditor {
        this.setValue(value);
        return this;
    }

    /**
     * 删除值（delete 语义）
     */
    public delete(): StyleEditor {
        this.deleteValue();
        return this;
    }
}

/**
 * 创建 StyleEditor 的 Proxy，实现混合类型行为
 */
function createStyleEditorProxy(editor: StyleEditor): StyleEditor {
    return new Proxy(editor, {
        // 属性访问：返回子 Editor 或值
        get(target, prop) {
            if (prop === "toJSON") {
                return target.toJSON.bind(target);
            }
            if (prop === "set") {
                return target.set.bind(target);
            }
            if (prop === "delete") {
                return target.delete.bind(target);
            }
            if (prop === Symbol.toPrimitive) {
                return () => (target as any).getValue();
            }

            // 创建子 Editor
            const subEditor = (target as any).createSubEditor(prop as string);
            return createStyleEditorProxy(subEditor);
        },

        // 属性赋值
        set(target, prop, value) {
            if (prop === Symbol.toPrimitive) {
                return false;
            }
            const subEditor = (target as any).createSubEditor(prop as string);
            subEditor.setValue(value);
            return true;
        },

        // 属性删除
        deleteProperty(target, prop) {
            const subEditor = (target as any).createSubEditor(prop as string);
            subEditor.deleteValue();
            return true;
        },

        // 函数调用：支持两种签名
        apply(target, thisArg, args) {
            const arg = args[0];
            if (typeof arg === "function") {
                // 回调形式：editor(e => { ... })
                arg(target);
                return target._parent || target;
            } else if (arg && typeof arg === "object") {
                // 对象合并形式：editor({ ... })
                if (target._path.length === 0) {
                    // 根路径，直接合并
                    deepMerge(target._style, arg);
                } else {
                    // 子路径，需要合并到当前路径
                    const currentValue = (target as any).getValue() || {};
                    deepMerge(currentValue, arg);
                    (target as any).setValue(currentValue);
                }
                return target._parent || target;
            } else {
                // 快捷设置：editor(value) - 直接设置当前路径的值
                (target as any).setValue(arg);
                return target._parent || target;
            }
        },
    }) as StyleEditor;
}

/**
 * StyleEditor 类型定义（可调用）
 */
export type StyleEditorCallable = StyleEditor & {
    (updates: Partial<DestraStyle>): StyleEditor;
    (callback: (editor: StyleEditor) => void): StyleEditor;
    <T extends keyof DestraStyle>(value: DestraStyle[T]): StyleEditor;
};

// ============================================================================
// 声明合并：扩展 Formula 接口类型定义
// ============================================================================

declare module "./base" {
    interface Formula {
        /**
         * 样式访问器：既可以作为方法调用（编辑），也可以作为属性访问（读取）
         * 
         * 作为方法调用时：
         * - `formula.style(editor => { ... })` - 回调形式
         * - `formula.style({ ... })` - 对象合并形式
         * 
         * 作为属性访问时：
         * - `formula.style` - 返回只读样式数据（通过 `.data` 属性）
         * 
         * @example
         * ```typescript
         * // 回调形式编辑
         * myPoint.style(s => {
         *     s.point.size = 12;
         *     s.label.text = "Origin";
         *     s.color = "rgb(255, 0, 0)";
         * });
         * 
         * // 对象合并形式编辑
         * myPoint.style({
         *     color: "blue",
         *     label: { text: "My Point" }
         * });
         * 
         * // 读取样式（通过 .data 属性）
         * const currentStyle = myPoint.style.data;
         * ```
         */
        style: {
            (editorOrUpdates: (editor: StyleEditor) => void): this;
            (updates: Partial<DestraStyle>): this;
            readonly data: Readonly<DestraStyle>;
        };

        /**
         * 便利快捷方式：点样式编辑
         * 
         * @example
         * ```typescript
         * myPoint.point(p => {
         *     p.size = 12;
         *     p.opacity = 0.8;
         * });
         * 
         * myPoint.point({ size: 12, opacity: 0.8 });
         * ```
         */
        point(editorOrUpdates: (editor: StyleEditor) => void): this;
        point(updates: Partial<DestraStyle["point"]>): this;

        /**
         * 便利快捷方式：标签样式编辑
         */
        label(editorOrUpdates: (editor: StyleEditor) => void): this;
        label(updates: Partial<DestraStyle["label"]>): this;

        /**
         * 便利快捷方式：线条样式编辑
         */
        line(editorOrUpdates: (editor: StyleEditor) => void): this;
        line(updates: Partial<DestraStyle["line"]>): this;

        /**
         * 便利快捷方式：填充样式编辑
         */
        fill(editorOrUpdates: (editor: StyleEditor) => void): this;
        fill(updates: Partial<DestraStyle["fill"]>): this;
    }
}

// ============================================================================
// 原型注入：提供运行时实现
// ============================================================================

/**
 * 存储样式数据的内部属性键
 */
const STYLE_DATA_KEY = Symbol("_destraStyle");

/**
 * 获取或初始化样式数据
 */
function getStyleData(formula: Formula): DestraStyle {
    const data = (formula as any)[STYLE_DATA_KEY];
    if (!data) {
        const newData: DestraStyle = {};
        (formula as any)[STYLE_DATA_KEY] = newData;
        return newData;
    }
    return data;
}

/**
 * 创建一个可调用的 style 对象
 * 它既可以是函数（用于编辑），也可以是属性（用于读取）
 */
function createStyleAccessor(formula: Formula): any {
    const styleFunction = function(
        this: Formula,
        editorOrUpdates: ((editor: StyleEditor) => void) | Partial<DestraStyle>,
    ): Formula {
        const styleData = getStyleData(this);
        const editor = createStyleEditorProxy(new StyleEditor(styleData, this));

        if (typeof editorOrUpdates === "function") {
            editorOrUpdates(editor);
        } else {
            deepMerge(styleData, editorOrUpdates);
        }

        return this;
    };

    // 添加只读数据属性
    Object.defineProperty(styleFunction, "data", {
        get(): Readonly<DestraStyle> {
            const styleData = getStyleData(formula);
            return Object.freeze(cloneStyle(styleData));
        },
        enumerable: true,
        configurable: true,
    });

    // 使 styleFunction 本身也可以作为属性访问器
    // 通过 Proxy 实现：当作为属性访问时返回 data，当作为函数调用时执行编辑逻辑
    return new Proxy(styleFunction, {
        get(target, prop) {
            if (prop === "data") {
                const styleData = getStyleData(formula);
                return Object.freeze(cloneStyle(styleData));
            }
            // 其他属性访问返回 undefined（或者可以返回 styleFunction 本身）
            return (target as any)[prop];
        },
        apply(target, thisArg, args) {
            // 函数调用：执行编辑逻辑
            return target.apply(thisArg, args);
        },
    });
}

/**
 * 实现 .style 属性（既是方法也是只读访问器）
 */
Object.defineProperty(Formula.prototype, "style", {
    get(this: Formula) {
        return createStyleAccessor(this);
    },
    configurable: true,
    enumerable: false,
});

/**
 * 实现便利快捷方式：.point()
 */
function _Formula_point(
    this: Formula,
    editorOrUpdates: ((editor: StyleEditor) => void) | Partial<DestraStyle["point"]>,
): Formula {
    const styleData = getStyleData(this);
    if (!styleData.point) {
        styleData.point = {};
    }
    const pointEditor = createStyleEditorProxy(new StyleEditor(styleData, this, ["point"]));

    if (typeof editorOrUpdates === "function") {
        editorOrUpdates(pointEditor);
    } else {
        deepMerge(styleData.point, editorOrUpdates);
    }

    return this;
}

Formula.prototype.point = _Formula_point;

/**
 * 实现便利快捷方式：.label()
 */
function _Formula_label(
    this: Formula,
    editorOrUpdates: ((editor: StyleEditor) => void) | Partial<DestraStyle["label"]>,
): Formula {
    const styleData = getStyleData(this);
    if (!styleData.label) {
        styleData.label = {};
    }
    const labelEditor = createStyleEditorProxy(new StyleEditor(styleData, this, ["label"]));

    if (typeof editorOrUpdates === "function") {
        editorOrUpdates(labelEditor);
    } else {
        deepMerge(styleData.label, editorOrUpdates);
    }

    return this;
}

Formula.prototype.label = _Formula_label;

/**
 * 实现便利快捷方式：.line()
 */
function _Formula_line(
    this: Formula,
    editorOrUpdates: ((editor: StyleEditor) => void) | Partial<DestraStyle["line"]>,
): Formula {
    const styleData = getStyleData(this);
    if (!styleData.line) {
        styleData.line = {};
    }
    const lineEditor = createStyleEditorProxy(new StyleEditor(styleData, this, ["line"]));

    if (typeof editorOrUpdates === "function") {
        editorOrUpdates(lineEditor);
    } else {
        deepMerge(styleData.line, editorOrUpdates);
    }

    return this;
}

Formula.prototype.line = _Formula_line;

/**
 * 实现便利快捷方式：.fill()
 */
function _Formula_fill(
    this: Formula,
    editorOrUpdates: ((editor: StyleEditor) => void) | Partial<DestraStyle["fill"]>,
): Formula {
    const styleData = getStyleData(this);
    if (!styleData.fill) {
        styleData.fill = {};
    }
    const fillEditor = createStyleEditorProxy(new StyleEditor(styleData, this, ["fill"]));

    if (typeof editorOrUpdates === "function") {
        editorOrUpdates(fillEditor);
    } else {
        deepMerge(styleData.fill, editorOrUpdates);
    }

    return this;
}

Formula.prototype.fill = _Formula_fill;
