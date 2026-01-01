import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./index";

export const SignFunc = createToken({ name: "signFunc", pattern: createRegExp("sign"), categories: [BuiltinFunc] });
export const RoundFunc = createToken({ name: "roundFunc", pattern: createRegExp("round"), categories: [BuiltinFunc] });
export const FloorFunc = createToken({ name: "floorFunc", pattern: createRegExp("floor"), categories: [BuiltinFunc] });
export const CeilFunc = createToken({ name: "ceilFunc", pattern: createRegExp("ceil"), categories: [BuiltinFunc] });
export const ModFunc = createToken({ name: "modFunc", pattern: createRegExp("mod"), categories: [BuiltinFunc] });

export const GcdFunc = createToken({ name: "gcdFunc", pattern: createRegExp("gcd"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const LcmFunc = createToken({ name: "lcmFunc", pattern: createRegExp("lcm"), categories: [BuiltinFunc, SupportExtensionFunc] });

export const NCrFunc = createToken({ name: "nCrFunc", pattern: createRegExp("nCr"), categories: [BuiltinFunc] });
export const NPrFunc = createToken({ name: "nPrFunc", pattern: createRegExp("nPr"), categories: [BuiltinFunc] });

export const numberTheoryBuiltinFuncs = [
    SignFunc, RoundFunc, FloorFunc, CeilFunc, ModFunc,
    GcdFunc, LcmFunc,
    NCrFunc, NPrFunc
];
