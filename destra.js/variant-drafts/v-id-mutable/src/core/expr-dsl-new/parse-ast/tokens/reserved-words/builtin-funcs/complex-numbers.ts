import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./index";

export const RealFunc = createToken({ name: "realFunc", pattern: createRegExp("real"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const ImagFunc = createToken({ name: "imagFunc", pattern: createRegExp("imag"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const ArgFunc = createToken({ name: "argFunc", pattern: createRegExp("arg"), categories: [BuiltinFunc] });
export const ConjFunc = createToken({ name: "conjFunc", pattern: createRegExp("conj"), categories: [BuiltinFunc] });

export const complexNumbersBuiltinFuncs = [
    RealFunc, ImagFunc, ArgFunc, ConjFunc
];
