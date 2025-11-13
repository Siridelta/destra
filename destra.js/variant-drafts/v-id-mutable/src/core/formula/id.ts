/**
 * ID 相关方法模块（原型注入）
 *
 * 本模块使用"声明合并+原型注入"模式为 Expl 类实现 ID 相关方法。
 * 
 * 这些方法支持：
 * - `.id(value, isImplicit)`: 设置或更新表达式的 Destra ID
 * - `.idPrepend(segment)`: 在现有 ID 前添加前缀段（用于批量操作）
 */

import { createRegExp } from "magic-regexp";
import { idPattern, idSegmentPattern } from "../expr-dsl/analyzeType";
import { Expl } from "./base";

// ============================================================================
// 声明合并：扩展 Expl 接口类型定义
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
    }
}

// ============================================================================
// 原型注入：提供运行时实现
// ============================================================================

/**
 * 实现 .id() 方法
 * 
 * 设置表达式的 Destra ID，并标记其是否为隐式生成。
 * 隐式 ID 在命名冲突解决时具有较低优先级。
 */
function _Expl_id (this: Expl): string | undefined;
function _Expl_id (this: Expl, value: string, isImplicit?: boolean): Expl;
function _Expl_id (this: Expl, value?: string, isImplicit: boolean = false): Expl | string | undefined {
    // get 功能
    if (value === undefined) {
        return this._id;
    }

    // set 功能
    // 验证 ID 格式
    if (!createRegExp(idPattern).test(value)) {
        throw new TypeError("无效 ID 格式。");
    }

    const segmentMatchs = [...value.matchAll(createRegExp(idSegmentPattern, ['g']))]
    const segments = segmentMatchs.map(match => match[0]!);

    this.idMeta = {
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
    if (!segment || !createRegExp(idSegmentPattern).test(segment)) {
        throw new TypeError("无效的 ID 段格式。");
    }
    
    const currentSegments = this.idMeta.segments;
    this.idMeta.segments = [segment, ...currentSegments];
    
    return this;
};

