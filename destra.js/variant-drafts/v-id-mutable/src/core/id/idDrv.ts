import { IdMutable } from "./idMutable";
import { IdData } from "../formula/id";
import { createRegExp } from "magic-regexp";
import { idSegmentPattern } from "../expr-dsl/syntax-reference/commonRegExpPatterns";

/**
 * 自定义 ID 修改量类型（id => newId 函数）
 * 接收一个初始 ID，返回经过自定义修改后的新 ID
 */
export type CustomIdDerivation = (initialId: string) => string;

export type DrvDataTypes = {
    [KMethodName in keyof IdMutable]: {
        kind: KMethodName;
        data: Parameters<IdMutable[KMethodName]>;
    }
}

export type DrvData = DrvDataTypes[keyof DrvDataTypes];

export type DrvFuncsType = {
    [KMethodName in keyof IdMutable]: (idData: IdData, drvData: DrvDataTypes[KMethodName]['data']) => IdData
}

export const drvFuncs = {
    'prefix': (idData: IdData, drvData: DrvDataTypes['prefix']['data']) => {
        const idSegmentRegex = createRegExp(idSegmentPattern);
        const [segment] = drvData;

        // 运行时检查 segment 类型
        if (typeof segment !== 'string') {
            throw new TypeError("ID 段必须是一个字符串。");
        }
        // 验证 ID 段格式
        if (!idSegmentRegex.test(segment)) {
            throw new TypeError("无效的 ID 段格式。");
        }

        idData.segments = [segment, ...idData.segments];
        return idData;
    },
} as const satisfies DrvFuncsType;