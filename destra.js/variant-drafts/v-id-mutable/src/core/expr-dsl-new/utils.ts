import { type TemplatePayload } from "../formula/base";
import { createRegExp, exactly, whitespace, anyOf } from "magic-regexp";
import { paramNamePattern } from "./syntax/commonRegExpPatterns";

/**
 * 构建可检查的源代码字符串
 * 将模板载荷转换为一个字符串，其中插值部分用 `${index}` 占位符替换
 */
export const buildInspectableSource = (payload: TemplatePayload): string => {
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
export const extractParameters = (rawParams: string): string[] => {
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

export const iterativeCheckBrackets = (
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

