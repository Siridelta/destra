/**
 * Destra 核心公式基类和类型定义。
 *
 * 本文件定义了 Formula、Expl、Expr 等核心基类，以及相关的类型定义。
 * 这些是构建整个表达式系统的基础。
 */

import { type FormulaTypeInfo } from "../expr-dsl/analyzeFormulaType";
import { CtxFactoryHeadASTNode } from "../expr-dsl/parse-ast/sematics/visitor-parts/ctx-header";
import { _expr, expr } from "../factories";
import { getState } from "../state";
import { ActionStyleValue, NumericStyleValue, PointStyleValue } from "./style";
import { Embeddable, FormulaType, ImageOptions, PrimitiveValue, Substitutable, TemplatePayload } from "./types";


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

/**
 * 创建空载荷
 */
export const createEmptyTemplatePayload = (): TemplatePayload => {
    return {
        strings: Object.freeze([""]),
        values: Object.freeze([]),
    };
}

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
                    source += `\$${value.id()}\$`;
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
    public readonly regrParams: Record<string, RegrParam>;

    public constructor(template: TemplatePayload, regrParams: Record<string, RegrParam>) {
        super(template);
        this.regrParams = Object.freeze({...regrParams});
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
 * RegressionParameter：回归参数，没有内容，是一个占位符，需要嵌入唯一的 Regression 对象
 */
export class RegrParam extends Expl {
    public readonly type = FormulaType.RegressionParameter;

    public constructor(name?: string) {
        super({ strings: Object.freeze([""]), values: Object.freeze([]) });
        if (name) {
            this.id(name);
        }
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
export class FuncExplClass<TFunc extends FuncExplTFuncBase> extends FuncExplBaseClass {
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
    return _expr(template) as Expression;
};

export const isFuncExpl = <TFunc extends FuncExplTFuncBase>(formula: Formula): formula is FuncExpl<TFunc> => {
    return formula instanceof FuncExplClass && formula.type === FormulaType.Function;
}

// ============================================================================
//   CtxExp 相关类型定义和实现
// ============================================================================

export type CtxKind = 'with' | 'for' | 'sum' | 'int' | 'prod' | 'func' | 'diff';

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

declare module "../state" {
    interface CtxExpState {
        head?: CtxExpHeadState;
    }
}

export interface CtxExpHeadState {
    template: TemplatePayload;
    ast: CtxFactoryHeadASTNode;
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
// Image
// ============================================================================

export class Image extends Formula {
    public readonly type = FormulaType.Image;
    public readonly isEmbeddable = false as const;

    public readonly url: string;
    public readonly name?: string;

    // 存储完整的配置项 (包含默认值)
    public readonly options: ImageOptions;

    constructor(url: string, options?: ImageOptions) {

        options = options || {};

        // 1. 收集所有作为属性传入的表达式，以便构建依赖关系
        const deps: Substitutable[] = [];
        
        const addIfExpr = (val: NumericStyleValue | PointStyleValue | ActionStyleValue | undefined) => {
            if (val instanceof Formula) deps.push(val);
        };
        
        addIfExpr(options.center);
        addIfExpr(options.width);
        addIfExpr(options.height);
        addIfExpr(options.angle);
        addIfExpr(options.opacity);
        addIfExpr(options.onClick);

        // 2. 构造一个虚拟的 TemplatePayload 传递给基类 Formula
        // Formula 会自动解析 deps 中的依赖项，从而正确构建依赖图 DAG
        // 这样当这些属性表达式所依赖的变量改变时，Image 也会被标记为受影响（虽然 Image 本身不参与计算）
        super(createTemplatePayload(
            Object.freeze(new Array(deps.length + 1).fill("")) as any, 
            deps
        ));

        this.url = url;
        this.name = options.name;

        // 如果宽高都未指定，desmos 里宽高默认值为 10，但是 desmos 初始化图像时会根据图像宽高比手动指定一个符合比例的宽度
        // 所以我们也要手动指定宽度，否则不带宽度传入 state，desmos 会把它宽高视为 10, 10，图片会变形
        if (options.width === undefined && options.height === undefined) {
            const dimensions = tryParseDimensions(url);
            if (dimensions) {
                const [picWidth, picHeight] = dimensions;
                options.height = 10;
                options.width = expr`${picWidth} / ${picHeight} * ${options.height}` as Expression;
            }
        }

        // 3. 应用默认值
        this.options = {
            ...options
        };
    }

    protected get _content(): string {
        return `[Image ${this.name || this.url.slice(0, 20)}...]`;
    }
}

// 增加一个简单的 Base64 解析辅助函数
// 注意：这个实现只处理最常见的 PNG 和 JPEG，用于优化开发体验
const tryParseDimensions = (url: string): [number, number] | undefined => {
    if (!url.startsWith('data:image/')) return undefined;

    try {
        const base64Data = url.split(',')[1];
        if (!base64Data) return undefined;

        // 读取头部数据（只需前 1KB 即可包含头部信息）
        // atob 在现代浏览器和 Node.js (v16+) 均全局可用
        const header = atob(base64Data.slice(0, 1024));

        const getByte = (i: number) => header.charCodeAt(i);
        const getUInt16BE = (i: number) => (getByte(i) << 8) | getByte(i + 1);
        const getUInt32BE = (i: number) => (getByte(i) << 24) | (getByte(i + 1) << 16) | (getByte(i + 2) << 8) | getByte(i + 3);

        // 检测 PNG: 89 50 4E 47 ...
        if (getByte(0) === 0x89 && header.slice(1, 4) === 'PNG') {
            // PNG IHDR chunk 始于 offset 8
            // Width @ 16, Height @ 20
            return [getUInt32BE(16), getUInt32BE(20)];
        }

        // 检测 JPEG: FF D8 ...
        if (getByte(0) === 0xFF && getByte(1) === 0xD8) {
            let offset = 2;
            while (offset < header.length - 10) { // 防止越界
                const marker = getByte(offset + 1);
                // SOF0 (Baseline) = C0, SOF2 (Progressive) = C2
                if (marker === 0xC0 || marker === 0xC2) {
                    const h = getUInt16BE(offset + 5);
                    const w = getUInt16BE(offset + 7);
                    return [w, h];
                }
                // 跳过当前 segment
                offset += 2 + getUInt16BE(offset + 2);
            }
        }
    } catch (e) {
        // 解析失败则忽略，不做任何处理
    }
    return undefined;
}

// ============================================================================
// 其他
// ============================================================================

export class Dt extends Formula {
    public readonly type = FormulaType.Dt;
    public readonly isEmbeddable = true as const;

    public constructor() {
        super({ strings: Object.freeze([""]), values: Object.freeze([]) });
    }
}


