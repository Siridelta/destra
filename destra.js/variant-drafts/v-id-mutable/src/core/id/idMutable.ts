
/**
 * 具有 ID 操作相关方法的对象接口
 */
export interface IdMutable {
    /**
     * 在现有 ID 前添加前缀段
     * @param segment ID 片段
     */
    idPrepend(segment: string): this;
}
export const idMutableMethods = [
    'idPrepend'
] as const satisfies (keyof IdMutable)[];

/**
 * 运行时检查对象是否实现了 IdMutable 接口
 */
export const isIdMutable = (obj: unknown): obj is IdMutable => {
    if (!obj) return false;
    const type = typeof obj;
    if (type !== 'object' && type !== 'function') return false;

    return idMutableMethods.every(method =>
        method in (obj as object)
        && typeof (obj as any)[method] === 'function'
    );
}