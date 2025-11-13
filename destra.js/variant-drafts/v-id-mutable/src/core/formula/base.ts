/**
 * Destra 核心公式基类和类型定义。
 *
 * 本文件定义了 Formula、Expl、Expr 等核心基类，以及相关的类型定义。
 * 这些是构建整个表达式系统的基础。
 */

import { type FormulaTypeInfo } from "../expr-dsl/analyzeType";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 原始值类型：字符串、数字、布尔值、null、undefined
 */
export type PrimitiveValue = string | number | boolean | null | undefined;

/**
 * 模板字符串载荷，包含字符串片段和插值值
 */
export interface TemplatePayload {
    readonly strings: readonly string[];
    readonly values: readonly Substitutable[];
}

/**
 * ID 元数据，记录 ID 的值和是否为隐式生成
 */
export interface IdMetadata {
    segments: readonly string[];
    isImplicit: boolean;
}

/**
 * 公式类型枚举
 */
export enum FormulaType {
    Expression = "expression",
    Variable = "variable",
    Function = "function",
    ExplicitEquation = "explicit-equation",
    ImplicitEquation = "implicit-equation",
    Regression = "regression",
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 运行时检查：判断值是否为原始值
 */
const isPrimitive = (value: unknown): value is PrimitiveValue => {
    const valueType = typeof value;
    if (value === null) {
        return true;
    }
    if (valueType === "string") {
        return true;
    }
    if (valueType === "number") {
        return true;
    }
    if (valueType === "boolean") {
        return true;
    }
    if (valueType === "undefined") {
        return true;
    }
    return false;
};

/**
 * 运行时检查：判断值是否可代入表达式
 */
const isSubstitutable = (value: unknown): value is Substitutable => {
    if (isPrimitive(value)) {
        return true;
    }
    if (value instanceof Formula && value.isEmbeddable) {
        return true;
    }
    return false;
};

/**
 * 创建模板载荷
 */
export const createTemplatePayload = (
    strings: TemplateStringsArray,
    values: readonly Substitutable[],
): TemplatePayload => {
    for (const value of values) {
        // 为 JS 环境增加运行时检查
        if (!isSubstitutable(value)) {
            throw new TypeError(
                "模板字符串插值仅支持原始值或可嵌入的表达式对象 (Expression, VarExpl, FuncExpl)。",
            );
        }
    }
    return {
        strings: Object.freeze(Array.from(strings)),
        values: Object.freeze(values),
    };
};

/**
 * 收集模板载荷中的所有依赖项
 */
export const collectDependencies = (values: readonly Substitutable[]): Embeddable[] => {
    const set = new Set<Embeddable>();
    for (const value of values) {
        if (value instanceof Formula) {
            set.add(value);
        }
    }
    return Array.from(set);
};

// ============================================================================
// 基类定义
// ============================================================================

/**
 * Formula 基类：所有公式类型的抽象基类
 */
export abstract class Formula {
    public readonly template: TemplatePayload;
    public readonly dependencies: readonly Embeddable[];
    public abstract readonly type: FormulaType;

    protected constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        this.template = template;
        const embeddable: Embeddable[] = [];
        for (const dependency of dependencies) {
            // 运行时检查：保证依赖项为 Embeddable
            if (!dependency.isEmbeddable) {
                throw new TypeError("检测到不可嵌入的依赖，违反“禁止悬空依赖”约束。");
            }
            embeddable.push(dependency as Embeddable);
        }
        this.dependencies = Object.freeze(embeddable);
    }

    /**
     * 是否为可嵌入的表达式（可用于其他表达式中）
     */
    public abstract readonly isEmbeddable: boolean;
}

/**
 * Expl 基类：具名声明（变量、函数）的抽象基类
 */
export abstract class Expl extends Formula {
    public readonly isEmbeddable = true as const;
    protected abstract idMeta: IdMetadata;
    protected get _id(): string | undefined {
        if (this.idMeta.segments.length === 0) {
            return undefined;
        }
        return this.idMeta.segments.join(".");
    }
    // 内部使用 _id 获取 computed id 值，同时直接使用 idMeta 进行设置或者细度读取
    // 运行时 _id getter 在调试环境里可见，但在 ts 源代码语境里不可见

    protected constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }
}

/**
 * Expr 基类：表达式（纯表达式、方程等）的抽象基类
 */
export abstract class Expr extends Formula { }

// ============================================================================
// Expr 子类实现
// ============================================================================

/**
 * Expression：纯表达式，可嵌入
 */
export class Expression extends Expr {
    public readonly isEmbeddable = true as const;
    public readonly type = FormulaType.Expression;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }
}

/**
 * ExplicitEquation：显式方程，不可嵌入
 */
export class ExplicitEquation extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.ExplicitEquation;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }
}

/**
 * ImplicitEquation：隐式方程，不可嵌入
 */
export class ImplicitEquation extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.ImplicitEquation;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }
}

/**
 * Regression：回归表达式，不可嵌入
 */
export class Regression extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.Regression;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }
}

// ============================================================================
// Expl 子类实现
// ============================================================================

/**
 * VarExpl：变量声明
 */
export class VarExpl extends Expl {
    public readonly type = FormulaType.Variable;
    protected idMeta: IdMetadata;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[], id?: string) {
        super(template, dependencies);
        const segments = id ? [id] : [];
        this.idMeta = { segments, isImplicit: false };
    }
}

/**
 * FuncExpl 相关类型定义和实现
 */

// 函数签名的基类型
export type FuncExplSignatureBase = (...args: readonly Substitutable[]) => Expression;

// 函数签名的泛型类型
export type FuncExplSignature<TSignature extends FuncExplSignatureBase> = ((
    ...args: Parameters<TSignature> & readonly Substitutable[]
) => Expression);

/**
 * FuncExpl 基类：函数声明的内部实现类
 */
class FuncExplBaseClass extends Expl {
    public readonly type = FormulaType.Function;
    public readonly params: readonly string[];
    protected idMeta: IdMetadata;
    
    public constructor(
        template: TemplatePayload,
        dependencies: readonly Embeddable[],
        options: { readonly id?: string; readonly params: readonly string[] },
    ) {
        super(template, dependencies);
        const segments = options.id ? [options.id] : [];
        this.idMeta = { segments, isImplicit: false };
        this.params = Object.freeze([...options.params]);
    }
}

/**
 * FuncExplClass 类：函数声明的类型化实现类，第1层，加上带函数签名信息的泛型类型，
 * 以及加上 protected 的 invoke 方法（不对外暴露），这个类在加入后面的 type 混合类型后对外暴露
 * 
 * TSignature 只用于存储函数签名的类型信息，其返回值类型信息我们不使用
 * （实际返回的一定将会是 Expression 类型而不是它的子类型）
 */
class FuncExplClass<TSignature extends FuncExplSignatureBase> extends FuncExplBaseClass {
    protected invoke(...args: Parameters<TSignature>): Expression {
        // 运行时检查：参数必须是可代入项
        args.forEach((arg, index) => {
            if (!isSubstitutable(arg)) {
                throw new TypeError(`参数 ${arg} (index: ${index}) 不是可代入项。`);
            }
        });
        // 运行时检查：参数数量必须匹配
        if (args.length !== this.params.length) {
            throw new TypeError(`参数数量不匹配。`);
        }
        // 创建函数调用表达式
        return createFunctionCallExpression(
            this,
            args as Parameters<TSignature> & readonly Substitutable[],
        );
    }
}

/**
 * FuncExplClassWithPublicInvoke 类：函数声明的类型化实现类，第2层，将 invoke 方法公开，供 createCallableFuncExpl 使用，但是不对外暴露
 */
class FuncExplClassWithPublicInvoke<TSignature extends FuncExplSignatureBase> extends FuncExplClass<TSignature> {
    public invoke(...args: Parameters<TSignature>): Expression {
        return super.invoke(...args);
    }
}

/**
 * FuncExpl 类型：可调用的函数表达式类型
 * 这是一个混合类型，既是一个对象（继承 FuncExplBaseClass），也是一个可调用的函数
 */
export type FuncExpl<TSignature extends FuncExplSignatureBase> =
    FuncExplClass<TSignature>
    & FuncExplSignature<TSignature>;

/**
 * 创建可调用的 FuncExpl 实例
 * 通过原型注入的方式，将函数调用能力注入到对象中
 */
export const createCallableFuncExpl = <TSignature extends FuncExplSignatureBase>(
    template: TemplatePayload,
    dependencies: readonly Embeddable[],
    info: Extract<FormulaTypeInfo, { readonly type: FormulaType.Function }>,
): FuncExpl<TSignature> => {
    // 先创建 FuncExplClass 类实例
    const instance = new FuncExplClassWithPublicInvoke<TSignature>(template, dependencies, {
        id: info.name,
        params: info.params,
    });
    // 然后创建 callable 的箭头函数
    const callable = ((...args: Parameters<TSignature>) =>
        instance.invoke(...args)) as FuncExpl<TSignature>;
    // 把 instance 的原型链和属性都复制给 callable 对象，让 callable 对象看起来也像 FuncExplClass 实例一样
    Object.setPrototypeOf(callable, FuncExplClass.prototype);
    Object.assign(callable, instance);
    return callable;
};

/**
 * 创建函数调用表达式
 * 将函数调用转换为一个 Expression 对象
 */
export const createFunctionCallExpression = <TSignature extends FuncExplSignatureBase>(
    fn: FuncExplClass<TSignature>,
    args: Parameters<TSignature> & readonly Substitutable[],
): Expression => {
    const strings: string[] = [""];
    const values: Substitutable[] = [];
    values.push(fn);
    strings.push("(");    // -> Payload: `${fn}(`
    for (let index = 0; index < args.length; index += 1) {
        if (index > 0) {
            strings[strings.length - 1] += ", ";
        }
        values.push(args[index]);
        strings.push("");
    }
    strings[strings.length - 1] += ")";    // -> Payload: `${fn}(${args[0]}, ${args[1]}, ...)`
    const template: TemplatePayload = {
        strings: Object.freeze(strings),
        values: Object.freeze(values),
    };
    const dependencies = collectDependencies(template.values);
    return new Expression(template, dependencies);
};

// ============================================================================
// 并集类型
// ============================================================================

/**
 * Embeddable：可嵌入的表达式类型（可用于其他表达式中）
 */
export type Embeddable = Expression | VarExpl | FuncExplClass<FuncExplSignatureBase>;

/**
 * Substitutable：可代入模板字符串插值的值类型（原始值或可嵌入的表达式）
 */
export type Substitutable = Embeddable | PrimitiveValue;

