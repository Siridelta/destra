/**
 * Tier 1: 类型分析模块
 *
 * 本模块使用正则表达式对表达式进行浅层扫描，快速判断表达式的大致类型
 * （如变量、函数、方程），但不保证其内部语法的完全正确性。
 *
 * 完整的 AST 解析（Tier 2）将在后续实现。
 */

import { createRegExp, exactly, letter, wordChar, anyOf, maybe, whitespace, charNotIn, charIn, wordBoundary, digit, oneOrMore } from "magic-regexp";
import { type TemplatePayload, FormulaType } from "../formula/base";
import { reservedWords, reservedWords1, reservedWords2, reservedWords3, reservedWords4, reservedWords5, suffixReservedWords } from "./parseAst";
import { specialSymbols } from "./specialSymbols";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 公式类型信息联合类型
 */
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
        readonly op: '=' | '<=' | '>=' | '<' | '>';
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
    };

type FormulaTypeInfoOfExpr = Extract<
    FormulaTypeInfo,
    {
        readonly type:
        | FormulaType.Expression
        | FormulaType.ExplicitEquation
        | FormulaType.ImplicitEquation
        | FormulaType.Regression;
    }
>;

type FormulaTypeInfoOfExpl = Extract<
    FormulaTypeInfo,
    {
        readonly type: FormulaType.Variable | FormulaType.Function;
    }
>;

// ============================================================================
// 正则表达式定义
// ============================================================================

// 大致界定 Expr DSL 中纯表达式 (expression) 内容的字符范围
const expressionCharRange = [
    // wordChar, whitespace,
    "+", "-", "*", "/", "^", "%", "!",
    "(", ")", "[", "]", "{", "}",
    ".", ",", ":",
    "=", "<", ">",
] as const;
const inExpressionCharRangePattern =
    anyOf(
        wordChar, whitespace,
        exactly("${", digit.times.any(), "}"),
        ...expressionCharRange,
    ).times.any();


const idSegmentPattern = oneOrMore(wordChar);
const firstIdSegmentPattern = anyOf(letter, "_").and(wordChar.times.any());
const paramNamePattern = firstIdSegmentPattern;

const lineStart = exactly("").at.lineStart();
const lineEnd = exactly("").at.lineEnd();

// 定义 ID 的合法范围。
// 规则：一个或多个 id 段，用点号 "." 连接。整体不能等于任何 reservedWords；第一个 id 段不能以数字开头；当 id 段数量大于 1 时，最后一个 id 段不能为 suffixReservedWords 中的任何一个。
// 例如： a, a_b, a.b, a.b.c
const idPattern = exactly(
    wordBoundary.or(lineStart)
        .notAfter(".")
        .notBefore(
            anyOf(
                anyOf(...reservedWords1),
                anyOf(...reservedWords2),
                anyOf(...reservedWords3),
                anyOf(...reservedWords4),
                anyOf(...reservedWords5),
            ),
            wordBoundary.notBefore(".").or(lineEnd)
        ),
    firstIdSegmentPattern,
    maybe(
        exactly(".")
            .and(idSegmentPattern).times.any(),
        exactly(".")
            .notBefore(
                anyOf(...suffixReservedWords),
                wordBoundary.or(lineEnd)
            )
            .and(idSegmentPattern),
    ),
    wordBoundary.notBefore(".").or(lineEnd)
);

// 箭头函数头：匹配 "(x, y) =>" 或 "x =>" 或前面有函数名赋值部分 "id = " 等形式
// 结构为：可选的函数名赋值部分 "id = "，然后是参数列表（括号包裹或单个参数），最后是 "=>"
const arrowFunctionHeadPattern = exactly(
    lineStart,
    whitespace.times.any(),
    maybe(
        idPattern.groupedAs("functionName"),
        whitespace.times.any(),
        "=",
    ),
    whitespace.times.any(),
    anyOf(
        // 匹配括号包裹的参数列表："(x, y)"
        exactly(
            "(",
            exactly(
                paramNamePattern,
                exactly(",").and(whitespace.times.any()).and(paramNamePattern).times.any()
            ).groupedAs("params"),
            ")",
        ),
        // 匹配单个参数：x
        paramNamePattern.groupedAs("singleParam"),
    ),
    whitespace.times.any(),
    "=>",
);

// 具名函数定义：匹配 "f(x) = ..." 形式
const namedFunctionDefinitionPattern = exactly(
    lineStart,
    whitespace.times.any(),
    idPattern.groupedAs("name"),
    whitespace.times.any(),
    "(",
    exactly(
        paramNamePattern,
        exactly(",").and(whitespace.times.any()).and(paramNamePattern).times.any()
    ).groupedAs("params"),
    ")",
    whitespace.times.any(),
    "=",
    inExpressionCharRangePattern,
);

// 两类“变量赋值类语法”：变量定义，和显式方程。
// 它们都符合 “单变量 = 纯表达式” 的语法，有一个“左值”（变量名或保留变量名）。

// 变量定义：匹配 "id = ..." 形式
// 左值必须是合法的 id。
// 使用 expl 创建时，按变量定义的语法检查。
const variableDefinitionPattern = exactly(
    lineStart,
    whitespace.times.any(),
    idPattern.groupedAs("lhsName"),
    whitespace.times.any(),
    "=",
    inExpressionCharRangePattern,
);

// 显式方程：匹配 "id / x / y / z / r / rho = ..." 形式
// 除合法 id（而且最终组合时这个 id 不能有定义）外，x, y, z, r, rho 这几个保留变量也可以作为左值。
// 使用 expr 创建时，按显式方程的语法检查。
const explicitEquationPattern = exactly(
    lineStart,
    whitespace.times.any(),
    anyOf(idPattern, "x", "y", "z", "r", "rho", specialSymbols.rho).groupedAs("lhsName"),
    whitespace.times.any(),
    "=",
    inExpressionCharRangePattern,
);

// 回归符号：匹配 "~"
const regressionPattern = exactly(
    inExpressionCharRangePattern,
    "~",
    inExpressionCharRangePattern,
);

// 方程符号：匹配 "="; 但也会匹配到变量赋值语法中的 "="，需要进一步区分。
const equationOperatorPattern =
    exactly("=")
        .notBefore(anyOf("=", ">", "<"))
        .notAfter(anyOf("=", ">", "<"));

// 不等式符号：匹配 ">=", "<=", ">", "<", 前后不能是 "=", ">" 或 "<"
const inequalityPattern =
    anyOf("<=", ">=", "<", ">")
        .notBefore(anyOf("=", ">", "<"))
        .notAfter(anyOf("=", ">", "<"));

// 编译正则表达式
const allInExpressionCharRangeRegex = createRegExp(inExpressionCharRangePattern.at.lineStart().at.lineEnd());
const paramNameRegex = createRegExp(paramNamePattern);
const firstIdSegmentRegex = createRegExp(firstIdSegmentPattern);
const idRegex = createRegExp(idPattern);
const arrowFunctionHeadRegex = createRegExp(arrowFunctionHeadPattern);
const namedFunctionDefinitionRegex = createRegExp(namedFunctionDefinitionPattern);
const variableDefinitionRegex = createRegExp(variableDefinitionPattern);
const explicitEquationRegex = createRegExp(explicitEquationPattern);
const regressionRegex = createRegExp(regressionPattern);
const equationOperatorsRegex = createRegExp(equationOperatorPattern, ['g']);
const inequalityOperatorsRegex = createRegExp(inequalityPattern, ['g']);

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 构建可检查的源代码字符串
 * 将模板载荷转换为一个字符串，其中插值部分用 `${index}` 占位符替换
 */
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
 *
 * @param rawParams 原始参数列表字符串
 * @returns 参数列表
 */
const extractParameters = (rawParams: string): string[] => {
    const params = rawParams.split(",").map((param) => param.trim());
    if (params.length === 0) {
        throw new TypeError("函数参数列表语法错误。");
    }
    if (params[params.length - 1] === "") {
        params.pop();
    }
    if (params.length === 0) {
        throw new TypeError("函数参数列表语法错误。");
    }
    params.forEach((param, index) => {
        if (param.length === 0 && index !== params.length - 1) {
            throw new TypeError("函数参数列表语法错误。");
        }
    });
    return params;
};

const bracketMap = new Map([
    ['round', {
        'open': '(',
        'close': ')',
    }],
    ['square', {
        'open': '[',
        'close': ']',
    }],
    ['curly', {
        'open': '{',
        'close': '}',
    }],
] as const);

type BracketKind = typeof bracketMap extends Map<infer K, infer V> ? K : never;

const iterativeCheckBrackets = (
    source: string,
    onIter: (
        index: number,
        source: string,
        bracketContextStack: BracketKind[]
    ) => void
): boolean => {
    const bracketContextStack: BracketKind[] = [];
    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        for (const [bracketKind, brackets] of bracketMap.entries()) {
            if (brackets.open === char) {
                bracketContextStack.push(bracketKind);
                break;
            }
            if (brackets.close === char) {
                if (bracketContextStack.pop() !== bracketKind) {
                    return false;
                }
                break;
            }
        }
        onIter(index, source, [...bracketContextStack]);
    }
    return true;
}

// ============================================================================
// 类型分析函数
// ============================================================================

/**
 * 分析模板载荷的类型（Tier 1：基于正则的浅层扫描）
 *
 * @param payload 模板载荷
 * @param factoryType 工厂类型（"expr" 或 "expl"）
 * @returns 公式类型信息
 */
function analyzeType(payload: TemplatePayload, factoryType: "expr"): FormulaTypeInfoOfExpr;
function analyzeType(payload: TemplatePayload, factoryType: "expl"): FormulaTypeInfoOfExpl;
function analyzeType(
    payload: TemplatePayload,
    factoryType: "expr" | "expl",
): FormulaTypeInfo {
    const source = buildInspectableSource(payload);

    // 首先检查符号是否都在大致的合法范围内，如果不合法则抛出 TypeError。
    if (!allInExpressionCharRangeRegex.test(source)) {
        throw new TypeError("检测到非法符号。");
    }

    // 然后先匹配掉回归表达式，具有可辨识的`~`符号，最容易识别。
    if (regressionRegex.test(source)) {
        if (factoryType === "expl") {
            throw new TypeError("不能用 `expl` 创建回归表达式。");
        }
        return { type: FormulaType.Regression };
    }

    // 然后匹配掉箭头函数式的函数定义语法，具有可辨识的`=>`符号以及函数参数列表。
    // arrowHead 包括 "(x, y) =>" 和 "x =>"，前面可能有 "f = "，两种形式。
    // 分别将匹配到："x, y" 和 "x"
    const arrowHead = source.match(arrowFunctionHeadRegex);
    if (arrowHead) {
        // 括号包裹的参数列表 / 单个参数名
        const singleParam = arrowHead.groups.singleParam;
        const paramsString = singleParam ? singleParam : arrowHead.groups.params!;
        const name = arrowHead.groups.functionName;
        if (factoryType === "expr") {
            throw new TypeError("不能用 `expr` 创建函数。");
        }
        return { type: FormulaType.Function, name, params: extractParameters(paramsString) };
    }

    // 然后匹配掉具名函数式的函数定义语法，为 "f(x) = x^2" 这样的形式。
    const namedFunction = source.match(namedFunctionDefinitionRegex);
    if (namedFunction) {
        const name = namedFunction.groups.name!;
        const params = namedFunction.groups.params!;
        if (factoryType === "expr") {
            throw new TypeError("不能用 `expr` 创建函数。");
        }
        return { type: FormulaType.Function, name, params: extractParameters(params) };
    }

    // 然后匹配掉变量赋值语法，为 "a = 3" 这样的形式；
    // 如果使用 expl 创造，则为变量定义；
    // 如果使用 expr 创造，则为显式方程。
    if (factoryType === "expl") {
        const variableDefinition = source.match(variableDefinitionRegex);
        if (variableDefinition) {
            const lhsName = variableDefinition.groups.lhsName!;
            return { type: FormulaType.Variable, name: lhsName };
        }
    }
    const explicitEquation = source.match(explicitEquationRegex);
    if (explicitEquation) {
        if (factoryType === "expl") {
            throw new TypeError("不能用 `expl` 创建显式方程。");
        }
        const lhsName = explicitEquation.groups.lhsName!;
        return { type: FormulaType.ExplicitEquation, lhsName };
    }

    // 然后检测隐式方程（方程或不等式），也同时检测纯表达式的括号是否匹配；
    // 先筛查前后内容在合法字符范围内的等号与不等号，然后扫描一遍代码，确保等号或不等号在括号层级外，且只有一个候选通过检查。
    const candidateEquationOpMatchs = [...source.matchAll(equationOperatorsRegex)];
    const candidateInequalityOpMatchs = [...source.matchAll(inequalityOperatorsRegex)];
    const candidateOps = new Map([
        ...candidateEquationOpMatchs.map(match => [
            match.index!,
            match[0]! as '=',
        ] as const),
        ...candidateInequalityOpMatchs.map(match => [
            match.index!,
            match[0]! as '<=' | '>=' | '<' | '>',
        ] as const),
    ]);
    const validOps: typeof candidateOps = new Map();
    const bracketsValid = iterativeCheckBrackets(source, (index, _, bracketContextStack) => {
        const op = candidateOps.get(index);
        if (op && bracketContextStack.length === 0) {
            validOps.set(index, op);
        }
    });
    if (!bracketsValid) {
        throw new TypeError("括号不匹配。");
    }
    if (validOps.size > 1) {
        throw new TypeError("括号层级外有多于一个等号或不等号。");
    }
    if (validOps.size === 1) {
        if (factoryType === "expl") {
            throw new TypeError("不能用 `expl` 创建隐式方程。");
        }
        const [_, op] = [...validOps.entries()][0]!;
        return { type: FormulaType.ImplicitEquation, op };
    }
    if (factoryType === "expl") {
        return { type: FormulaType.Variable, name: undefined };
    }
    return { type: FormulaType.Expression };
}

export { 
    analyzeType,
    idPattern,
    firstIdSegmentPattern,
    idSegmentPattern,
};

