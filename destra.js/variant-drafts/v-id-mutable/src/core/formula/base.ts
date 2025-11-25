/**
 * Destra 核心公式基类和类型定义。
 *
 * 本文件定义了 Formula、Expl、Expr 等核心基类，以及相关的类型定义。
 * 这些是构建整个表达式系统的基础。
 */

import { type FormulaTypeInfo } from "../expr-dsl/analyzeType";
import { getState } from "../state";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 原始值类型：字符串、数字、布尔值、null、undefined
 */
export type PrimitiveValue =
    | string
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
    public readonly deps: readonly Embeddable[];
    public abstract readonly type: FormulaType;

    /**
     * console-side 可用的一个可以直观展示公式内容的 getter 方法
     * （其实这里和 analyzeType.ts 里的 buildInspectableSource 函数是部分重复的，
     * 但是在逻辑上应该不会有关联，所以也就重复写了）
     * 这里会把 placeholder 替换为依赖项（dependencies，整理、缩并过的，而非模板载荷里的 values）的索引
     * 对于非 dependencies 里的值，则直接使用其 toString() 结果
     */
    protected get _content(): string {
        const { strings, values } = this.template;
        let source = strings[0]!;
        for (let i = 0; i < values.length; i += 1) {
            (() => {
                const value = values[i];
                if (!(value instanceof Formula)) {
                    source += value.toString();
                    return;
                }
                if (value instanceof Expl && value.id()) {
                    source += `\$${value.id()}`;
                    return;
                }
                const depIndex = this.deps.findIndex(dep => dep === value);
                source += `\$${depIndex}`;
            })();
            source += strings[i + 1]!;
        }
        return source.trim();
    }

    protected constructor(template: TemplatePayload) {
        this.template = template;
        this.deps = Object.freeze(collectDependencies(template.values));
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

    /**
     * [Internal Stub] 获取 ID
     * 将由 id.ts 模块通过原型注入覆盖
     */
    protected get _id(): string | undefined {
        return undefined;
    }

    /**
     * [Internal Stub] 获取 Realname
     * 将由 id.ts 模块通过原型注入覆盖
     */
    protected get _realname(): string | undefined {
        return undefined;
    }

    protected constructor(template: TemplatePayload) {
        super(template);
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

    public constructor(template: TemplatePayload) {
        super(template);
    }
}

/**
 * ExplicitEquation：显式方程，不可嵌入
 */
export class ExplicitEquation extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.ExplicitEquation;

    public constructor(template: TemplatePayload) {
        super(template);
    }
}

/**
 * ImplicitEquation：隐式方程，不可嵌入
 */
export class ImplicitEquation extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.ImplicitEquation;

    public constructor(template: TemplatePayload) {
        super(template);
    }
}

/**
 * Regression：回归表达式，不可嵌入
 */
export class Regression extends Expr {
    public readonly isEmbeddable = false as const;
    public readonly type = FormulaType.Regression;

    public constructor(template: TemplatePayload) {
        super(template);
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

    public constructor(template: TemplatePayload) {
        super(template);
    }
}

/**
 * FuncExpl 相关类型定义和实现
 */

// 函数签名的基类型
export type FuncExplTFuncBase = (...args: readonly Substitutable[]) => Expression;

// 函数签名的泛型类型
export type FuncExplFunc<TFunc extends FuncExplTFuncBase> = ((
    ...args: Parameters<TFunc> & readonly Substitutable[]
) => Expression);

/**
 * FuncExpl 基类：函数声明的内部实现类
 */
class FuncExplBaseClass extends Expl {
    public readonly type = FormulaType.Function;
    public readonly params: readonly string[];

    public constructor(
        template: TemplatePayload,
        options: { readonly params: readonly string[] },
    ) {
        super(template);
        this.params = Object.freeze([...options.params]);
    }
}

/**
 * FuncExplClass 类：函数声明的类型化实现类，第1层，加上带函数签名信息的泛型类型，
 * 以及加上 protected 的 invoke 方法（不对外暴露），这个类在加入后面的 type 混合类型后对外暴露
 * 
 * TFunc 只用于存储函数签名的类型信息，其返回值类型信息我们不使用
 * （实际返回的一定将会是 Expression 类型而不是它的子类型）
 */
class FuncExplClass<TFunc extends FuncExplTFuncBase> extends FuncExplBaseClass {
    protected invoke(funcExpl: FuncExpl<TFunc>, ...args: Parameters<TFunc>): Expression {
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
            funcExpl,
            args as Parameters<TFunc> & readonly Substitutable[],
        );
    }
}

/**
 * FuncExplClassWithPublicInvoke 类：函数声明的类型化实现类，第2层，将 invoke 方法公开，供 createCallableFuncExpl 使用，但是不对外暴露
 */
class FuncExplClassWithPublicInvoke<TFunc extends FuncExplTFuncBase> extends FuncExplClass<TFunc> {
    public invoke(funcExpl: FuncExpl<TFunc>, ...args: Parameters<TFunc>): Expression {
        return super.invoke(funcExpl, ...args);
    }
}

/**
 * FuncExpl 类型：可调用的函数表达式类型
 * 这是一个混合类型，既是一个对象（继承 FuncExplBaseClass），也是一个可调用的函数
 */
export type FuncExpl<TFunc extends FuncExplTFuncBase> =
    FuncExplClass<TFunc>
    & FuncExplFunc<TFunc>;

/**
 * 创建可调用的 FuncExpl 实例
 * 通过原型注入的方式，将函数调用能力注入到对象中
 */
export const createCallableFuncExpl = <TFunc extends FuncExplTFuncBase>(
    template: TemplatePayload,
    info: Extract<FormulaTypeInfo, { readonly type: FormulaType.Function }>,
): FuncExpl<TFunc> => {
    // 先创建 FuncExplClass 类实例
    const instance = new FuncExplClassWithPublicInvoke<TFunc>(template, {
        params: info.params,
    });
    if (info.name) {
        instance.id(info.name);
    }
    // 然后创建 funcExpl 箭头函数
    // Intentionally pass the funcExpl obj into invoke, let internal knows it and use it to build the Expression
    // so the resulting Expression is dependent on a 'FuncExpl' (?) and would not see a 'FuncExplClassWithPublicInvoke'
    // This is for console-side DevEx.
    const funcExpl = ((...args: Parameters<TFunc>) =>
        instance.invoke(funcExpl, ...args)) as FuncExpl<TFunc>;
    // 把 instance 的原型链和属性都复制给 funcExpl 对象，让 funcExpl 对象看起来也像 FuncExplClass 实例一样
    Object.assign(funcExpl, instance);
    Object.setPrototypeOf(funcExpl, FuncExplClass.prototype);
    return funcExpl;
};

/**
 * 创建函数调用表达式
 * 将函数调用转换为一个 Expression 对象
 */
export const createFunctionCallExpression = <TFunc extends FuncExplTFuncBase>(
    fn: FuncExpl<TFunc>,
    args: Parameters<TFunc> & readonly Substitutable[],
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
    return new Expression(template);
};

// ============================================================================
// CtxExp 相关类型定义和实现
// ============================================================================

export type CtxKind = 'with' | 'for' | 'sum' | 'int' | 'func';

export type CtxExpBody = PrimitiveValue | Expression | VarExpl;

export const isCtxExpBody = (body: unknown): body is CtxExpBody => {
    if (isPrimitive(body)) {
        return true;
    }
    if (body instanceof Expression || body instanceof VarExpl) {
        return true;
    }
    return false;
}

/**
 * 上下文表达式接口
 */
export interface CtxExp extends Formula {
    readonly ctxVars: readonly CtxVar[];
    readonly body: CtxExpBody;
    readonly ctxKind: CtxKind;
}

declare module "../state" {
    interface CtxVarState {
        sourceCtx?: CtxExp;
    }
}

/**
 * 上下文变量类
 */
export class CtxVar extends Formula {
    public readonly type = FormulaType.ContextVariable;
    public readonly isEmbeddable = true as const;

    // Context variable name
    public readonly name: string;
    /**
     * The context statement that this context variable is defined in
     * 注意：在 ctxVar 的合法使用范围内，其所属的 CtxExp 对象永远尚未完成创建。
     * 因此，在 ctx 回调内访问 sourceCtx 永远返回 undefined。
     * 此功能仅用于上下文语句构建完成后记录依赖关系，可供查询。
     */
    public get sourceCtx(): CtxExp | undefined {
        return getState(this).ctxVar?.sourceCtx;
    }

    constructor(name: string) {
        super({ strings: Object.freeze([""]), values: Object.freeze([]) });
        this.name = name;
    }

    protected get _content(): string {
        return this.name;
    }
}

/**
 * 上下文语句纯表达式类：Sum, Int, For, With 工厂的返回类型
 */
export class CtxExpression extends Expression implements CtxExp {
    public readonly ctxVars: readonly CtxVar[];
    public readonly body: CtxExpBody;
    public readonly ctxKind: CtxKind;

    constructor(
        template: TemplatePayload, 
        ctxVars: readonly CtxVar[], 
        body: CtxExpBody,
        ctxKind: CtxKind
    ) {
        super(template);
        // 运行时检查 body
        if (!isCtxExpBody(body)) {
            throw new TypeError(`上下文语句体必须为原始值、表达式或变量声明。`);
        }
        this.ctxVars = ctxVars;
        this.body = body;
        this.ctxKind = ctxKind;
    }
}

/**
 * 上下文语句变量声明类：expl.Sum, expl.Int, expl.For, expl.With 工厂的返回类型
 */
export class CtxVarExpl extends VarExpl implements CtxExp {
    public readonly ctxVars: readonly CtxVar[];
    public readonly body: CtxExpBody;
    public readonly ctxKind: CtxKind;

    constructor(
        template: TemplatePayload, 
        ctxVars: readonly CtxVar[], 
        body: CtxExpBody,
        ctxKind: CtxKind
    ) {
        super(template);
        // 运行时检查 body
        if (!isCtxExpBody(body)) {
            throw new TypeError(`上下文语句体必须为原始值、表达式或变量声明。`);
        }
        this.ctxVars = ctxVars;
        this.body = body;
        this.ctxKind = ctxKind;
    }
}

/**
 * 上下文语句函数声明类：Func 工厂的返回类型
 */
class CtxFuncExplClass<TFunc extends FuncExplTFuncBase> extends FuncExplClass<TFunc> implements CtxExp {
    public readonly ctxVars: readonly CtxVar[];
    public readonly body: CtxExpBody;
    public readonly ctxKind = 'func' as const;

    constructor(
        template: TemplatePayload,
        options: { readonly params: readonly string[] },
        ctxVars: readonly CtxVar[],
        body: CtxExpBody
    ) {
        super(template, options);
        // 运行时检查 body
        if (!isCtxExpBody(body)) {
            throw new TypeError(`上下文语句体必须为原始值、表达式或变量声明。`);
        }
        this.ctxVars = ctxVars;
        this.body = body;
    }
}

/**
 * CtxFuncExplClassWithPublicInvoke 类：CtxFuncExplClass 的辅助类，公开 invoke 方法
 */
class CtxFuncExplClassWithPublicInvoke<TFunc extends FuncExplTFuncBase> extends CtxFuncExplClass<TFunc> {
    public invoke(funcExpl: FuncExpl<TFunc>, ...args: Parameters<TFunc>): Expression {
        return super.invoke(funcExpl, ...args);
    }
}

/**
 * CtxFuncExpl 类型
 */
export type CtxFuncExpl<TFunc extends FuncExplTFuncBase> = 
    CtxFuncExplClass<TFunc> 
    & FuncExplFunc<TFunc>;

/**
 * 创建可调用的 CtxFuncExpl 实例
 */
export const createCallableCtxFuncExpl = <TFunc extends FuncExplTFuncBase>(
    template: TemplatePayload,
    params: readonly string[],
    ctxVars: readonly CtxVar[],
    body: CtxExpBody
): CtxFuncExpl<TFunc> => {
    const instance = new CtxFuncExplClassWithPublicInvoke<TFunc>
        (template, { params }, ctxVars, body);

    const funcExpl = ((...args: Parameters<TFunc>) => 
        instance.invoke(funcExpl as any, ...args)) as CtxFuncExpl<TFunc>;
    
    Object.assign(funcExpl, instance);
    Object.setPrototypeOf(funcExpl, CtxFuncExplClass.prototype);
    return funcExpl;
}

// 要求：所有 CtxExp 创建时不要绕过 CtxExp 接口内各属性的存在性检查，以保证类型安全
export const isCtxExp = (formula: Formula): formula is CtxExp => {
    return 'ctxKind' in formula && formula.ctxKind !== undefined;
}

// ============================================================================
// 并集类型
// ============================================================================

/**
 * Embeddable：可嵌入的表达式类型（可用于其他表达式中）
 */
export type Embeddable = Expression | VarExpl | FuncExplClass<FuncExplTFuncBase> | CtxVar;

/**
 * Substitutable：可代入模板字符串插值的值类型（原始值或可嵌入的表达式）
 */
export type Substitutable = Embeddable | PrimitiveValue;
