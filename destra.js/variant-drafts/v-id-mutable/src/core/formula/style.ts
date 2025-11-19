/**
 * 样式属性 API 模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Formula 类实现样式相关方法。
 */

import { Assignable, Expect } from "../../types/utils";
import { Formula, Expression, VarExpl } from "./base";

// ============================================================================
// 1. 枚举定义 (Desmos Styles)
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

// ============================================================================
// 2. 类型定义 (Destra Style Schema)
// ============================================================================

// 数值型的、可嵌入公式的样式值类型
export type NumericStyleValue = number | string | Expression | VarExpl;

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
     * 参数方程 & 极坐标/柱坐标/球坐标 的域 (Domain) 定义
     */
    theta?: { min: NumericStyleValue; max: NumericStyleValue };
    phi?: { min: NumericStyleValue; max: NumericStyleValue };
    t?: { min: NumericStyleValue; max: NumericStyleValue };
    u?: { min: NumericStyleValue; max: NumericStyleValue };
    v?: { min: NumericStyleValue; max: NumericStyleValue };
}

// 定义所有一级属性 Key，维持与 Destra Style Schema 的一致性
const styleKeys = [
    'hidden', 'showParts', 'color', 'line', 'point', 'fill', 'label',
    'theta', 'phi', 't', 'u', 'v',
] as const;

type CheckDestraStyle = Expect<Assignable<DestraStyle, { [K in typeof styleKeys[number]]?: any }>>;

type LeafType = boolean | number | string | Expression | VarExpl;

type StyleSchema<T> = {
    [K in keyof T]: 
        NonNullable<T[K]> extends LeafType
        ? true 
        : StyleSchema<NonNullable<T[K]>>;
};
/**
 * 运行时样式结构描述
 * true 表示叶子节点，对象表示嵌套结构
 */
const styleSchema = {
    hidden: true,
    showParts: {
        lines: true,
        points: true,
        fill: true,
        label: true,
    },
    color: true,
    line: {
        style: true,
        width: true,
        opacity: true,
    },
    point: {
        style: true,
        size: true,
        opacity: true,
        dragMode: true,
    },
    fill: {
        opacity: true,
    },
    label: {
        text: true,
        size: true,
        orientation: true,
        angle: true,
    },
    // Domains
    theta: { min: true, max: true },
    phi: { min: true, max: true },
    t: { min: true, max: true },
    u: { min: true, max: true },
    v: { min: true, max: true },
} as const satisfies StyleSchema<DestraStyle>;


export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// ============================================================================
// 3. Editor 类型定义 (Explicit Interfaces)
// ============================================================================

/**
 * Editor 基础接口
 */
export interface EditorBase<T> {
    readonly value: T | undefined;
    set(value: DeepPartial<T> | undefined | ((current: T | undefined) => DeepPartial<T> | undefined)): void;
    update(value: DeepPartial<T>): void;
    delete(): void;
    edit(callback: (editor: this) => void): void;
    toJSON(): T | undefined;
}

/**
 * 叶子节点 Editor (Primitive Values)
 */
export interface LeafEditor<T> extends EditorBase<T> {
    // 叶子节点不需要子属性访问器
}

/**
 * ShowParts Editor
 */
export interface ShowPartsEditor extends EditorBase<NonNullable<DestraStyle['showParts']>> {
    get lines(): LeafEditor<boolean>;
    set lines(v: boolean | undefined);

    get points(): LeafEditor<boolean>;
    set points(v: boolean | undefined);

    get fill(): LeafEditor<boolean>;
    set fill(v: boolean | undefined);

    get label(): LeafEditor<boolean>;
    set label(v: boolean | undefined);
}

/**
 * Line Editor
 */
export interface LineEditor extends EditorBase<NonNullable<DestraStyle['line']>> {
    get style(): LeafEditor<LineStyle>;
    set style(v: LineStyle | undefined);

    get width(): LeafEditor<NumericStyleValue>;
    set width(v: NumericStyleValue | undefined);

    get opacity(): LeafEditor<NumericStyleValue>;
    set opacity(v: NumericStyleValue | undefined);
}

/**
 * Point Editor
 */
export interface PointEditor extends EditorBase<NonNullable<DestraStyle['point']>> {
    get style(): LeafEditor<PointStyle>;
    set style(v: PointStyle | undefined);

    get size(): LeafEditor<NumericStyleValue>;
    set size(v: NumericStyleValue | undefined);

    get opacity(): LeafEditor<NumericStyleValue>;
    set opacity(v: NumericStyleValue | undefined);

    get dragMode(): LeafEditor<DragMode>;
    set dragMode(v: DragMode | undefined);
}

/**
 * Fill Editor
 */
export interface FillEditor extends EditorBase<NonNullable<DestraStyle['fill']>> {
    get opacity(): LeafEditor<NumericStyleValue>;
    set opacity(v: NumericStyleValue | undefined);
}

/**
 * Label Editor
 */
export interface LabelEditor extends EditorBase<NonNullable<DestraStyle['label']>> {
    get text(): LeafEditor<string>;
    set text(v: string | undefined);

    get size(): LeafEditor<NumericStyleValue>;
    set size(v: NumericStyleValue | undefined);

    get orientation(): LeafEditor<LabelOrientation>;
    set orientation(v: LabelOrientation | undefined);

    get angle(): LeafEditor<NumericStyleValue>;
    set angle(v: NumericStyleValue | undefined);
}

/**
 * Domain Editor (Generic for theta, phi, t, u, v)
 */
export interface DomainEditor extends EditorBase<{ min: NumericStyleValue; max: NumericStyleValue }> {
    get min(): LeafEditor<NumericStyleValue>;
    set min(v: NumericStyleValue | undefined);

    get max(): LeafEditor<NumericStyleValue>;
    set max(v: NumericStyleValue | undefined);
}

/**
 * Root Style Editor
 */
export interface RootStyleEditor extends EditorBase<DestraStyle> {
    get hidden(): LeafEditor<boolean>;
    set hidden(v: boolean | undefined);

    get showParts(): ShowPartsEditor;
    set showParts(v: DeepPartial<NonNullable<DestraStyle['showParts']>> | undefined);

    get color(): LeafEditor<NonNullable<DestraStyle['color']>>;
    set color(v: NonNullable<DestraStyle['color']> | undefined);

    get line(): LineEditor;
    set line(v: DeepPartial<NonNullable<DestraStyle['line']>> | undefined);

    get point(): PointEditor;
    set point(v: DeepPartial<NonNullable<DestraStyle['point']>> | undefined);

    get fill(): FillEditor;
    set fill(v: DeepPartial<NonNullable<DestraStyle['fill']>> | undefined);

    get label(): LabelEditor;
    set label(v: DeepPartial<NonNullable<DestraStyle['label']>> | undefined);

    // Domains
    get theta(): DomainEditor;
    set theta(v: DeepPartial<{ min: NumericStyleValue; max: NumericStyleValue }> | undefined);

    get phi(): DomainEditor;
    set phi(v: DeepPartial<{ min: NumericStyleValue; max: NumericStyleValue }> | undefined);

    get t(): DomainEditor;
    set t(v: DeepPartial<{ min: NumericStyleValue; max: NumericStyleValue }> | undefined);

    get u(): DomainEditor;
    set u(v: DeepPartial<{ min: NumericStyleValue; max: NumericStyleValue }> | undefined);

    get v(): DomainEditor;
    set v(v: DeepPartial<{ min: NumericStyleValue; max: NumericStyleValue }> | undefined);
}

// ============================================================================
// 4. Factory
// ============================================================================

// 辅助：判断值是否为复杂对象（需要 Merge）
const isMergeableObject = (v: any): boolean => {
    if (v === null || typeof v !== 'object') return false;
    if (v instanceof Expression || v instanceof VarExpl) return false;
    if (Array.isArray(v)) return false;
    return true;
};

// 深度合并函数
const deepMerge = (target: any, source: any, schemaNode: any) => {
    if (source === undefined) return undefined;
    if (!isMergeableObject(source) || !isMergeableObject(target) || schemaNode === true) {
        return source;
    }

    const result = { ...target };
    for (const key in source) {
        if (schemaNode[key]) {
            const val = source[key];
            if (val === undefined) {
                delete result[key];
            } else {
                result[key] = deepMerge(result[key], val, schemaNode[key]);
            }
        }
    }
    return result;
};

// 自定义深拷贝函数
const deepCloneStyle = (obj: any): any => {
    if (obj === undefined || obj === null) return obj;
    if (!isMergeableObject(obj)) {
        if (Array.isArray(obj)) {
            return obj.map(item => deepCloneStyle(item));
        }
        return obj;
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepCloneStyle(obj[key]);
        }
    }
    return result;
};


/**
 * 创建 Editor 节点 (Type-unsafe internal implementation)
 */
const createEditorNode = <T>(
    getData: () => T,
    setData: (val: T | undefined) => void,
    schemaNode: any
): EditorBase<T> => {
    const editor = {} as EditorBase<T>;

    // 使用闭包变量作为缓存
    const childrenCache = new Map<string, any>();

    // 1. 基础方法实现

    Object.defineProperty(editor, 'value', {
        get: () => deepCloneStyle(getData()),
        enumerable: true
    });

    editor.set = (arg: any) => {
        const current = getData();
        let val = arg;
        if (typeof arg === 'function') {
            val = arg(deepCloneStyle(current));
        }
        setData(val);
    };

    editor.update = (val: any) => {
        if (val === undefined) return;
        const current = getData();
        if (schemaNode === true || !isMergeableObject(val)) {
            setData(val);
        } else {
            const merged = deepMerge(current, val, schemaNode);
            setData(merged);
        }
    };

    editor.delete = () => {
        setData(undefined);
    };

    editor.edit = (callback: (e: any) => void) => {
        callback(editor);
    };

    editor.toJSON = () => deepCloneStyle(getData());

    // 2. 生成子属性的 Getter/Setter
    if (typeof schemaNode === 'object' && schemaNode !== null) {
        for (const key in schemaNode) {
            const childSchema = schemaNode[key];

            Object.defineProperty(editor, key, {
                enumerable: true,
                get: () => {
                    // 优先从闭包缓存中读取
                    if (childrenCache.has(key)) {
                        return childrenCache.get(key);
                    }

                    const childGetData = () => {
                        const data = getData();
                        return (data as any)?.[key];
                    };
                    const childSetData = (val: any) => {
                        const data = getData();
                        // 如果当前节点本身是 undefined，需要初始化为空对象才能设置子属性
                        const parentData = (data && typeof data === 'object') ? data : {};

                        if (val === undefined) {
                            delete (parentData as any)[key];
                        } else {
                            (parentData as any)[key] = val;
                        }

                        // 只有当父对象引用发生变化（比如从 undefined 变为 {}）时才需要回写
                        // 但为了保险起见，以及处理 createEditorNode 的上层 setData 逻辑，总是回写是安全的
                        if (data !== parentData) {
                            setData(parentData as any);
                        }
                    };

                    const childEditor = createEditorNode(childGetData, childSetData, childSchema);
                    // 写入缓存
                    childrenCache.set(key, childEditor);

                    return childEditor;
                },
                set: (val: any) => {
                    const data = getData();
                    const parentData = (data && typeof data === 'object') ? data : {};

                    if (val === undefined) {
                        delete (parentData as any)[key];
                    } else {
                        (parentData as any)[key] = val;
                    }

                    if (data !== parentData) {
                        setData(parentData as any);
                    }
                }
            });
        }
    }

    return editor;
};

// ============================================================================
// 5. 内部存储 (WeakMap)
// ============================================================================

const formulaStyles = new WeakMap<Formula, DestraStyle>();

const getFormulaStyle = (formula: Formula): DestraStyle => {
    let style = formulaStyles.get(formula);
    if (!style) {
        style = {};
        formulaStyles.set(formula, style);
    }
    return style;
};

// ============================================================================
// 6. 声明合并与原型注入
// ============================================================================

declare module "./base" {
    interface Formula {
        /**
         * 样式配置 (增量更新 / Merge)
         */
        style(configOrEditor: DeepPartial<DestraStyle> | ((editor: RootStyleEditor) => void)): this;

        /**
         * 样式设置 (完全覆盖 / Overwrite)
         */
        setStyle(config: DestraStyle): this;

        /**
         * 获取样式的只读数据副本 (Introspection, Deep Cloned)
         */
        readonly styleData: DestraStyle;

        // 一级属性快捷方式 (Merge 语义)
        hidden(config: boolean | ((editor: LeafEditor<boolean>) => void)): this;
        showParts(config: DeepPartial<NonNullable<DestraStyle['showParts']>> | ((editor: ShowPartsEditor) => void)): this;
        color(config: NonNullable<DestraStyle['color']> | ((editor: LeafEditor<NonNullable<DestraStyle['color']>>) => void)): this;
        line(config: DeepPartial<NonNullable<DestraStyle['line']>> | ((editor: LineEditor) => void)): this;
        point(config: DeepPartial<NonNullable<DestraStyle['point']>> | ((editor: PointEditor) => void)): this;
        fill(config: DeepPartial<NonNullable<DestraStyle['fill']>> | ((editor: FillEditor) => void)): this;
        label(config: DeepPartial<NonNullable<DestraStyle['label']>> | ((editor: LabelEditor) => void)): this;
        // Domain shortcuts
        theta(config: DeepPartial<NonNullable<DestraStyle['theta']>> | ((editor: DomainEditor) => void)): this;
        phi(config: DeepPartial<NonNullable<DestraStyle['phi']>> | ((editor: DomainEditor) => void)): this;
        t(config: DeepPartial<NonNullable<DestraStyle['t']>> | ((editor: DomainEditor) => void)): this;
        u(config: DeepPartial<NonNullable<DestraStyle['u']>> | ((editor: DomainEditor) => void)): this;
        v(config: DeepPartial<NonNullable<DestraStyle['v']>> | ((editor: DomainEditor) => void)): this;

        // 一级属性 Setters (Overwrite 语义)
        setHidden(val: boolean): this;
        setShowParts(val: NonNullable<DestraStyle['showParts']>): this;
        setColor(val: NonNullable<DestraStyle['color']>): this;
        setLine(val: NonNullable<DestraStyle['line']>): this;
        setPoint(val: NonNullable<DestraStyle['point']>): this;
        setFill(val: NonNullable<DestraStyle['fill']>): this;
        setLabel(val: NonNullable<DestraStyle['label']>): this;
        setTheta(val: NonNullable<DestraStyle['theta']>): this;
        setPhi(val: NonNullable<DestraStyle['phi']>): this;
        setT(val: NonNullable<DestraStyle['t']>): this;
        setU(val: NonNullable<DestraStyle['u']>): this;
        setV(val: NonNullable<DestraStyle['v']>): this;
    }
}

type MakeSetterName<K extends string> = `set${Capitalize<K>}`;
type CheckFormulaStyle = Expect<Assignable<Formula,
    & { [K in typeof styleKeys[number]]: (config: any) => Formula }
    & { [K in MakeSetterName<typeof styleKeys[number]>]: (config: any) => Formula }
>>;

// 注入 style 方法 (Merge 语义)
Object.defineProperty(Formula.prototype, "style", {
    value: function (arg: any) {
        const self = this as Formula;
        const getData = () => getFormulaStyle(self);
        const setData = (val: DestraStyle | undefined) => formulaStyles.set(self, val || {});

        // 1. 配置模式 (Arg is Object) -> Deep Merge
        if (typeof arg === 'object' && arg !== null) {
            const current = getData();
            const merged = deepMerge(current, arg, styleSchema);
            setData(merged);
            return self;
        }

        // 2. 编辑模式 (Arg is Function)
        if (typeof arg === 'function') {
            const rootEditor = createEditorNode(getData, setData, styleSchema);
            arg(rootEditor);
            return self;
        }

        return self;
    },
    enumerable: true
});

// 注入 setStyle 方法 (Overwrite 语义)
Object.defineProperty(Formula.prototype, "setStyle", {
    value: function (config: DestraStyle) {
        const self = this as Formula;
        formulaStyles.set(self, config); // 直接覆写
        return self;
    },
    enumerable: true
});

// 注入 styleData 属性
Object.defineProperty(Formula.prototype, "styleData", {
    get() {
        return deepCloneStyle(getFormulaStyle(this as Formula));
    },
    enumerable: true
});

// 注入一级属性快捷方式 (Merge) 和 Setters (Overwrite)
styleKeys.forEach(key => {
    // 1. Shortcut (style-like, Merge)
    Object.defineProperty(Formula.prototype, key, {
        value: function (arg: any) {
            // 复用 .style()
            return this.style((s: any) => {
                if (typeof arg === 'object') {
                    // s[key] = arg 会触发 Setter -> Merge
                    s[key] = arg;
                } else if (typeof arg === 'function') {
                    s[key].edit(arg);
                } else {
                    // Primitive values (e.g. color("red"))
                    s[key] = arg;
                }
            });
        },
        enumerable: true
    });

    // 2. Setter (setStyle-like, Overwrite)
    // 命名规则: set + CapitalizedKey
    const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
    Object.defineProperty(Formula.prototype, setterName, {
        value: function (val: any) {
            return this.style((s: any) => {
                s[key].delete();
                s[key] = val;
            });
        },
        enumerable: true
    });
});
