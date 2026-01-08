import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc } from "./categories";

export const ToneFunc = createToken({
    name: "toneFunc",
    pattern: createRegExp("tone"),
    categories: [BuiltinFunc],
});

export const miscBuiltinFuncs = [
    ToneFunc,
];