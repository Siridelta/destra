import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportOmittedCallFunc } from "./categories";


export const AbsFunc = createToken({
    name: "absFunc",
    pattern: createRegExp("abs"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const SqrtFunc = createToken({
    name: "sqrtFunc",
    pattern: createRegExp("sqrt"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const CbrtFunc = createToken({
    name: "cbrtFunc",
    pattern: createRegExp("cbrt"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const ExpFunc = createToken({
    name: "expFunc",
    pattern: createRegExp("exp"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const LnFunc = createToken({
    name: "lnFunc",
    pattern: createRegExp("ln"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const LogFunc = createToken({
    name: "logFunc",
    pattern: createRegExp("log"),
    categories: [BuiltinFunc, SupportOmittedCallFunc],
});

export const basicBuiltinFuncs = [
    AbsFunc,
    SqrtFunc,
    CbrtFunc,
    ExpFunc,
    LnFunc,
    LogFunc,
];