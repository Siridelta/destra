

/**
 * Destra 核心表达式基础设施。
 *
 * 本文件根据默认模式的"简化计算模型"与"核心 API 与命名机制"方案，
 * 将 `expr` / `expl` 重构为面向对象的三层继承体系，并构建最小可行的
 * 解析器、类型判定和运行时校验逻辑。后续的 ID 体系、批量操作等能力
 * 将在此基础上逐步扩展。
 */

import { createRegExp, exactly, letter, wordChar, anyOf, maybe, whitespace, charNotIn } from "magic-regexp";

type PrimitiveValue = string | number | boolean | null | undefined;

export interface TemplatePayload {
    readonly strings: readonly string[];
    readonly values: readonly Substitutable[];
}

export interface IdMetadata {
    value?: string;
    isImplicit: boolean;
}

export enum FormulaType {
    Expression = "expression",
    Variable = "variable",
    Function = "function",
    ExplicitEquation = "explicit-equation",
    ImplicitEquation = "implicit-equation",
    Regression = "regression",
}

type FormulaTypesOfExpr = 
    | FormulaType.Expression
    | FormulaType.ExplicitEquation
    | FormulaType.ImplicitEquation
    | FormulaType.Regression;

type FormulaTypesOfExpl = 
    | FormulaType.Variable
    | FormulaType.Function;

export type FormulaTypeInfo = 
    | {
        readonly type: FormulaType.Expression;
    }
    | {
        readonly type: FormulaType.ExplicitEquation;
        readonly lhsName: string;
    }
    | {
        readonly type: FormulaType.ImplicitEquation;
    }
    | {
        readonly type: FormulaType.Regression;
    }
    | {
        readonly type: FormulaType.Variable;
        readonly name?: string;
    }
    | {
        readonly type: FormulaType.Function;
        readonly name?: string;
        readonly params: readonly string[];
    }

type FormulaTypeInfoOfExpr = Extract<FormulaTypeInfo, { 
    readonly type: FormulaType.Expression | FormulaType.ExplicitEquation | FormulaType.ImplicitEquation | FormulaType.Regression 
}>;

type FormulaTypeInfoOfExpl = Extract<FormulaTypeInfo, { 
    readonly type: FormulaType.Variable | FormulaType.Function 
}>;

// --- Regex Definitions ---

// 大致界定 Expr DSL 中表达式内容的字符范围
const expressionContentPattern =
    anyOf(
        wordChar, whitespace,
        exactly("+"), exactly("-"), exactly("*"), exactly("/"), exactly("^"), exactly("%"), exactly("!"),
        exactly("("), exactly(")"), exactly("["), exactly("]"), exactly("{"), exactly("}"),
        exactly("."), exactly(","), exactly(":"),
        "=", "<", ">",
    ).times.any();

// 定义 base 名称片段的合法范围（= 函数参数名的合法范围、ID 片段的合法范围）。
// 规则：以字母或下划线开头，后续可以是字母、数字或下划线。
const nameBasePattern = anyOf(letter, "_").and(wordChar.times.any());
const paramNamePattern = nameBasePattern;

// 定义 ID 的合法范围。
// 规则：一个或多个参数名，用点号 "." 连接。
// 例如： a, a_b, a.b, a.b.c
const idPattern = paramNamePattern.and(
    exactly(".").and(paramNamePattern).times.any(),
);

// 箭头函数头：匹配 "(x, y) =>" 或 "x =>" 或前面有函数名赋值部分 "id = " 等形式
// 结构为：可选的函数名赋值部分 "id = "，然后是参数列表（括号包裹或单个参数），最后是 "=>"
const arrowFunctionHeadPattern =
    whitespace.times.any()
        .at.lineStart()
        .and(
            maybe(
                idPattern.groupedAs("functionName")
                    .and(whitespace.times.any())
                    .and(exactly("="))
            )
        )
        .and(whitespace.times.any())
        .and(
            anyOf(
                // 匹配括号包裹的参数列表："(x, y)"
                exactly("(")
                    .and(charNotIn(")").times.any().groupedAs("params"))
                    .and(exactly(")")),
                // 匹配单个参数：x
                paramNamePattern.groupedAs("params"),
            ),
        )
        .and(whitespace.times.any())
        .and(exactly("=>"))

// 具名函数定义：匹配 "f(x) = ..." 形式
const namedFunctionDefinitionPattern =
    whitespace.times.any()
        .at.lineStart()
        .and(idPattern.groupedAs("name"))
        .and(whitespace.times.any())
        .and(exactly("("))
        .and(charNotIn(")").times.any().groupedAs("params"))
        .and(exactly(")"))
        .and(whitespace.times.any())
        .and(exactly("="))
        .and(expressionContentPattern);

// 变量赋值：匹配 "id = ..." 形式
const assignmentLikePattern =
    whitespace.times.any()
        .at.lineStart()
        .and(idPattern.groupedAs("lhsName"))
        .and(whitespace.times.any())
        .and(exactly("="))
        .and(expressionContentPattern);

// 回归符号：匹配 "~"
const regressionPattern =
    expressionContentPattern
        .and(exactly("~"))
        .and(expressionContentPattern);

// 方程符号：匹配 "="; 但也会匹配到变量赋值语法中的 "="，需要进一步区分。
const equationOperatorPattern = exactly("=").notBefore(exactly("=")).notAfter(exactly("="));

// 不等式符号：匹配 ">=", "<=", ">" (但后面不能是 "=" 或 "=>"), "<" (但后面不能是 "=")
const inequalityPattern =
    anyOf("<=", ">=", "<", ">")
        .notBefore(anyOf("=", ">", "<"))
        .notAfter(anyOf("=", ">", "<"));

// 编译正则表达式
const expressionContentRegex = createRegExp(expressionContentPattern);
const paramNameRegex = createRegExp(paramNamePattern);
const idRegex = createRegExp(idPattern);
const arrowFunctionHeadRegex = createRegExp(arrowFunctionHeadPattern);
const namedFunctionDefinitionRegex = createRegExp(namedFunctionDefinitionPattern);
const variableAssignmentRegex = createRegExp(assignmentLikePattern);
const regressionRegex = createRegExp(regressionPattern);
const equationOperatorRegex = createRegExp(equationOperatorPattern);
const inequalityRegex = createRegExp(inequalityPattern);

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

const isSubstitutable = (value: unknown): value is Substitutable => {
    if (isPrimitive(value)) {
        return true;
    }
    if (value instanceof Formula && value.isEmbeddable) {
        return true;
    }
    return false;
};

const createTemplatePayload = (
    strings: TemplateStringsArray,
    values: readonly Substitutable[],
): TemplatePayload => {
    // 为 JS 环境增加运行时检查
    for (const value of values) {
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

const buildInspectableSource = (payload: TemplatePayload): string => {
    const { strings, values } = payload;
    let source = strings[0]!;
    for (let index = 0; index < values.length; index += 1) {
        source += `\${${index}}`;
        source += strings[index + 1]!;
    }
    return source.trim();
};

/**
 * 提取参数列表
 * "a, b, c" 提取为 ["a", "b", "c"]
 * "a" 提取为 ["a"]
 * 如果输入不合法会抛出 TypeError
 * @param rawParams 原始参数列表字符串。
 * @returns 参数列表。
*/
const extractParameters = (rawParams: string): string[] => {
    const params = rawParams
        .split(",")
        .map((param) => param.trim())
    if (params.length === 0)
        throw new TypeError("函数参数列表语法错误。");
    if (params[params.length - 1] === "")
        params.pop();
    if (params.length === 0)
        throw new TypeError("函数参数列表语法错误。");
    params.forEach((param, index) => {
        if (param.length === 0 && index !== params.length - 1)
            throw new TypeError("函数参数列表语法错误。");
    });
    return params;
};

function analyzeType(payload: TemplatePayload, factoryType: "expr"): FormulaTypeInfoOfExpr;
function analyzeType(payload: TemplatePayload, factoryType: "expl"): FormulaTypeInfoOfExpl;
function analyzeType (
    payload: TemplatePayload,
    factoryType: "expr" | "expl",
): FormulaTypeInfo {
    const source = buildInspectableSource(payload);
    // 首先检查符号是否都在大致的合法范围内，如果不合法则抛出 TypeError。
    if (!expressionContentRegex.test(source)) {
        throw new TypeError("检测到非法符号。");
    }
    // 首先匹配掉回归表达式，具有可辨识的`~`符号。
    if (regressionRegex.test(source)) {
        if (factoryType === "expl")
            throw new TypeError("不能用 `expl` 创建回归表达式。");
        return { type: FormulaType.Regression };
    }
    // 然后匹配掉箭头函数式的函数定义语法，具有可辨识的`=>`符号以及函数参数列表。
    // arrowHead 包括 "(x, y) =>" 和 "x =>"，前面可能有 "f = "，两种形式。
    // 分别将匹配到："x, y" 和 "x"
    const arrowHead = source.match(arrowFunctionHeadRegex);
    if (arrowHead) {
        // 括号包裹的参数列表 / 单个参数名
        const params = arrowHead.groups.params!;
        if (factoryType === "expr")
            throw new TypeError("不能用 `expr` 创建函数。");
        return { type: FormulaType.Function, params: extractParameters(params) };
    }
    // 然后匹配掉具名函数式的函数定义语法，为 "f(x) = x^2" 这样的形式。
    const namedFunction = source.match(namedFunctionDefinitionRegex);
    if (namedFunction) {
        const name = namedFunction.groups.name!;
        const params = namedFunction.groups.params!;
        if (factoryType === "expr")
            throw new TypeError("不能用 `expr` 创建函数。");
        return { type: FormulaType.Function, name, params: extractParameters(params) };
    }
    // 然后匹配掉变量赋值语法，为 "a = 3" 这样的形式；
    // 如果使用 expl 创造，则为变量定义；
    // 如果使用 expr 创造，则为显式方程。
    const assignment = source.match(variableAssignmentRegex);
    if (assignment) {
        const lhsName = assignment.groups.lhsName!;
        if (factoryType === "expr")
            return { type: FormulaType.ExplicitEquation, lhsName };
        else // factoryType === "expl"
            return { type: FormulaType.Variable, name: lhsName };
    }
    // 然后匹配掉不等式语法，为 ">=", "<=", ">", "<" 这样的形式。
    if (inequalityRegex.test(source)) {
        if (factoryType === "expl")
            throw new TypeError("不能用 `expl` 创建不等式。");
        return { type: FormulaType.ImplicitEquation };
    }
    // 然后匹配掉等号 "="，在排除掉变量赋值语法后即为隐式方程。
    if (equationOperatorRegex.test(source)) {
        if (factoryType === "expl")
            throw new TypeError("不能用 `expl` 创建隐式方程。");
        return { type: FormulaType.ImplicitEquation };
    }
    // 如果都不是则为纯表达式或未定 ID 的变量。
    if (factoryType === "expr")
        return { type: FormulaType.Expression };
    else // factoryType === "expl"
        return { type: FormulaType.Variable };
};

export abstract class Formula {
    public readonly template: TemplatePayload;
    public readonly dependencies: readonly Embeddable[];

    protected constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        // 使用运行时检查来保证依赖项为 EmbeddableExpr
        this.template = template;
        const embeddable: Embeddable[] = [];
        for (const dependency of dependencies) {
            if (!dependency.isEmbeddable) {
                throw new TypeError("检测到不可嵌入的依赖，违反“禁止悬空依赖”约束。");
            }
            embeddable.push(dependency as Embeddable);
        }
        this.dependencies = Object.freeze(embeddable);
    }

    public abstract readonly isEmbeddable: boolean;

    public style(): this {
        return this;
    }
}

export abstract class Expl extends Formula {
    public readonly idMeta: IdMetadata;

    protected constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
        this.idMeta = { isImplicit: false };
    }

    public readonly isEmbeddable = true as const;

    public id(value: string, isImplicit = false): this {
        if (!value) {
            throw new TypeError("ID 不能为空字符串。");
        }
        this.idMeta.value = value;
        this.idMeta.isImplicit = isImplicit;
        return this;
    }
}

export abstract class Expr extends Formula { }

export class Expression extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }

    public readonly isEmbeddable = true as const;
}

export class ExplicitEquation extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }

    public readonly isEmbeddable = false as const;
}

export class ImplicitEquation extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }

    public readonly isEmbeddable = false as const;
}

export class Regression extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[]) {
        super(template, dependencies);
    }

    public readonly isEmbeddable = false as const;
}

export class VarExpl extends Expl {
    public readonly name?: string;

    public constructor(template: TemplatePayload, dependencies: readonly Embeddable[], name?: string) {
        super(template, dependencies);
        this.name = name;
    }
}

class FuncExplBaseClass extends Expl{
    public readonly name?: string;
    public readonly params: readonly string[];

    public constructor(
        template: TemplatePayload,
        dependencies: readonly Embeddable[],
        options: { readonly name?: string; readonly params: readonly string[] },
    ) {
        super(template, dependencies);
        this.name = options.name;
        this.params = Object.freeze([...options.params]);
    }
}
type FuncExplSignatureBase = (...args: readonly Substitutable[]) => Expression;
type FuncExplSignature<TSignature extends FuncExplSignatureBase> = ((...args: Parameters<TSignature> & readonly Substitutable[]) => Expression);

// TSignature 只用于存储函数签名的类型信息，其返回值类型信息我们不使用（实际返回的一定将会是 Expression 类型而不是它的子类型）。
class FuncExplClass<TSignature extends FuncExplSignatureBase> extends FuncExplBaseClass {
    public invoke(...args: Parameters<TSignature>): Expression {
        // runtime-check args extends Substitutable[]
        args.forEach((arg, index) => {
            if (!isSubstitutable(arg)) {
                throw new TypeError(`参数 ${arg} (index: ${index}) 不是可代入项。`);
            }
        });
        if (args.length !== this.params.length) {
            throw new TypeError(`参数数量不匹配。`);
        }
        return createFunctionCallExpression(this, args as Parameters<TSignature> & readonly Substitutable[]);
    }
}
export type FuncExpl<TSignature extends FuncExplSignatureBase> = Omit<FuncExplClass<TSignature>, "invoke"> & FuncExplSignature<TSignature>;

export type Embeddable = Expression | VarExpl | FuncExpl<FuncExplSignatureBase>;
export type Substitutable = Embeddable | PrimitiveValue;

const collectDependencies = (values: readonly Substitutable[]): Embeddable[] => {
    const set = new Set<Embeddable>();
    for (const value of values) {
        if (value instanceof Formula) {
            set.add(value);
        }
    }
    return Array.from(set);
};

const createCallableFuncExpl = <TSignature extends FuncExplSignatureBase>(
    template: TemplatePayload,
    dependencies: readonly Embeddable[],
    info: Extract<FormulaTypeInfo, { readonly type: FormulaType.Function }>,
): FuncExpl<TSignature> => {
    const instance = new FuncExplClass<TSignature>(template, dependencies, {
        name: info.name,
        params: info.params,
    });
    const callable = ((...args: Parameters<TSignature>) => instance.invoke(...args)) as FuncExpl<TSignature>;
    Object.setPrototypeOf(callable, FuncExplBaseClass.prototype);
    Object.assign(callable, instance);
    return callable;
};

const createFunctionCallExpression = <TSignature extends FuncExplSignatureBase>(fn: FuncExplClass<TSignature>, args: Parameters<TSignature> & readonly Substitutable[]): Expression => {
    const strings: string[] = [""];
    const values: Substitutable[] = [];
    values.push(fn);
    strings.push("(");
    for (let index = 0; index < args.length; index += 1) {
        if (index > 0) {
            strings[strings.length - 1] += ", ";
        }
        values.push(args[index]);
        strings.push("");
    }
    strings[strings.length - 1] += ")";
    const template: TemplatePayload = {
        strings: Object.freeze(strings),
        values: Object.freeze(values),
    };
    const dependencies = collectDependencies(template.values);
    return new Expression(template, dependencies);
};

export const expr = (
    strings: TemplateStringsArray,
    ...values: Substitutable[]
): Expr => {
    const template = createTemplatePayload(strings, values);
    const dependencies = collectDependencies(template.values);
    const info = analyzeType(template, "expr");
    switch (info.type) {
        case FormulaType.Expression:
            return new Expression(template, dependencies);
        case FormulaType.ExplicitEquation:
            return new ExplicitEquation(template, dependencies);
        case FormulaType.ImplicitEquation:
            return new ImplicitEquation(template, dependencies);
        case FormulaType.Regression:
            return new Regression(template, dependencies);
    }
};

export const expl = (
    strings: TemplateStringsArray,
    ...values: Substitutable[]
): Expl => {
    const template = createTemplatePayload(strings, values);
    const dependencies = collectDependencies(template.values);
    const info = analyzeType(template, "expl");
    switch (info.type) {
        case FormulaType.Variable:
            return new VarExpl(template, dependencies, info.name);
        case FormulaType.Function:
            return createCallableFuncExpl(template, dependencies, info);
    }
};



// const f1 = expl`(x, y) => x^2 + y^2` as FuncExpl<(x: Substitutable, y: Substitutable) => Expression>
// f1(1, 2);