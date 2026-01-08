import { IdMutable, idMutableMethods } from "./id/idMutable";
import { CustomIdDerivation, DrvData, DrvDataTypes } from "./id/idDrv";

/**
 * Builder 类型
 * 既是一个可调用的生成函数，也是一个 IdMutable 对象
 */
export type Builder<TFunc extends (...args: any[]) => any> = TFunc & IdMutable;

/**
 * 创建 Builder 的工厂函数
 * 
 * Builder 用于处理动态生成的表达式。它接收一个回调函数，
 * 回调函数会获得一个 `idDrvs` (ID Derivations) 工具函数。
 * 
 * 用户在回调函数内部构造出实际的自定义数据生产函数。
 * 
 * Builder 对象在被调用之前可以多次调用各种 id 变换方法，记忆所有待应用的变换操作。
 * 然后在 Builder 被调用时，创建并执行数据生产函数，并将所有变换操作应用到生成的数据上——这一逻辑需要用户在数据生产函数内部实现。
 * 
 * 用户在自定义数据生产函数内部生成的表达式，必须使用 `idDrvs` 来处理其 ID，
 * 例如 `Expl.applyIdDrvs(idDrvs)`;
 * 从而保证生成的表达式 ID 符合预期。
 * 
 * @param mkBuilder 回调函数，接收 idDrvs 并返回真正的数据生产函数
 * @returns Builder 对象
 * 
 * @example
 * ```typescript
 * const createPoint = builder((idDrvs) => (x: number, y: number) => {
 *     return expl`(${x}, ${y})`.id("pt").applyIdDrvs(idDrvs);
 * });
 * 
 * // createPoint 是一个 Builder
 * createPoint.prefix("system");
 * 
 * // 调用生成函数
 * const p = createPoint(1, 2); 
 * // p.id() 将是 "system.pt"
 * ```
 */
export const builder = <TFunc extends (...args: any[]) => any>(
    mkBuilder: (idDrvs: (DrvData | CustomIdDerivation)[]) => TFunc
): Builder<TFunc> => {
    // 内部存储 DrvDatas
    const idDrvs: (DrvData | CustomIdDerivation)[] = [];

    // 创建 Builder 对象（包装函数）
    const _builder = ((...args: Parameters<TFunc>): ReturnType<TFunc> => {
        // 调用工厂函数，获取用户的生成函数；然后执行用户生成函数，并返回结果
        // 注意：这里假设工厂函数是同步的
        return mkBuilder(idDrvs)(...args);
    }) as Builder<TFunc>;

    // 实现 idMutableMethods
    for (const methodName of idMutableMethods) {
        Object.defineProperty(_builder, methodName, {
            value: function (
                this: Builder<TFunc>, 
                ...args: Parameters<IdMutable[typeof methodName]>
            ): Builder<TFunc> {
                idDrvs.push({
                    kind: methodName,
                    data: args,
                } satisfies DrvDataTypes[typeof methodName]);
                return this;
            },
        });
    }

    return _builder;
};
