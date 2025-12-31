/**
 * 样式属性 API 模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Formula 类实现样式相关方法。
 */

import { Assignable, Expect } from "../../types/utils";
import { Formula, Expression, VarExpl } from "./base";
import { getState } from "../state";
import { Label } from "./label";

// --- 1. 枚举定义 (Desmos Styles) ---

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

// --- 2. 类型定义 (Destra Style Schema) ---

// 数值型的、可嵌入公式的样式值类型
export type NumericStyleValue = number | string | Expression | VarExpl;

// 颜色
export type ColorStyleValue = VarExpl | string;

// 标签文本值类型
export type LabelTextValue = string | Label;

// Action 表达式
export type ActionStyleValue = Expression | VarExpl;

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
        text?: LabelTextValue;
        size?: NumericStyleValue;
        orientation?: LabelOrientation;
        angle?: NumericStyleValue;
    };

    /**
     * 交互设置 (Click Handler)
     * 对应 Desmos 的 `clickableInfo` 属性。
     */
    click?: {
         /**
         * 是否启用点击交互。
         * - `true` (默认): 显式启用。
         * - `false`: 显式禁用。
         * - `undefined` / 未设置: 如果设置了 handler，则默认将对应 Desmos `clickableInfo.enabled` 设为 true。
         * - `null`: 移除该字段（对应 Desmos 里 `expressionState.clickableInfo.enabled === undefined`），Desmos 在这种情况下的默认行为表现为禁用，但保留其他记忆。
         */
        enabled?: boolean | null;
        /**
         * 点击时执行的动作。
         * 对应 Desmos 的 `clickableInfo.latex`。
         */
        handler?: ActionStyleValue;
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
    'hidden', 'showParts', 'color', 'line', 'point', 'fill', 'label', 'click',
    'theta', 'phi', 't', 'u', 'v',
] as const;

type CheckDestraStyle = Expect<Assignable<DestraStyle, { [K in typeof styleKeys[number]]?: any }>>;

type LeafType = boolean | number | string | Expression | VarExpl | Label | null;

// Validator 定义
type Validator<T> = (v: unknown) => v is T;

const isBoolean: Validator<boolean> = (v): v is boolean => typeof v === 'boolean';
const isNumber: Validator<number> = (v): v is number => typeof v === 'number';
const isString: Validator<string> = (v): v is string => typeof v === 'string';
const isNull: Validator<null> = (v): v is null => v === null;

const optional = <T>(validator: Validator<T>): Validator<T | undefined> =>
    (v): v is T | undefined => v === undefined || validator(v);

const or = <T1, T2>(v1: Validator<T1>, v2: Validator<T2>): Validator<T1 | T2> =>
    (v): v is T1 | T2 => v1(v) || v2(v);

const oneOf = <T extends string>(enumObj: Record<string, T>): Validator<T> => {
    const values = new Set(Object.values(enumObj));
    return (v): v is T => typeof v === 'string' && values.has(v as T);
};

const isExpression = (v: unknown): v is Expression => v instanceof Expression;
const isVarExpl = (v: unknown): v is VarExpl => v instanceof VarExpl;
const isLabel = (v: unknown): v is Label => v instanceof Label;

const isNumericStyleValue: Validator<NumericStyleValue> = (v): v is NumericStyleValue =>
    isNumber(v) || isString(v) || isExpression(v) || isVarExpl(v);

const isColorStyleValue: Validator<ColorStyleValue> = (v): v is ColorStyleValue =>
    isString(v) || isVarExpl(v);

const isLabelTextValue: Validator<LabelTextValue> = (v): v is LabelTextValue =>
    isString(v) || isLabel(v);

const isActionStyleValue: Validator<ActionStyleValue> = (v): v is ActionStyleValue =>
    isExpression(v) || isVarExpl(v);

type NonUndefinedable<T> = NonNullable<T> | null;

type StyleSchema<T> = {
    [K in keyof T]:
    NonUndefinedable<T[K]> extends LeafType
    ? Validator<NonUndefinedable<T[K]>>
    : StyleSchema<NonUndefinedable<T[K]>>;
};

/**
 * 运行时样式结构描述 & 校验器
 */
const styleSchema = {
    hidden: isBoolean,
    showParts: {
        lines: isBoolean,
        points: isBoolean,
        fill: isBoolean,
        label: isBoolean,
    },
    color: isColorStyleValue,
    line: {
        style: oneOf(LineStyle),
        width: isNumericStyleValue,
        opacity: isNumericStyleValue,
    },
    point: {
        style: oneOf(PointStyle),
        size: isNumericStyleValue,
        opacity: isNumericStyleValue,
        dragMode: oneOf(DragMode),
    },
    fill: {
        opacity: isNumericStyleValue,
    },
    label: {
        text: isLabelTextValue,
        size: isNumericStyleValue,
        orientation: oneOf(LabelOrientation),
        angle: isNumericStyleValue,
    },
    click: {
        enabled: or(isBoolean, isNull),
        handler: isActionStyleValue,
    },
    // Domains
    theta: { min: isNumericStyleValue, max: isNumericStyleValue },
    phi: { min: isNumericStyleValue, max: isNumericStyleValue },
    t: { min: isNumericStyleValue, max: isNumericStyleValue },
    u: { min: isNumericStyleValue, max: isNumericStyleValue },
    v: { min: isNumericStyleValue, max: isNumericStyleValue },
} as const satisfies StyleSchema<DestraStyle>;


export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// --- 3. Editor 类型定义 (Explicit Interfaces) ---

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
export interface ShowPartsEditor extends EditorBase<NonUndefinedable<DestraStyle['showParts']>> {
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
export interface LineEditor extends EditorBase<NonUndefinedable<DestraStyle['line']>> {
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
export interface PointEditor extends EditorBase<NonUndefinedable<DestraStyle['point']>> {
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
export interface FillEditor extends EditorBase<NonUndefinedable<DestraStyle['fill']>> {
    get opacity(): LeafEditor<NumericStyleValue>;
    set opacity(v: NumericStyleValue | undefined);
}

/**
 * Label Editor
 */
export interface LabelEditor extends EditorBase<NonUndefinedable<DestraStyle['label']>> {
    get text(): LeafEditor<LabelTextValue>;
    set text(v: LabelTextValue | undefined);

    get size(): LeafEditor<NumericStyleValue>;
    set size(v: NumericStyleValue | undefined);

    get orientation(): LeafEditor<LabelOrientation>;
    set orientation(v: LabelOrientation | undefined);

    get angle(): LeafEditor<NumericStyleValue>;
    set angle(v: NumericStyleValue | undefined);
}

/**
 * Click Editor
 */
export interface ClickEditor extends EditorBase<NonUndefinedable<DestraStyle['click']>> {
    get enabled(): LeafEditor<boolean | null>;
    set enabled(v: boolean | null | undefined);

    get handler(): LeafEditor<ActionStyleValue>;
    set handler(v: ActionStyleValue | undefined);
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
    set showParts(v: DeepPartial<NonUndefinedable<DestraStyle['showParts']>> | undefined);

    get color(): LeafEditor<NonUndefinedable<DestraStyle['color']>>;
    set color(v: NonUndefinedable<DestraStyle['color']> | undefined);

    get line(): LineEditor;
    set line(v: DeepPartial<NonUndefinedable<DestraStyle['line']>> | undefined);

    get point(): PointEditor;
    set point(v: DeepPartial<NonUndefinedable<DestraStyle['point']>> | undefined);

    get fill(): FillEditor;
    set fill(v: DeepPartial<NonUndefinedable<DestraStyle['fill']>> | undefined);

    get label(): LabelEditor;
    set label(v: DeepPartial<NonUndefinedable<DestraStyle['label']>> | undefined);

    get click(): ClickEditor;
    set click(v: DeepPartial<NonUndefinedable<DestraStyle['click']>> | undefined);

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

// --- 4. Factory ---

// 辅助：判断值是否为复杂对象（需要 Merge）
// 如果是 Formula 或 Label，则不进行合并，像原始值一样持有其引用
const isMergeableObject = (v: any): boolean => {
    if (v === null || typeof v !== 'object') return false;
    if (v instanceof Expression || v instanceof VarExpl || v instanceof Label) return false;
    if (Array.isArray(v)) return false;
    return true;
};

// 深度合并函数 (回归纯粹)
const deepMerge = (target: any, source: any, schemaNode: any) => {
    if (source === undefined) return undefined;

    // 如果是叶子节点 Schema (Validator)，直接返回 source (Overwrite)
    if (typeof schemaNode === 'function') {
        return source;
    }

    if (!isMergeableObject(source) || !isMergeableObject(target)) {
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

// 递归校验函数 (用于全量校验)
const validateRecursively = (value: any, schemaNode: any) => {
    if (value === undefined) return;

    if (typeof schemaNode === 'function') {
        // 叶子节点校验
        if (!schemaNode(value)) {
            throw new TypeError(`Invalid style value: ${String(value)}`);
        }
    } else if (typeof schemaNode === 'object' && schemaNode !== null && isMergeableObject(value)) {
        for (const key in value) {
            if (schemaNode[key]) {
                validateRecursively(value[key], schemaNode[key]);
            } else {
                throw new TypeError(`Invalid style key: ${key}`);
            }
        }
    }
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
 * 统一的公式样式数据读写接口
 * 方便统一执行校验和深拷贝
 */

// 读取数据：深拷贝后返回
const getStyleData = (formula: Formula): DestraStyle => {
    const state = getState(formula);
    return deepCloneStyle(state.style?.styleData || {});
};

// 写入数据：校验、深拷贝后写入
const setStyleData = (formula: Formula, data: DestraStyle | undefined) => {
    if (data !== undefined) {
        validateRecursively(data, styleSchema);
    }

    const state = getState(formula);
    state.style ??= { styleData: {} };
    state.style.styleData = deepCloneStyle(data ?? {});
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
        get: () => getData(),
        enumerable: true,
        configurable: true,
    });

    editor.set = (arg: any) => {
        const current = getData();
        let val = arg;

        // state updater 函数
        if (typeof arg === 'function') {
            val = arg(current);
        }

        // 传入 editor, 抛出错误
        if (typeof arg === 'object' && 'value' in arg) {
            throw new TypeError('Invalid style argument: expected data object, got editor');
        }

        setData(val);
    };

    editor.update = (arg: any) => {
        if (arg === undefined) return;
        const current = getData();
        let val = arg;

        // 传入 editor, 抛出错误
        if (typeof arg === 'object' && 'value' in arg) {
            throw new TypeError('Invalid style argument: expected data object, got editor');
        }

        if (typeof schemaNode === 'function') {
            // 叶子节点 update 等同于 set
            setData(val);
        } else if(!isMergeableObject(val)) {
            // 非预期结构，直接 set
            setData(val);
        } else {
            // deepMerge 合并
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

    editor.toJSON = () => editor.value;

    // 2. 生成子属性的 Getter/Setter
    if (typeof schemaNode === 'object' && schemaNode !== null) {
        for (const key in schemaNode) {
            const childSchema = schemaNode[key];

            Object.defineProperty(editor, key, {
                enumerable: true,
                configurable: true,
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

                        // 回写给父级，最终触发 Root setData 的校验
                        setData(parentData as any);
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
                        // 删除
                        delete (parentData as any)[key];
                    } else if(typeof val === 'object' && 'value' in val) {
                        // 传入 editor, 抛出错误
                        throw new TypeError('Invalid style argument: expected data object, got editor');
                    } else {
                        // 直接赋值
                        (parentData as any)[key] = val;
                    }

                    setData(parentData as any);
                }
            });
        }
    }

    return editor;
};

// --- 5. 内部存储扩展 ---

declare module "../state" {
    interface StyleState {
        styleData: DestraStyle;
    }
}

// --- 6. 声明合并与原型注入 ---

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
        showParts(config: DeepPartial<NonUndefinedable<DestraStyle['showParts']>> | ((editor: ShowPartsEditor) => void)): this;
        color(config: NonUndefinedable<DestraStyle['color']> | ((editor: LeafEditor<NonUndefinedable<DestraStyle['color']>>) => void)): this;
        line(config: DeepPartial<NonUndefinedable<DestraStyle['line']>> | ((editor: LineEditor) => void)): this;
        point(config: DeepPartial<NonUndefinedable<DestraStyle['point']>> | ((editor: PointEditor) => void)): this;
        fill(config: DeepPartial<NonUndefinedable<DestraStyle['fill']>> | ((editor: FillEditor) => void)): this;
        label(config: DeepPartial<NonUndefinedable<DestraStyle['label']>> | ((editor: LabelEditor) => void)): this;
        click(config: DeepPartial<NonUndefinedable<DestraStyle['click']>> | ((editor: ClickEditor) => void)): this;
        // Domain shortcuts
        theta(config: DeepPartial<NonUndefinedable<DestraStyle['theta']>> | ((editor: DomainEditor) => void)): this;
        phi(config: DeepPartial<NonUndefinedable<DestraStyle['phi']>> | ((editor: DomainEditor) => void)): this;
        t(config: DeepPartial<NonUndefinedable<DestraStyle['t']>> | ((editor: DomainEditor) => void)): this;
        u(config: DeepPartial<NonUndefinedable<DestraStyle['u']>> | ((editor: DomainEditor) => void)): this;
        v(config: DeepPartial<NonUndefinedable<DestraStyle['v']>> | ((editor: DomainEditor) => void)): this;

        // 一级属性 Setters (Overwrite 语义)
        setHidden(val: boolean): this;
        setShowParts(val: NonUndefinedable<DestraStyle['showParts']>): this;
        setColor(val: NonUndefinedable<DestraStyle['color']>): this;
        setLine(val: NonUndefinedable<DestraStyle['line']>): this;
        setPoint(val: NonUndefinedable<DestraStyle['point']>): this;
        setFill(val: NonUndefinedable<DestraStyle['fill']>): this;
        setLabel(val: NonUndefinedable<DestraStyle['label']>): this;
        setClick(val: NonUndefinedable<DestraStyle['click']>): this;
        setTheta(val: NonUndefinedable<DestraStyle['theta']>): this;
        setPhi(val: NonUndefinedable<DestraStyle['phi']>): this;
        setT(val: NonUndefinedable<DestraStyle['t']>): this;
        setU(val: NonUndefinedable<DestraStyle['u']>): this;
        setV(val: NonUndefinedable<DestraStyle['v']>): this;
    }
}

type MakeSetterName<K extends string> = `set${Capitalize<K>}`;
// 检查是否满足：styleKeys 中的每个 key 都有对应的 setter 方法
type CheckFormulaStyle = Expect<Assignable<Formula,
    & { [K in typeof styleKeys[number]]: (config: any) => Formula }
    & { [K in MakeSetterName<typeof styleKeys[number]>]: (config: any) => Formula }
>>;

// 注入 style 方法 (Merge 语义)
Object.defineProperty(Formula.prototype, "style", {
    value: function (arg: any) {
        const self = this as Formula;

        const getData = () => getStyleData(self);
        const setData = (val: DestraStyle | undefined) => setStyleData(self, val);

        // 1. 配置模式 (Arg is Object) -> Deep Merge
        if (typeof arg === 'object' && arg !== null) {
            const current = getData();
            if(typeof arg === 'object' && 'value' in arg) {
                throw new TypeError('Invalid style argument: expected data object or callback function, got editor');
            }
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
    enumerable: true,
    configurable: true,
});

// 注入 setStyle 方法 (Overwrite 语义)
// 写入时进行一次深拷贝
Object.defineProperty(Formula.prototype, "setStyle", {
    value: function (config: DestraStyle) {
        setStyleData(this as Formula, config);
        return this;
    },
    enumerable: true,
    configurable: true,
});

// 注入 styleData 属性
Object.defineProperty(Formula.prototype, "styleData", {
    get() {
        return getStyleData(this as Formula);
    },
    enumerable: true,
    configurable: true,
});

// 注入一级属性快捷方式 (Merge) 和 Setters (Overwrite)
styleKeys.forEach(key => {
    // 1. Shortcut (style-like, Merge)
    Object.defineProperty(Formula.prototype, key, {
        value: function (arg: any) {
            // 复用 .style()
            return this.style((s: any) => {
                if (typeof arg === 'function') {
                    // 函数 -> Editor 回调
                    s[key].edit(arg);
                } else {
                    // Update/Merge
                    s[key].update(arg);
                }
            });
        },
        enumerable: true,
        configurable: true,
    });

    // 2. Setter (setStyle-like, Overwrite)
    // 命名规则: set + CapitalizedKey
    const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
    Object.defineProperty(Formula.prototype, setterName, {
        value: function (val: any) {
            return this.style((s: any) => {
                s[key].set(val);
            });
        },
        enumerable: true,
        configurable: true,
    });
});
