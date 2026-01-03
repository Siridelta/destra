import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./categories";

// Aggregation
export const TotalFunc = createToken({ name: "totalFunc", pattern: createRegExp("total"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const MeanFunc = createToken({ name: "meanFunc", pattern: createRegExp("mean"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const MedianFunc = createToken({ name: "medianFunc", pattern: createRegExp("median"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const MinFunc = createToken({ name: "minFunc", pattern: createRegExp("min"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const MaxFunc = createToken({ name: "maxFunc", pattern: createRegExp("max"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const CountFunc = createToken({ name: "countFunc", pattern: createRegExp("count"), categories: [BuiltinFunc, SupportExtensionFunc] });

// Dispersion
export const StdevFunc = createToken({ name: "stdevFunc", pattern: createRegExp("stdev"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const StdevpFunc = createToken({ name: "stdevpFunc", pattern: createRegExp("stdevp"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const VarFunc = createToken({ name: "varFunc", pattern: createRegExp("var"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const VarpFunc = createToken({ name: "varpFunc", pattern: createRegExp("varp"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const MadFunc = createToken({ name: "madFunc", pattern: createRegExp("mad"), categories: [BuiltinFunc, SupportExtensionFunc] });

// Correlation
export const CovFunc = createToken({ name: "covFunc", pattern: createRegExp("cov"), categories: [BuiltinFunc] });
export const CovpFunc = createToken({ name: "covpFunc", pattern: createRegExp("covp"), categories: [BuiltinFunc] });
export const CorrFunc = createToken({ name: "corrFunc", pattern: createRegExp("corr"), categories: [BuiltinFunc] });
export const SpearmanFunc = createToken({ name: "spearmanFunc", pattern: createRegExp("spearman"), categories: [BuiltinFunc] });

// Quantile
export const QuantileFunc = createToken({ name: "quantileFunc", pattern: createRegExp("quantile"), categories: [BuiltinFunc, SupportExtensionFunc] });
export const QuartileFunc = createToken({ name: "quartileFunc", pattern: createRegExp("quartile"), categories: [BuiltinFunc, SupportExtensionFunc] });

export const statisticsBuiltinFuncs = [
    TotalFunc, MeanFunc, MedianFunc, MinFunc, MaxFunc, CountFunc,
    StdevFunc, StdevpFunc, VarFunc, VarpFunc, MadFunc,
    CovFunc, CovpFunc, CorrFunc, SpearmanFunc,
    QuantileFunc, QuartileFunc
];
