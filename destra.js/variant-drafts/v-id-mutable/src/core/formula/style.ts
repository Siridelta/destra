/**
 * 样式属性 API 模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Formula 类实现样式相关方法。
 */

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

// ============================================================================
// 3. Runtime Schema (用于生成显式 Getter)
// ============================================================================

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
} as const;

// ============================================================================
// 4. 内部存储 (WeakMap)
// ============================================================================

// 使用 WeakMap 存储每个 Formula 实例的样式数据，避免修改 Formula 基类结构
const formulaStyles = new WeakMap<Formula, DestraStyle>();

/**
 * 获取 Formula 的样式数据（只读副本，或者直接引用？为了性能直接引用，但在 API 层做只读保护）
 * 实际上 StyleEditor 需要直接修改这个对象。
 */
const getFormulaStyle = (formula: Formula): DestraStyle => {
    let style = formulaStyles.get(formula);
    if (!style) {
        style = {};
        formulaStyles.set(formula, style);
    }
    return style;
};

// ============================================================================
// 5. Editor 模式实现 (显式 Getter 模式)
// ============================================================================

/**
 * StyleEditor 接口定义
 * 这是一个递归的、混合类型的接口
 */
export type StyleEditor<T, P = any> = {
    // 1. 字段访问: 递归返回子属性的 Editor
    readonly [K in keyof T]-?: StyleEditor<NonNullable<T[K]>, StyleEditor<T, P>>;
} & {
    // 2. 可调用体 (Edit/Update)
    // - callback: (editor) => void
    // - object: T (Deep merge)
    // - value: T (Set value, treated as 'set' shortcut for leaf nodes mostly, but works for objects too)
    (arg: ((editor: StyleEditor<T, P>) => void) | DeepPartial<T> | T): P;

    // 3. 显式方法
    set(value: T | undefined): void;
    delete(): void;
    toJSON(): T | undefined;
};

// 辅助类型: DeepPartial
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * 创建 StyleEditor 的工厂函数
 * 使用 Object.defineProperties 代替 Proxy，提供更好的 IDE 提示和 Console 调试体验
 *
 * @param rootData 根数据对象 (DestraStyle)
 * @param path 当前 Editor 对应的数据路径 (e.g., ['point', 'size'])
 * @param parent 父级 Editor (用于链式调用返回)
 * @param schemaNode 对应的 schema 节点，用于生成显式属性
 */
const createStyleEditor = <T, P>(
    getData: () => T | undefined,
    setData: (val: T | undefined) => void,
    parent: P,
    schemaNode: any 
): StyleEditor<T, P> => {
    
    // 1. 核心函数体
    const editorFunc = function(arg: any) {
        const target = editorFunc as any; // Self reference

        if (typeof arg === 'function') {
            // Callback 模式: editor(e => ...)
            arg(target);
        } else if (typeof arg === 'object' && arg !== null && !isPrimitiveStyleValue(arg)) {
             // Object merge 模式 (简化的 deep merge，或者直接视为 update)
             // 注意：这里需要区分是 Expression/VarExpl 还是纯配置对象
             // 如果是 Expression/VarExpl，它应该被视为"值"，走 set 逻辑
             if (isStyleValue(arg)) {
                 // 是样式值 (Expression | VarExpl)，直接 set
                 target.set(arg as any);
             } else {
                 // 是配置对象，进行合并
                 // 遍历 arg:
                 for (const key in arg) {
                    const value = arg[key];
                    // 只有在 schema 中存在的 key 才能被处理 (安全检查)
                    // 且确保 target[key] 存在 (即子 editor getter 存在)
                    if (schemaNode && schemaNode[key]) {
                        // 访问子 editor 并调用它，传入 value
                        (target as any)[key](value);
                    }
                 }
             }
        } else {
            // Value 模式: editor(value) -> set(value)
            target.set(arg);
        }
        return parent;
    };

    // 2. 挂载显式方法
    const target = editorFunc as any;

    target.set = (value: T | undefined) => {
        setData(value);
    };

    target.delete = () => {
        // delete 语义：setData(undefined)
        setData(undefined);
    };

    target.toJSON = () => {
        return getData();
    };

    // 3. 动态挂载显式 Getter 属性
    if (schemaNode && typeof schemaNode === 'object') {
        const descriptors: PropertyDescriptorMap = {};
        
        for (const key in schemaNode) {
            const childSchema = schemaNode[key];
            
            descriptors[key] = {
                enumerable: true, // 允许在 console.dir 中被枚举看到
                configurable: true,
                get: () => {
                    // 构造子 Editor 的数据访问器
                    const childGetData = () => {
                        const data = getData();
                        return (data as any)?.[key];
                    };
                    const childSetData = (val: any) => {
                        const data = getData();
                        // 如果当前层级数据不存在，需要自动创建
                        if (data === undefined || data === null) {
                             setData({} as any);
                        }
                        // 重新获取 data (因为它可能刚刚被创建)
                        const newData = getData() as any;
                        if (val === undefined) {
                            // set undefined
                            newData[key] = undefined;
                        } else {
                            newData[key] = val;
                        }
                    };
                    
                    // 递归创建，传入当前 editor (target) 作为 parent
                    return createStyleEditor(childGetData, childSetData, target, childSchema);
                }
            };
        }
        
        Object.defineProperties(target, descriptors);
    }

    return target as StyleEditor<T, P>;
};

// 辅助：判断是否为样式值（非纯配置对象）
const isStyleValue = (v: any): boolean => {
    return v instanceof Expression || v instanceof VarExpl;
};
const isPrimitiveStyleValue = (v: any): boolean => {
     return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

// ============================================================================
// 6. 声明合并与原型注入
// ============================================================================

declare module "./base" {
    /**
     * 样式方法与数据的混合类型
     */
    export type StyleMethodAndData = {
        (callback?: (editor: StyleEditor<DestraStyle, Formula>) => void): Formula;
        (config: DeepPartial<DestraStyle>): Formula;
    } & Readonly<DestraStyle>;

    interface Formula {
        /**
         * 样式入口：
         * - 调用 .style(...) 进行修改
         * - 访问 .style.xxx 读取数据 (只读)
         */
        readonly style: StyleMethodAndData;
        
        /**
         * 获取样式的纯数据副本 (同 .style 读取)
         */
        readonly styleData: DestraStyle;
        
        // 快捷方式
        line(arg: ((editor: StyleEditor<NonNullable<DestraStyle['line']>, Formula>) => void) | DeepPartial<NonNullable<DestraStyle['line']>>): Formula;
        point(arg: ((editor: StyleEditor<NonNullable<DestraStyle['point']>, Formula>) => void) | DeepPartial<NonNullable<DestraStyle['point']>>): Formula;
        fill(arg: ((editor: StyleEditor<NonNullable<DestraStyle['fill']>, Formula>) => void) | DeepPartial<NonNullable<DestraStyle['fill']>>): Formula;
        label(arg: ((editor: StyleEditor<NonNullable<DestraStyle['label']>, Formula>) => void) | DeepPartial<NonNullable<DestraStyle['label']>>): Formula;
    }
}

// 注入 style 属性 (Hybrid Getter w/ Explicit Properties)
Object.defineProperty(Formula.prototype, "style", {
    get() {
        const self = this as Formula;
        
        const getData = () => getFormulaStyle(self);
        const setData = (val: DestraStyle | undefined) => formulaStyles.set(self, val || {});
        
        // 使用 Schema 创建绑定到当前实例的 Editor
        const editor = createStyleEditor(getData, setData, self, styleSchema);
        
        return editor;
    }
});

// 注入 styleData 属性
Object.defineProperty(Formula.prototype, "styleData", {
    get() {
        return getFormulaStyle(this as Formula);
    }
});

// 注入快捷方式
['line', 'point', 'fill', 'label'].forEach(key => {
    Object.defineProperty(Formula.prototype, key, {
        value: function(arg: any) {
            return this.style((s: any) => (s as any)[key](arg));
        },
        writable: true,
        configurable: true
    });
});
