/**
 * ID 相关方法模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Expl 类实现 ID 相关方法。
 * 
 * 这些方法支持：
 * - `.id(value, isImplicit)`: 设置或更新表达式的 Destra ID
 * - `.idPrepend(segment)`: 在现有 ID 前添加前缀段（用于批量操作）
 * - `.realname(name)`: 强制指定表达式的最终 Desmos 真名（覆盖自动命名生成器）
 */

import { anyOf, createRegExp, digit, exactly, letter, maybe, oneOrMore } from "magic-regexp";
import { idPattern, idSegmentPattern } from "../expr-dsl/syntax/commonRegExpPatterns";
import { specialSymbolsChars, specialSymbolsMap, specialSymbolsPaged } from "../expr-dsl/syntax/specialSymbols";
import { CtxVar, Expl } from "./base";
import { getState } from "../state";

// ============================================================================
// 0. 数据结构与状态扩展
// ============================================================================

/**
 * ID 元数据，记录 ID 的值和是否为隐式生成
 */
export interface IdMetadata {
    segments: readonly string[];
    isImplicit: boolean;
}

declare module "../state" {
    interface FormulaState {
        idData?: IdMetadata;
        realname?: string;
    }
}

// ============================================================================
// 1. 声明合并：扩展 Expl / CtxVar 接口类型定义
// ============================================================================

declare module "./base" {
    interface Expl {
        /**
         * 设置或更新表达式的 Destra ID
         * 
         * @param value - ID 值，必须是非空字符串
         * @param isImplicit - 是否为隐式生成的 ID（默认 false）
         * @returns 返回自身，支持链式调用
         * 
         * @throws {TypeError} 当 value 为空字符串时抛出
         * 
         * @example
         * ```typescript
         * const gravity = expl`(0, -9.8)`.id("physics.gravity");
         * const myVar = expl`1 + 2`.id("myVar", true); // 隐式 ID
         * ```
         */
        id(value: string, isImplicit?: boolean): this;
        /**
         * 获取表达式的 Destra ID
         * 
         * @returns 返回 ID 值，如果未设置则返回 undefined
         * 
         * @example
         * ```typescript
         * const vec = expl`(1, 2)`.id("vec");
         * console.log(vec.id()); // "vec"
         * ```
         */
        id(): string | undefined;

        /**
         * 在现有 ID 前添加前缀段
         * 
         * 这是一个可变 API，直接修改表达式对象的 ID。
         * 如果当前 ID 为空，则直接设置为 segment。
         * 
         * @param segment - 要添加的前缀段（ID 片段）
         * @returns 返回自身，支持链式调用
         * 
         * @example
         * ```typescript
         * const vec = expl`(1, 2)`.id("vec");
         * vec.idPrepend("physics"); // ID 变为 "physics.vec"
         * vec.idPrepend("core");    // ID 变为 "core.physics.vec"
         * ```
         */
        idPrepend(segment: string): this;

        /**
         * 强制指定表达式的最终 Desmos 真名
         * 
         * 用于覆盖 Destra 的自动命名生成器，强制指定表达式在 Desmos 图表中的变量名。
         * 这是实现"键盘输入 Hack"等高级技巧所必需的。
         * 
         * @param name - Desmos 变量名，必须符合 Desmos 命名规则
         * @returns 返回自身，支持链式调用
         * 
         * @throws {TypeError} 当 name 为空字符串时抛出
         * 
         * @example
         * ```typescript
         * // 强制指定 Desmos 变量名为 "myVar"
         * const vec = expl`(1, 2)`.id("physics.vec").realname("v");
         * // 即使 ID 是 "physics.vec"，最终在 Desmos 中的变量名将是 "v"
         * ```
         */
        realname(name: string): this;
        /**
         * 获取表达式的强制指定的 Desmos 真名
         * 
         * @returns 返回 Desmos 真名，如果未设置则返回 undefined
         * 
         * @example
         * ```typescript
         * const vec = expl`(1, 2)`.realname("v");
         * console.log(vec.realname()); // "v"
         * ```
         */
        realname(): string | undefined;
    }

    interface CtxVar {
        /**
         * 强制指定上下文变量的最终 Desmos 真名
         * 
         * @param name - Desmos 变量名，必须符合 Desmos 命名规则
         * @returns 返回自身，支持链式调用
         */
        realname(name: string): this;
        /**
         * 获取上下文变量的强制指定的 Desmos 真名
         * 
         * @returns 返回 Desmos 真名，如果未设置则返回 undefined
         * 
         * @example
         * ```typescript
         * const points = For`i = [1...10]`(({i}) => {
         *     i.realname("i");
         *     console.log(i.realname()); // "i"
         *     return expr`(i, i^2)`;
         * });
         * ```
         */
        realname(): string | undefined;
    }
}

// ============================================================================
// 2. 原型注入：提供运行时实现
// ============================================================================

const idRegex = createRegExp(idPattern);

const idDataInit = (): IdMetadata => ({ segments: [], isImplicit: false });

/**
 * 实现 .id() 方法
 * 
 * 设置表达式的 Destra ID，并标记其是否为隐式生成。
 * 隐式 ID 在命名冲突解决时具有较低优先级。
 */
function _Expl_id(this: Expl): string | undefined;
function _Expl_id(this: Expl, value: string, isImplicit?: boolean): Expl;
function _Expl_id(this: Expl, value?: string, isImplicit: boolean = false): Expl | string | undefined {
    const state = getState(this);

    // get 功能
    if (value === undefined) {
        const idData = state.idData;
        if (!idData || idData.segments.length === 0) {
            return undefined;
        }
        return idData.segments.join(".");
    }

    // set 功能
    // 验证 ID 格式
    if (!idRegex.test(value)) {
        throw new TypeError("无效 ID 格式。");
    }

    const idSegmentRegex = createRegExp(idSegmentPattern, ['g']);
    const segments =
        [...value.matchAll(idSegmentRegex)]
            .map(match => match[0]!);

    state.idData = {
        segments,
        isImplicit,
    }

    return this;
}

Expl.prototype.id = _Expl_id;

/**
 * 实现 .idPrepend() 方法
 * 
 * 在现有 ID 前添加前缀段，用于批量 ID 操作。
 * 这是一个可变 API，直接修改表达式对象本身。
 */
Expl.prototype.idPrepend = function (this: Expl, segment: string): Expl {
    const idSegmentRegex = createRegExp(idSegmentPattern);
    if (!segment || !idSegmentRegex.test(segment)) {
        throw new TypeError("无效的 ID 段格式。");
    }

    const state = getState(this);
    // 如果 idData 不存在，初始化它
    state.idData ??= idDataInit();

    state.idData.segments = [segment, ...state.idData.segments];

    return this;
};

/**
 * 定义 Desmos 变量名的合法范围。
 * 规则：以字母或希腊字母(在 Destra 里可以为希腊字母的 alias，或者希腊字母字符本身)开头；可拥有一个下标，在头字母后用下划线连接，下标为一串可以包含至少一个字母或数字的字符串。
 * 例如：a, a_b, α, α_1, α_1xy, alpha_1xy2z
 * 按理 Destra 还应该防止你使用保留变量（x, y, z, t）作为变量名，但是既然你要使用 realname() 这种 hacky 的方法了，额，那就给你 hack 的空间吧（绝对不是因为我懒得写排除（绝对不是）），不要把你的图表玩坏就好。
 */
const realnamePattern = exactly(
    exactly("").at.lineStart(),
    anyOf(
        letter,
        anyOf(...specialSymbolsPaged.greekLowerCase.aliases),
        anyOf(...specialSymbolsPaged.greekUpperCase.aliases),
        anyOf(...specialSymbolsPaged.greekLowerCase.chars),
        anyOf(...specialSymbolsPaged.greekUpperCase.chars),
    ).groupedAs("head"),
    maybe(
        "_",
        oneOrMore(anyOf(letter, digit)).groupedAs("subscript"),
    ),
    exactly("").at.lineEnd(),
);

/**
 * Expl 和 CtxVar 共用的 规范化名字的方法
 * @param name - 要规范化的名字
 * @returns 规范化后的名字
 * @throws {TypeError} 当名字不符合规范时抛出
 * @example
 * ```typescript
 * const a = normalizeName("a");
 * console.log(a); // "a"
 * const alpha = normalizeName("α");
 * console.log(alpha); // "alpha"
 * ```
 */
function normalizeName(name: string): string {
    const match = name.match(createRegExp(realnamePattern));
    if (!match) {
        throw new TypeError("无效的 Desmos 变量名。");
    }

    let finalName = name;
    const head = match.groups.head!;
    const maybeSpecialSymbol = 
            Object.entries(specialSymbolsMap)
                .find(([_, char]) => char === head);
    if (maybeSpecialSymbol) {
        const [alias, _] = maybeSpecialSymbol;
        const maybeSubscript = match.groups.subscript;
        finalName = maybeSubscript ? `${alias}_${maybeSubscript}` : alias;
    }
    return finalName;
}
/**
 * 实现 .realname() 方法
 * 
 * 强制指定表达式的最终 Desmos 真名，覆盖自动命名生成器。
 * 这是实现"键盘输入 Hack"等高级技巧所必需的。
 * 
 * 规则：以单个字母或单个希腊字母(在 Destra 里可以使用 alias，或者希腊字母字符本身)开头；可拥有一个下标，在头字母后用下划线连接，下标为一串可以包含至少一个字母或数字的字符串；真名整体必须符合此规则。
 * 例如：a, a_b, α, α_1, α_1xy, alpha_1xy2z
 * 注意：设置时会将真名头部的希腊字母本体转化为对应的 alias。因为这两种写法只能对应 Desmos 里的同一种变量名。
 */
function _Expl_realname(this: Expl): string | undefined;
function _Expl_realname(this: Expl, name: string): Expl;
function _Expl_realname(this: Expl, name?: string): Expl | string | undefined {
    const state = getState(this);
    // get 功能
    if (name === undefined) {
        return state.realname;
    }
    // set 功能
    state.realname = normalizeName(name);
    return this;
}

Expl.prototype.realname = _Expl_realname;

function _CtxVar_realname(this: CtxVar): string | undefined;
function _CtxVar_realname(this: CtxVar, name: string): CtxVar;
function _CtxVar_realname(this: CtxVar, name?: string): CtxVar | string | undefined {
    const state = getState(this);
    // get 功能
    if (name === undefined) {
        return state.realname;
    }
    // set 功能
    state.realname = normalizeName(name);
    return this;
}
CtxVar.prototype.realname = _CtxVar_realname;

// ============================================================================
// Console DevEx: 注入内部 getter
// ============================================================================

// 注入 _id getter
Object.defineProperty(Expl.prototype, "_id", {
    get: function(this: Expl) {
        const idData = getState(this).idData;
        if (!idData || idData.segments.length === 0) {
            return undefined;
        }
        return idData.segments.join(".");
    },
    enumerable: true, // 允许在 Console 中遍历看到
    configurable: true,
});

// 注入 _realname getter
Object.defineProperty(Expl.prototype, "_realname", {
    get: function(this: Expl) {
        return getState(this).realname;
    },
    enumerable: true,
    configurable: true,
});