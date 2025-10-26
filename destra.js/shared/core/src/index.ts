/**
 * Destra 核心表达式基础设施。
 *
 * 本文件根据默认模式的“简化计算模型”与“核心 API 与命名机制”方案，
 * 将 `expr` / `expl` 重构为面向对象的三层继承体系，并构建最小可行的
 * 解析器、类型判定和运行时校验逻辑。后续的 ID 体系、批量操作等能力
 * 将在此基础上逐步扩展。
 */

const FORMULA_BRAND = Symbol("destra.core.formula");

type PrimitiveValue = string | number | boolean | null | undefined;

interface FormulaLike {
    readonly [FORMULA_BRAND]: true;
}

type TemplateValue = PrimitiveValue | FormulaLike;

export interface TemplatePayload {
    readonly strings: readonly string[];
    readonly values: readonly TemplateValue[];
}

export interface IdMetadata {
    value?: string;
    isImplicit: boolean;
}

export enum FormulaType {
    Expression = "expression",
    Function = "function",
    ExplicitEquation = "explicit-equation",
    ImplicitEquation = "implicit-equation",
    Regression = "regression",
}

export type FormulaTypeInfo =
    | {
        readonly type: FormulaType.Expression;
        readonly name?: string;
    }
    | {
        readonly type: FormulaType.Function;
        readonly name?: string;
        readonly params: readonly string[];
    }
    | {
        readonly type: FormulaType.ExplicitEquation;
    }
    | {
        readonly type: FormulaType.ImplicitEquation;
    }
    | {
        readonly type: FormulaType.Regression;
    };

const ARROW_FUNCTION_HEAD = /^(?:\s*[A-Za-z][\w\.]*\s*=\s*)?\s*(\([^)]*\)|[A-Za-z][\w\.]*)\s*=>/;
const NAMED_FUNCTION_DEFINITION = /^\s*([A-Za-z][\w\.]*)\s*\(([^)]*)\)\s*=/;
const VARIABLE_ASSIGNMENT = /^\s*([A-Za-z][\w\.]*)\s*=/;
const REGRESSION_PATTERN = /~/;
const INEQUALITY_PATTERN = /(?:<=|>=|<(?!\s*=)|>(?!\s*=>))/;

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

const isFormulaLike = (value: unknown): value is FormulaLike => {
    if (!value) {
        return false;
    }
    if (typeof value !== "object") {
        return false;
    }
    return Boolean((value as Record<symbol, unknown>)[FORMULA_BRAND]);
};

const createTemplatePayload = (
    strings: TemplateStringsArray,
    values: readonly unknown[],
): TemplatePayload => {
    const normalizedStrings = Array.from(strings);
    const normalizedValues = values.map((value) => {
        if (isPrimitive(value)) {
            return value;
        }
        if (isFormulaLike(value)) {
            return value;
        }
        throw new TypeError("模板字符串插值仅支持原始值或表达式对象，请检查传入内容。");
    });
    return {
        strings: Object.freeze(normalizedStrings),
        values: Object.freeze(normalizedValues),
    };
};

const buildInspectableSource = (payload: TemplatePayload): string => {
    const { strings, values } = payload;
    let source = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
        source += `\${${index}}`;
        source += strings[index + 1] ?? "";
    }
    return source.trim();
};

const extractParameters = (rawParams: string): string[] => {
    if (!rawParams) {
        return [];
    }
    return rawParams
        .split(",")
        .map((param) => param.trim())
        .filter((param) => param.length > 0);
};

const analyzeType = (payload: TemplatePayload): FormulaTypeInfo => {
    const source = buildInspectableSource(payload);
    if (!source) {
        return { type: FormulaType.Expression };
    }
    if (REGRESSION_PATTERN.test(source)) {
        return { type: FormulaType.Regression };
    }
    const arrowHead = source.match(ARROW_FUNCTION_HEAD);
    if (arrowHead) {
        const head = arrowHead[1];
        if (head.startsWith("(") && head.endsWith(")")) {
            const params = extractParameters(head.slice(1, -1));
            return { type: FormulaType.Function, params };
        }
        return { type: FormulaType.Function, params: [head] };
    }
    const namedFunction = source.match(NAMED_FUNCTION_DEFINITION);
    if (namedFunction) {
        const [, name, rawParams] = namedFunction;
        return { type: FormulaType.Function, name, params: extractParameters(rawParams) };
    }
    if (INEQUALITY_PATTERN.test(source)) {
        return { type: FormulaType.ImplicitEquation };
    }
    if (source.includes("=")) {
        const assignment = source.match(VARIABLE_ASSIGNMENT);
        if (assignment) {
            const [, name] = assignment;
            return { type: FormulaType.Expression, name };
        }
        return { type: FormulaType.ExplicitEquation };
    }
    return { type: FormulaType.Expression };
};

export abstract class Formula implements FormulaLike {
    public readonly [FORMULA_BRAND] = true as const;
    public readonly template: TemplatePayload;
    public readonly dependencies: readonly EmbeddableExpr[];

    protected constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        // 使用运行时检查来保证依赖项为 EmbeddableExpr
        this.template = template;
        const embeddable: EmbeddableExpr[] = [];
        for (const dependency of dependencies) {
            if (!dependency.isEmbeddable) {
                throw new TypeError("检测到不可嵌入的依赖，违反“禁止悬空依赖”约束。");
            }
            embeddable.push(dependency as EmbeddableExpr);
        }
        this.dependencies = Object.freeze(embeddable);
    }

    public abstract get isEmbeddable(): boolean;

    public style(): this {
        return this;
    }
}

export abstract class Expl extends Formula {
    public readonly idMeta: IdMetadata;

    protected constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        super(template, dependencies);
        this.idMeta = { isImplicit: false };
    }

    public override get isEmbeddable(): boolean {
        return true;
    }

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
    public constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        super(template, dependencies);
    }

    public override get isEmbeddable(): boolean {
        return true;
    }
}

export class ExplicitEquation extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        super(template, dependencies);
    }

    public override get isEmbeddable(): boolean {
        return false;
    }
}

export class ImplicitEquation extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        super(template, dependencies);
    }

    public override get isEmbeddable(): boolean {
        return false;
    }
}

export class Regression extends Expr {
    public constructor(template: TemplatePayload, dependencies: readonly Formula[]) {
        super(template, dependencies);
    }

    public override get isEmbeddable(): boolean {
        return false;
    }
}

export class VarExpl extends Expl {
    public readonly name?: string;

    public constructor(template: TemplatePayload, dependencies: readonly Formula[], name?: string) {
        super(template, dependencies);
        this.name = name;
    }
}

export class FuncExpl<TSignature extends (...args: Substitutable[]) => Expression> extends Expl {
    public readonly name?: string;
    public readonly params: readonly string[];

    public constructor(
        template: TemplatePayload,
        dependencies: readonly Formula[],
        options: { readonly name?: string; readonly params: readonly string[] },
    ) {
        super(template, dependencies);
        this.name = options.name;
        this.params = Object.freeze([...options.params]);
    }

    public invoke(...args: Substitutable[]): Expression {
        return createFunctionCallExpression(this, args);
    }
}

export type EmbeddableExpr = Expression | VarExpl | FuncExpl<any>;

export type Substitutable = EmbeddableExpr | PrimitiveValue;

const collectDependencies = (values: readonly TemplateValue[]): Formula[] => {
    const set = new Set<Formula>();
    for (const value of values) {
        if (value instanceof Formula) {
            set.add(value);
        }
    }
    return Array.from(set);
};

const createFunctionCallExpression = (fn: FuncExpl<any>, args: readonly Substitutable[]): Expression => {
    const strings: string[] = [""];
    const values: TemplateValue[] = [];
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

const createCallableFuncExpl = <TSignature extends (...args: Substitutable[]) => Expression>(
    template: TemplatePayload,
    dependencies: readonly Formula[],
    info: Extract<FormulaTypeInfo, { readonly type: FormulaType.Function }>,
): FuncExpl<TSignature> & TSignature => {
    const instance = new FuncExpl<TSignature>(template, dependencies, {
        name: info.name,
        params: info.params,
    });
    const callable = ((...args: Substitutable[]) => instance.invoke(...args)) as FuncExpl<TSignature> & TSignature;
    Object.setPrototypeOf(callable, FuncExpl.prototype);
    Object.assign(callable, instance);
    return callable;
};

export const expr = (
    strings: TemplateStringsArray,
    ...values: unknown[]
): Expr => {
    const template = createTemplatePayload(strings, values);
    const dependencies = collectDependencies(template.values);
    const info = analyzeType(template);
    switch (info.type) {
        case FormulaType.Expression:
            if (!info.name) {
                return new Expression(template, dependencies);
            } else {
                throw new TypeError("`expr` 不支持创建变量定义，请改用 `expl`。");
            }
        case FormulaType.ExplicitEquation:
            return new ExplicitEquation(template, dependencies);
        case FormulaType.ImplicitEquation:
            return new ImplicitEquation(template, dependencies);
        case FormulaType.Regression:
            return new Regression(template, dependencies);
        case FormulaType.Function:
            throw new TypeError("`expr` 不支持创建函数定义，请改用 `expl`。");
    }
};

export const expl = (
    strings: TemplateStringsArray,
    ...values: unknown[]
): Expl => {
    const template = createTemplatePayload(strings, values);
    const dependencies = collectDependencies(template.values);
    const info = analyzeType(template);
    switch (info.type) {
        case FormulaType.Expression:
            return new VarExpl(template, dependencies, info.name);
        case FormulaType.Function:
            return createCallableFuncExpl(template, dependencies, info);
        default:
            throw new TypeError("`expl` 仅支持声明式表达式或函数定义。");
    }
};

