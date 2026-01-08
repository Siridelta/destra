import { createToken } from "chevrotain";
import { createRegExp, anyOf } from "magic-regexp";
import { BuiltinFunc, SupportOmittedCallFunc } from "./categories";

// --- Trigonometric Functions ---

// Basic
export const SinFunc = createToken({ name: "sinFunc", pattern: createRegExp("sin"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CosFunc = createToken({ name: "cosFunc", pattern: createRegExp("cos"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const TanFunc = createToken({ name: "tanFunc", pattern: createRegExp("tan"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CotFunc = createToken({ name: "cotFunc", pattern: createRegExp("cot"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const SecFunc = createToken({ name: "secFunc", pattern: createRegExp("sec"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CscFunc = createToken({ name: "cscFunc", pattern: createRegExp("csc"), categories: [BuiltinFunc, SupportOmittedCallFunc] });

// Inverse
export const ArcsinFunc = createToken({ name: "arcsinFunc", pattern: createRegExp(anyOf("arcsin", "asin")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccosFunc = createToken({ name: "arccosFunc", pattern: createRegExp(anyOf("arccos", "acos")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArctanFunc = createToken({ name: "arctanFunc", pattern: createRegExp(anyOf("arctan", "atan")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccotFunc = createToken({ name: "arccotFunc", pattern: createRegExp(anyOf("arccot", "acot")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArcsecFunc = createToken({ name: "arcsecFunc", pattern: createRegExp(anyOf("arcsec", "asec")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccscFunc = createToken({ name: "arccscFunc", pattern: createRegExp(anyOf("arccsc", "acsc")), categories: [BuiltinFunc, SupportOmittedCallFunc] });

// Hyperbolic
export const SinhFunc = createToken({ name: "sinhFunc", pattern: createRegExp("sinh"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CoshFunc = createToken({ name: "coshFunc", pattern: createRegExp("cosh"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const TanhFunc = createToken({ name: "tanhFunc", pattern: createRegExp("tanh"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CothFunc = createToken({ name: "cothFunc", pattern: createRegExp("coth"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const SechFunc = createToken({ name: "sechFunc", pattern: createRegExp("sech"), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const CschFunc = createToken({ name: "cschFunc", pattern: createRegExp("csch"), categories: [BuiltinFunc, SupportOmittedCallFunc] });

// Inverse Hyperbolic
export const ArcsinhFunc = createToken({ name: "arcsinhFunc", pattern: createRegExp(anyOf("arcsinh", "asinh")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccoshFunc = createToken({ name: "arccoshFunc", pattern: createRegExp(anyOf("arccosh", "acosh")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArctanhFunc = createToken({ name: "arctanhFunc", pattern: createRegExp(anyOf("arctanh", "atanh")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccothFunc = createToken({ name: "arccothFunc", pattern: createRegExp(anyOf("arccoth", "acoth")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArcsechFunc = createToken({ name: "arcsechFunc", pattern: createRegExp(anyOf("arcsech", "asech")), categories: [BuiltinFunc, SupportOmittedCallFunc] });
export const ArccschFunc = createToken({ name: "arccschFunc", pattern: createRegExp(anyOf("arccsch", "acsch")), categories: [BuiltinFunc, SupportOmittedCallFunc] });

export const trigonometricBuiltinFuncs = [
    // "sinh" first
    SinhFunc, CoshFunc, TanhFunc, CothFunc, SechFunc, CschFunc,
    ArcsinhFunc, ArccoshFunc, ArctanhFunc, ArccothFunc, ArcsechFunc, ArccschFunc,
    // "sin" second
    SinFunc, CosFunc, TanFunc, CotFunc, SecFunc, CscFunc,
    ArcsinFunc, ArccosFunc, ArctanFunc, ArccotFunc, ArcsecFunc, ArccscFunc,
];
