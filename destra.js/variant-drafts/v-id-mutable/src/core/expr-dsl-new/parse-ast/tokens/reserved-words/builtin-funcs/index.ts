import { createToken, Lexer } from "chevrotain";

import { basicBuiltinFuncs } from "./basic";
import { trigonometricBuiltinFuncs } from "./trigonometric";
import { numberTheoryBuiltinFuncs } from "./number-theory";
import { complexNumbersBuiltinFuncs } from "./complex-numbers";
import { geometryBuiltinFuncs } from "./geometry";
import { listOperationBuiltinFuncs } from "./list-operation";
import { statisticsBuiltinFuncs } from "./statistics";
import { randomAndDistBuiltinFuncs } from "./random-and-dist";
import { miscBuiltinFuncs } from "./misc";

// --- Built-in Function Categories ---

export const BuiltinFunc = createToken({
    name: "builtinFunc",
    pattern: Lexer.NA
});

export const SupportOmittedCallFunc = createToken({
    name: "supportOmittedCallFunc",
    pattern: Lexer.NA
});

export const SupportExtensionFunc = createToken({
    name: "supportExtensionFunc",
    pattern: Lexer.NA
});

// token list
export const builtinFuncs = [
    ...basicBuiltinFuncs,
    ...trigonometricBuiltinFuncs,
    ...numberTheoryBuiltinFuncs,
    ...complexNumbersBuiltinFuncs,
    ...geometryBuiltinFuncs,
    ...listOperationBuiltinFuncs,
    ...statisticsBuiltinFuncs,
    ...randomAndDistBuiltinFuncs,
    ...miscBuiltinFuncs,
    SupportOmittedCallFunc,
    SupportExtensionFunc,
    BuiltinFunc,
];
