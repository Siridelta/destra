import { Formula } from "./formula/base";
import { IdMutable, idMutableMethods, isIdMutable } from "./id/idMutable";

/**
 * Selection 类型：具有和传入字典相同的结构，同时可用 IdMutable 接口，进行批量 ID 操作
 */
export type Selection<T extends Record<string, IdMutable>> = T & IdMutable;

/**
 * 创建一个选区 (Selection)
 * 
 * 选区是一个包含多个 IdMutable 对象（如 Expl, Builder 或嵌套的 Selection）的集合。
 * 对选区调用 prefix 会同步地对选区内所有对象调用 prefix。
 * 
 * @param items 包含 IdMutable 对象的字典
 * @returns 选区对象
 * 
 * @throws {TypeError} 如果输入参数不是对象，或者 ID 段不是字符串
 */
export const selection = <T extends Record<string, IdMutable>>(items: T): Selection<T> => {

    // 运行时检查 items 类型
    if (typeof items !== 'object' || items === null) {
        throw new TypeError("输入参数必须是对象。");
    }
    // 浅拷贝对象，避免修改原始引用的结构（虽然我们会修改值及其内部状态）
    const sel = Object.assign({}, items) as Selection<T>;

    // 定义 IdMutable 接口实现
    for (const methodName of idMutableMethods) {
        Object.defineProperty(sel, methodName, {
            value: function (this: Selection<T>, ...args: Parameters<IdMutable[typeof methodName]>): Selection<T> {
                // 遍历选区内的所有项
                for (const key in items) {
                    // 安全获取项，忽略原型链上的属性
                    if (!Object.prototype.hasOwnProperty.call(items, key)) continue;
                    const item = items[key];
                    // 递归调用 idMutable 项的 methodName 方法
                    if (!isIdMutable(item)) continue;
                    // @ts-ignore
                    item[methodName](...args);
                }
                return this;
            },
            enumerable: true,
            configurable: true
        });
    }

    Object.freeze(sel);
    return sel;
};


export const traverseSelection = (selection: any, callback: (item: Formula) => void) => {
    if (!(typeof selection === 'object' && selection !== null)) return;
    for (const key in selection) {
        const item = selection[key];
        if (item instanceof Formula) {
            callback(item);
        } else if (typeof item === 'object' && item !== null) {
            traverseSelection(item, callback);
        }
    }
}

export const traverseSelectionOrFormula = (selection: any, callback: (item: Formula) => void) => {
    if (selection instanceof Formula) {
        callback(selection);
    } else if (typeof selection === 'object' && selection !== null) {
        traverseSelection(selection, callback);
    }
}