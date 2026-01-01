import { type TemplatePayload, type Substitutable } from "../formula/base";
import { buildInspectableSource, iterativeCheckBrackets } from "./utils";
import { createRegExp, exactly, whitespace } from "magic-regexp";
import { internalVarNameExcludePattern } from "./syntax/commonRegExpPatterns";

export interface CtxVarDef {
    name: string;
    definitionPayload: TemplatePayload;
}

export interface CtxVarBoundsDef {
    name: string;
    lower: TemplatePayload;
    upper: TemplatePayload;
}

// Match "name = ..." at start of string
const definitionStartRegex = createRegExp(
    exactly(
        whitespace.times.any(),
        internalVarNameExcludePattern.groupedAs("name"),
        whitespace.times.any(),
        "=",
    )
);

const reconstructPayload = (segment: string, originalValues: readonly Substitutable[]): TemplatePayload => {
    // Split by ${index} placeholders.
    // the index (in string form) is also in `parts` array, in between the string fragments.
    // that is: [string, `${index}`, string, `${index}`, string, ...]
    // (Experimented)
    const parts = segment.split(/\$\{(\d+)\}/);
    const newStrings: string[] = [];
    const newValues: Substitutable[] = [];

    newStrings.push(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
        const index = parseInt(parts[i], 10);
        newValues.push(originalValues[index]);
        newStrings.push(parts[i + 1]);
    }

    return {
        strings: Object.freeze(newStrings),
        values: Object.freeze(newValues)
    };
};

// Analyze "name1 = value1, name2 = value2, ..." definitions
export const analyzeCtxVarDefinitions = (payload: TemplatePayload): CtxVarDef[] => {
    const source = buildInspectableSource(payload);
    const definitions: CtxVarDef[] = [];

    // Find comma positions that are at top level
    const commaIndices: number[] = [];
    const bracketsValid = iterativeCheckBrackets(source, (index, _, stack) => {
        if (source[index] === ',' && stack.length === 0) {
            commaIndices.push(index);
        }
    });

    if (!bracketsValid) {
        throw new TypeError(`括号不匹配：${source}`);
    }

    let lastIndex = 0;
    const segments: string[] = [];
    for (const commaIndex of commaIndices) {
        segments.push(source.substring(lastIndex, commaIndex));
        lastIndex = commaIndex + 1;
    }
    segments.push(source.substring(lastIndex));

    for (const segment of segments) {
        if (segment.trim().length === 0) continue;

        const match = segment.match(definitionStartRegex);
        if (!match) {
            throw new TypeError(`无效的变量定义: "${segment}"。应为 "name = value" 格式。`);
        }

        const name = match.groups!.name!;
        const matchLength = match[0]!.length;
        // The rest of the segment is the right-hand side source.
        const rhsSource = segment.substring(matchLength).trim();

        const definitionPayload = reconstructPayload(rhsSource, payload.values);
        definitions.push({ name, definitionPayload });
    }

    return definitions;
};

// Analyze "name = lower, upper" bounds definition
export const analyzeCtxVarBoundsDefinition = (payload: TemplatePayload): CtxVarBoundsDef => {
    const source = buildInspectableSource(payload);

    // Find comma positions that are at top level
    const commaIndices: number[] = [];
    const bracketsValid = iterativeCheckBrackets(source, (index, _, stack) => {
        if (source[index] === ',' && stack.length === 0) {
            commaIndices.push(index);
        }
    });
    
    if (!bracketsValid) {
        throw new TypeError(`括号不匹配：${source}`);
    }

    let lastIndex = 0;
    const segments: string[] = [];
    for (const commaIndex of commaIndices) {
        segments.push(source.substring(lastIndex, commaIndex));
        lastIndex = commaIndex + 1;
    }
    segments.push(source.substring(lastIndex));

    if (segments.length !== 2) {
        throw new TypeError(`无效的变量定义: "${source}"。应为 "name = lower, upper" 格式。`);
    }

    const lowerSegment = segments[0];
    const upperSegment = segments[1];

    // Extract the name & the lower payload
    if (lowerSegment.trim().length === 0) {
        throw new TypeError(`无效的变量定义: "${lowerSegment}"。应为 "name = lower" 格式。`);
    }

    const match = lowerSegment.match(definitionStartRegex);
    if (!match) {
        throw new TypeError(`无效的变量定义: "${lowerSegment}"。应为 "name = lower" 格式。`);
    }

    const name = match.groups!.name!;
    const matchLength = match[0]!.length;
    // The rest of the segment is the right-hand side source.
    const rhsSource = lowerSegment.substring(matchLength).trim();

    const lowerPayload = reconstructPayload(rhsSource, payload.values);

    // Extract the name & the upper payload
    if (upperSegment.trim().length === 0) {
        throw new TypeError(`无效的变量定义: "${upperSegment}"。应不为空段。`);    // 棍母
    }
    const upperPayload = reconstructPayload(upperSegment, payload.values);
    
    return { name, lower: lowerPayload, upper: upperPayload };
    
}