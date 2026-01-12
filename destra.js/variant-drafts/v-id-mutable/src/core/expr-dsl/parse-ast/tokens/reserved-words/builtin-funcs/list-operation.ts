import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./categories";

export const JoinFunc = createToken({ name: "joinFunc", pattern: createRegExp("join"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const SortFunc = createToken({ name: "sortFunc", pattern: createRegExp("sort"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const ShuffleFunc = createToken({ name: "shuffleFunc", pattern: createRegExp("shuffle"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const UniqueFunc = createToken({ name: "uniqueFunc", pattern: createRegExp("unique"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const RepeatFunc = createToken({ name: "repeatFunc", pattern: createRegExp("repeat"), categories: [BuiltinFunc, SupportExtensionFunc] });

export const listOperationBuiltinFuncs = [
    JoinFunc, SortFunc, ShuffleFunc, UniqueFunc, RepeatFunc
];
