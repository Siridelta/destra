import { createRegExp } from "magic-regexp";
import { specialSymbolsMap } from "../syntax/specialSymbols";

const specialSymbolsRegExpMap = Object.fromEntries(
    Object.entries(specialSymbolsMap)
        .map(([alias, char]) => [alias, createRegExp(char)],
)) as Record<string, RegExp>;

export const preprocess = (source: string): string => {

    // 将特殊符号替换为英文别名
    for (const [alias, regExp] of Object.entries(specialSymbolsRegExpMap)) {
        source = source.replace(regExp, alias);
    }
    
    return source;
};