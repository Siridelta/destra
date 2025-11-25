/**
 * Realname 相关方法模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Expl 类和 CtxVar 类实现 Realname 相关方法。
 * 
 * 这些方法支持：
 * - `Expl.realname(name)`: 强制指定表达式的最终 Desmos 真名（覆盖自动命名生成器）
 * - `CtxVar.realname(name)`: 强制指定上下文变量的最终 Desmos 真名（覆盖自动命名生成器）
 */

import { anyOf, createRegExp, digit, exactly, letter, maybe, oneOrMore } from "magic-regexp";
import { specialSymbolsMap, specialSymbolsPaged } from "../expr-dsl/syntax/specialSymbols";
import { CtxVar, Expl } from "./base";
import { getState } from "../state";

// ============================================================================
// 0. 数据结构与状态扩展
// ============================================================================

declare module "../state" {
    interface ExplIdState {
        realname?: string;
    }
    interface CtxVarState {
        realname?: string;
    }
}

// ============================================================================
// 1. 声明合并：扩展 Expl / CtxVar 接口类型定义
// ============================================================================

declare module "./base" {
    interface Expl {

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
        return state.explId?.realname;
    }
    // set 功能
    // 运行时检查 name 类型
    if (typeof name !== 'string') {
        throw new TypeError("真名必须是一个字符串。");
    }
    state.explId ??= {};
    state.explId.realname = normalizeName(name);
    return this;
}

Expl.prototype.realname = _Expl_realname;

function _CtxVar_realname(this: CtxVar): string | undefined;
function _CtxVar_realname(this: CtxVar, name: string): CtxVar;
function _CtxVar_realname(this: CtxVar, name?: string): CtxVar | string | undefined {
    const state = getState(this);
    // get 功能
    if (name === undefined) {
        return state.ctxVar?.realname;
    }
    // set 功能
    // 运行时检查 name 类型
    if (typeof name !== 'string') {
        throw new TypeError("真名必须是一个字符串。");
    }
    state.ctxVar ??= {};
    state.ctxVar.realname = normalizeName(name);
    return this;
}
CtxVar.prototype.realname = _CtxVar_realname;

// ============================================================================
// Console DevEx: 注入内部 getter
// ============================================================================

// 注入 _realname getter
Object.defineProperty(Expl.prototype, "_realname", {
    get: function (this: Expl) {
        return getState(this).explId?.realname;
    },
    enumerable: true,
    configurable: true,
});

Object.defineProperty(CtxVar.prototype, "_realname", {
    get: function (this: CtxVar) {
        return getState(this).ctxVar?.realname;
    },
    enumerable: true,
    configurable: true,
});
