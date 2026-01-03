import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./categories";

// Random
export const RandomFunc = createToken({ name: "randomFunc", pattern: createRegExp("random"), categories: [BuiltinFunc, SupportExtensionFunc] });

// Distribution Objects
export const NormaldistFunc = createToken({ name: "normaldistFunc", pattern: createRegExp("normaldist"), categories: [BuiltinFunc] });
export const TdistFunc = createToken({ name: "tdistFunc", pattern: createRegExp("tdist"), categories: [BuiltinFunc] });
export const PoissondistFunc = createToken({ name: "poissondistFunc", pattern: createRegExp("poissondist"), categories: [BuiltinFunc] });
export const BinomialdistFunc = createToken({ name: "binomialdistFunc", pattern: createRegExp("binomialdist"), categories: [BuiltinFunc] });
export const UniformdistFunc = createToken({ name: "uniformdistFunc", pattern: createRegExp("uniformdist"), categories: [BuiltinFunc] });

// Distribution Functions
export const PdfFunc = createToken({ name: "pdfFunc", pattern: createRegExp("pdf"), categories: [BuiltinFunc] });
export const CdfFunc = createToken({ name: "cdfFunc", pattern: createRegExp("cdf"), categories: [BuiltinFunc] });
export const InversecdfFunc = createToken({ name: "inversecdfFunc", pattern: createRegExp("inversecdf"), categories: [BuiltinFunc] });

export const randomAndDistBuiltinFuncs = [
    RandomFunc,
    NormaldistFunc, TdistFunc, PoissondistFunc, BinomialdistFunc, UniformdistFunc,
    PdfFunc, CdfFunc, InversecdfFunc
];
