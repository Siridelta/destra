/**
 * ID 相关方法模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Expl 类实现 ID 相关方法。
 * 
 * 这些方法支持：
 * - `Expl.id(value, isImplicit)`: 设置或更新表达式的 Destra ID
 * - `Expl.prefix(segment)`: 在现有 ID 前添加前缀段（用于批量操作）
 * - `Expl.applyIdDrvs(drvs)`: 应用 ID 衍生函数（支持 builder 等场景）
 */

import { createRegExp } from "magic-regexp";
import { idPattern, idSegmentPattern } from "../expr-dsl/syntax-reference/commonRegExpPatterns";
import { Expl } from "./base";
import { getState } from "../state";
import { IdMutable, idMutableMethods } from "../id/idMutable";
import { CustomIdDerivation, DrvData, drvFuncs } from "../id/idDrv";

// ============================================================================
// 0. 数据结构与状态扩展
// ============================================================================

/**
 * ID 元数据，记录 ID 的值和是否为隐式生成
 */
export interface IdData {
    segments: readonly string[];
    isImplicit: boolean;
}

declare module "../state" {
    interface ExplIdState {
        idData?: IdData;
    }
}

// ============================================================================
// 1. 声明合并：扩展 Expl 接口类型定义
// ============================================================================

declare module "./base" {
    interface Expl extends IdMutable {
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
         * 应用 ID 修改量
         * 
         * 使用传入的修改量计算新的 ID，并更新表达式。
         * 这是一个可变 API，直接修改表达式对象本身。
         * ID 的隐式状态 (isImplicit) 保持不变。
         * 
         * @param drvs - ID 修改量，可以是自定义 ID 修改量函数，也可以是 builder 内部记录并传入的 ID 修改量数据
         * @returns 返回自身，支持链式调用
         * 
         * @throws {Error} 如果当前表达式没有 ID
         */
        applyIdDrvs(drvs: (DrvData | CustomIdDerivation)[]): this;

        // ==============================
        // IdMutable 接口
        // ==============================

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
         * vec.prefix("physics"); // ID 变为 "physics.vec"
         * vec.prefix("core");    // ID 变为 "core.physics.vec"
         * ```
         */
        prefix(segment: string): this;
    }
}


// ============================================================================
// 2. 原型注入：提供运行时实现
// ============================================================================

const idRegex = createRegExp(idPattern);

const idDataInit = (): IdData => ({ segments: [], isImplicit: false });

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
        const idData = state.explId?.idData;
        if (!idData || idData.segments.length === 0) {
            return undefined;
        }
        return idData.segments.join(".");
    }

    // set 功能
    // 运行时检查 value 类型
    if (typeof value !== 'string') {
        throw new TypeError("ID 必须是一个字符串。");
    }
    // 验证 ID 格式
    if (!idRegex.test(value)) {
        throw new TypeError("无效 ID 格式。");
    }

    const idSegmentRegex = createRegExp(idSegmentPattern, ['g']);
    const segments =
        [...value.matchAll(idSegmentRegex)]
            .map(match => match[0]!);

    state.explId ??= {};
    state.explId.idData = {
        segments,
        isImplicit,
    };

    return this;
}

Expl.prototype.id = _Expl_id;

/**
 * 实现 .applyIdDrvs() 方法
 * 应用 ID 衍生函数
 */
Expl.prototype.applyIdDrvs = function (this: Expl, drvs: (DrvData | CustomIdDerivation)[]): Expl {

    // 获取当前 isImplicit 状态
    const state = getState(this);
    state.explId ??= {};
    state.explId.idData ??= idDataInit();

    for (const drv of drvs) {
        // 自定义 ID 修改函数
        if (typeof drv === 'function') {
            const currentId = this.id();
            if (!currentId) {
                throw new Error("无法应用 ID 修改量，因为表达式没有 ID。");
            }
            const newId = drv(currentId);
            // 运行时检查 newId 类型
            if (typeof newId !== 'string') {
                throw new TypeError("自定义 ID 修改函数返回的新 ID 必须是一个字符串。");
            }
            // 重新设置 ID(使用公共接口，以做检查)，保持相同的隐式状态
            const isImplicit = state.explId?.idData?.isImplicit ?? false;
            this.id(newId, isImplicit);
        }
        // 记录的 ID 修改量数据
        else {
            state.explId.idData = drvFuncs[drv.kind](state.explId.idData, drv.data);
        }
    }
    return this;
};

// ============================================================================
// 3. IdMutable 接口实现
// ============================================================================

for (const methodName of idMutableMethods) {
    if (methodName === 'applyIdDrvs') continue;
    Object.defineProperty(Expl.prototype, methodName, {
        value: function (this: Expl, ...args: Parameters<IdMutable[typeof methodName]>): Expl {

            const state = getState(this);
            state.explId ??= {};
            state.explId.idData ??= idDataInit();
            state.explId.idData = drvFuncs[methodName](state.explId.idData, args);

            return this;
        },
        enumerable: true,
        configurable: true
    });
}


// ============================================================================
// Console DevEx: 注入 inspective getter
// ============================================================================

// 注入 _id getter
Object.defineProperty(Expl.prototype, "_id", {
    get: function (this: Expl) {
        const idData = getState(this).explId?.idData;
        if (!idData || idData.segments.length === 0) {
            return undefined;
        }
        return idData.segments.join(".");
    },
    enumerable: true,
    configurable: true,
});