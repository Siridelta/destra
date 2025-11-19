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
     * 域 (Domain) 定义
     */
    theta?: { min: NumericStyleValue; max: NumericStyleValue };
    phi?: { min: NumericStyleValue; max: NumericStyleValue };
    t?: { min: NumericStyleValue; max: NumericStyleValue };
    u?: { min: NumericStyleValue; max: NumericStyleValue };
    v?: { min: NumericStyleValue; max: NumericStyleValue };
}

// ============================================================================
// 3. 内部存储 (WeakMap)
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
// 4. Editor 模式实现
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
 *
 * @param rootData 根数据对象 (DestraStyle)
 * @param path 当前 Editor 对应的数据路径 (e.g., ['point', 'size'])
 * @param parent 父级 Editor (用于链式调用返回)
 * @param onUpdate 回调，当数据发生变更时触发（这里主要是为了确保根对象存在，或者处理一些副作用）
 */
const createStyleEditor = <T, P>(
    getData: () => T | undefined,
    setData: (val: T | undefined) => void,
    parent: P
): StyleEditor<T, P> => {
    
    // 核心调用逻辑
    const invoke = (arg: any) => {
        if (typeof arg === 'function') {
            // Callback 模式: editor(e => ...)
            arg(proxy);
        } else if (typeof arg === 'object' && arg !== null && !isPrimitiveStyleValue(arg)) {
             // Object merge 模式 (简化的 deep merge，或者直接视为 update)
             // 注意：这里需要区分是 Expression/VarExpl 还是纯配置对象
             // 如果是 Expression/VarExpl，它应该被视为"值"，走 set 逻辑
             if (isStyleValue(arg)) {
                 // 是样式值 (Expression | VarExpl)，直接 set
                 proxy.set(arg as any);
             } else {
                 // 是配置对象，进行合并
                 // 这里我们需要一个 merge 逻辑。
                 // 简单起见，我们遍历 arg 的 key 并递归调用子 editor 的 set/invoke
                 // 但为了性能和正确性，我们也可以直接修改数据。
                 // 既然有了 proxy 机制，不如直接利用它?
                 // 遍历 arg:
                 for (const key in arg) {
                    const value = arg[key];
                    // 访问子 editor 并调用它，传入 value
                    // 这样可以复用子 editor 的逻辑 (比如处理 undefined, merge 等)
                    (proxy as any)[key](value);
                 }
             }
        } else {
            // Value 模式: editor(value) -> set(value)
            proxy.set(arg);
        }
        return parent;
    };

    // 构造混合对象
    const target = invoke as any;

    // 挂载显式方法
    target.set = (value: T | undefined) => {
        setData(value);
    };

    target.delete = () => {
        // delete 语义：从父对象中移除该 key
        // 但我们这里是 setData(undefined) 吗？
        // Desmos 中 undefined通常意味着"使用默认值"或者"移除 override"
        // 在 JS 对象层面， delete 是移除 key。
        // 由于我们的 setData 封装了父对象的 key 访问，我们可以传递一个特殊标记或者 setData(undefined)
        // 约定：setData(undefined) 实际上就是把那个字段设为 undefined。
        // 如果要真 delete key，可能需要更底层的 access。
        // 鉴于 `editor.field = undefined` 和 `delete editor.field` 的区别：
        // editor.field = undefined -> data[field] = undefined
        // delete editor.field -> delete data[field]
        // 我们的 setData 目前无法区分。
        // 让我们改进 setData 的语义，或者简单地让 set(undefined) 能够工作。
        // 实际上，对于 JSON 序列化，key: undefined 通常会被忽略，或者显式输出 null。
        // 让我们暂且认为 set(undefined) 足够了。如果需要真 delete，可以在 Proxy trap 里处理。
        setData(undefined);
    };
    
    // 为了支持 `delete editor.field` 语法，我们需要在 Parent 的 Proxy trap 里处理 deleteProperty。
    // 但 target.delete() 是显式方法。
    // 如果要支持 `delete proxy.field`，我们需要在 Proxy handler 里做。

    target.toJSON = () => {
        return getData();
    };

    // 创建 Proxy
    const proxy = new Proxy(target, {
        get(target, prop, receiver) {
            // 1. 拦截显式方法和已知属性
            if (prop === 'set' || prop === 'delete' || prop === 'toJSON') {
                return Reflect.get(target, prop, receiver);
            }
            
            // 2. 拦截 invoke (作为函数调用时) - 其实不需要拦截，target 本身就是函数

            // 3. 访问子属性 -> 返回子 Editor
            if (typeof prop === 'string') {
                // 构造子属性的 getter/setter
                const childGetData = () => {
                    const data = getData();
                    return (data as any)?.[prop];
                };
                const childSetData = (val: any) => {
                    const data = getData();
                    // 如果当前层级数据不存在，需要自动创建
                    if (data === undefined || data === null) {
                        // 这里有个问题：如果当前 data 是 undefined，我们无法设置属性。
                        // 所以 setData 必须能够“向上追溯”并创建对象？
                        // 或者我们要求 parent 必须存在？
                        // 为了实现 "Auto path creation"，我们需要能够修改 parent 的数据。
                        // 所以 createStyleEditor 最好持有 "parentData" 和 "key"。
                        // 但这里的结构是 getData/setData 闭包。
                        // 这意味着 setData 内部必须处理 "如果 parent 是 undefined，则无法设置" 的情况？
                        // 不，createStyleEditor 的 setData 已经是 "ensure parent exists and set prop" 的逻辑封装吗？
                        // 让我们重新设计 createStyleEditor 的参数，改用 (parentObj, key) 模式可能更稳健？
                        // 但是 root 没有 parentObj (或者说 parent 是 weakMap)。
                        
                        // 修正方案：
                        // 我们不检查 data，直接尝试设置。如果 data 是 undefined，我们在 setData 内部无法解决。
                        // 所以必须在 childSetData 里解决。
                        // 但 childSetData 只能拿到 data (value of current node)。它无法修改 current node 变成 object。
                        
                        // 因此，我们需要一种机制来 "ensure current node is object"。
                        // 这只有在 "get current node" 的时候做不到，必须在 "set child" 的时候做。
                        // 所以：childSetData 需要调用 `ensureData()` ?
                        
                        // 让我们回头看：childSetData 是定义在这里的。
                        // 它可以调用 `setData` (current node's setter) 来初始化当前节点！
                        const currentData = getData();
                        if (currentData === undefined || currentData === null) {
                             setData({} as any);
                        }
                        // Now getData() should return the new object
                        const newData = getData() as any;
                        if (val === undefined) {
                            // 如果是 set undefined, 并不一定要 delete key
                            newData[prop] = undefined;
                            // 如果要真 delete: delete newData[prop];
                        } else {
                            newData[prop] = val;
                        }
                    } else {
                        (data as any)[prop] = val;
                    }
                };
                
                // 返回子 Proxy
                // 注意：parent 传的是当前 proxy (this level)
                return createStyleEditor(childGetData, childSetData, proxy);
            }

            return Reflect.get(target, prop, receiver);
        },

        set(target, prop, value, receiver) {
            // 拦截赋值: editor.field = value
            if (typeof prop === 'string') {
                // 获取子 Editor (为了复用逻辑，或者直接操作数据)
                // 直接操作数据更高效，但要处理 path creation
                const data = getData();
                if (data === undefined || data === null) {
                    setData({} as any);
                }
                const newData = getData() as any;
                newData[prop] = value;
                return true;
            }
            return Reflect.set(target, prop, value, receiver);
        },

        deleteProperty(target, prop) {
            // 拦截 delete editor.field
            if (typeof prop === 'string') {
                const data = getData();
                if (data && typeof data === 'object') {
                    delete (data as any)[prop];
                    return true;
                }
            }
            return Reflect.deleteProperty(target, prop);
        }
    });

    return proxy;
};

// 辅助：判断是否为样式值（非纯配置对象）
const isStyleValue = (v: any): boolean => {
    return v instanceof Expression || v instanceof VarExpl;
};
const isPrimitiveStyleValue = (v: any): boolean => {
     return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

// ============================================================================
// 5. 声明合并与原型注入
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

// 注入 style 属性 (Hybrid Getter)
Object.defineProperty(Formula.prototype, "style", {
    get() {
        const self = this as Formula;
        
        // The Edit Function
        const editFn = (arg?: any) => {
            const getData = () => getFormulaStyle(self);
            const setData = (val: DestraStyle | undefined) => formulaStyles.set(self, val || {});
            const editor = createStyleEditor(getData, setData, self);
            if (arg !== undefined) {
                editor(arg);
            }
            return self;
        };
        
        // Make it look like the Data via Proxy
        return new Proxy(editFn, {
            get(target, prop, receiver) {
                const currentData = getFormulaStyle(self);
                // 优先尝试从数据中读取
                if (currentData && prop in currentData) {
                    return (currentData as any)[prop];
                }
                // 否则返回函数自身的属性
                return Reflect.get(target, prop, receiver);
            },
            set() {
                throw new Error("Style properties are read-only via direct access. Use .style(s => ...) or .style({ ... }) to modify.");
            }
        });
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
