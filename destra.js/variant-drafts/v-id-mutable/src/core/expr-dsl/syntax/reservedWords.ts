
// 临时打表保留字，供 analyzeType 等使用
// 后续需改造成由 parseAst 或者其他文件，从原理出发计算得出

import { specialSymbolsMap } from "./specialSymbols";


// 保留字(常量、保留变量、内置函数)；
// 要求：在 wordChar 范围内
export const reservedWords1 = [
    // 保留变量
    "x", "y", "z", "t", "r", "theta", specialSymbolsMap.theta, "phi", specialSymbolsMap.phi, "rho", specialSymbolsMap.rho,
    // 常量
    "e", "pi", specialSymbolsMap.pi, "tau", specialSymbolsMap.tau, "i", "infty", specialSymbolsMap.infty,
    // 视图 API 变量
    "width", "height",
    // 内置函数
    "root", "abs", "sqrt", "cbrt", "exp", "log", "ln", 
] as const;
export const reservedWords2 = [
    "sin", "cos", "tan", "cot", "sec", "csc",
    // "asin-1", "acos-1", "atan-1", "acot-1", "asec-1", "acsc-1",  // 这些"-1" aliases 是包含横线的....很可能会让 analyzeType 的正则匹配很难处理，暂时先不支持了qwq
    "sin2", "cos2", "tan2", "cot2", "sec2", "csc2",
    // "sin-1", "cos-1", "tan-1", "cot-1", "sec-1", "csc-1",
    "asin", "acos", "atan", "acot", "asec", "acsc",
    "asin2", "acos2", "atan2", "acot2", "asec2", "acsc2",
] as const;
export const reservedWords3 = [
    "sinh", "cosh", "tanh", "coth", "sech", "csch", 
    // "asinh-1", "acosh-1", "atanh-1", "acoth-1", "asech-1", "acsch-1",
    "sinh2", "cosh2", "tanh2", "coth2", "sech2", "csch2",
    // "sinh-1", "cosh-1", "tanh-1", "coth-1", "sech-1", "csch-1", 
    "asinh", "acosh", "atanh", "acoth", "asech", "acsch",
    "asinh2", "acosh2", "atanh2", "acoth2", "asech2", "acsch2",
] as const;
export const reservedWords4 = [
    "gcd", "lcm", "mod", "ceil", "floor", "round", "sign", "nPr", "nCr",
    "real", "imag", "arg", "conj",
    "midpoint", "distance", "polygon", "length",
    "join", "sort", "shuffle", "unique",
] as const;
export const reservedWords5 = [
    "mean", "median", "min", "max", "quartile", "quantile", "stdev", "stdevp", "var", "varp", "mad", "cov", "covp", "corr", "spearman", "stats", "count", "total",
    "ttest", "tscore", "ittest",
    "normaldist", "tdist", "poissondist", "binomialdist", "uniformdist",
    "pdf", "cdf", "inversecdf",
    "random",
] as const;
export const reservedWords = [
    ...reservedWords1,
    ...reservedWords2,
    ...reservedWords3,
    ...reservedWords4,
    ...reservedWords5,
] as const;

// 后缀保留字(需要保留的所有 "a.word" 语法，例如 "p1.x"、"list1.sort" 等。这限制了在多分段 id 的最尾段不能为这些保留字之一)
// 看起来基本都在 reservedWords 中，所以我们假设所有 suffixReservedWords 都是 reservedWords 的子集
// 要求：在 wordChar 范围内
export const suffixReservedWords = [
    "lcm", "gcd",
    "real", "imag",
    "x", "y", "z", "length",
    "join", "sort", "shuffle", "unique",
    "mean", "median", "min", "max", "quartile", "quantile", "stdev", "stdevp", "var", "varp", "mad", "count", "total",
    "ttest", "tscore", "ittest",
    "normaldist", "tdist", "poissondist", "binomialdist", "uniformdist",
    "pdf", "cdf", "inversecdf",
    "random",
] as const;