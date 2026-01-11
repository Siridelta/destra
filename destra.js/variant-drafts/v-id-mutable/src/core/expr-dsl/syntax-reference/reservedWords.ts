

// 保留字(常量、保留变量、内置函数)；
// 要求：在 wordChar 范围内
export const reservedVars = [
    "x", "y", "z", "t", "u", "v", "r", "theta", "phi", "rho",
] as const;
export const attrs = ["x", "y", "z"] as const;
export const builtInConsts = [
    // 常量
    "e", "pi", "tau", "i", "infty", "infinity",
    // 视图 API 变量
    "width", "height",
] as const;

export const builtInFuncs1 = [
    // 内置函数
    "root", "abs", "sqrt", "cbrt", "exp", "log", "ln",
] as const;
export const builtInFuncs2 = [
    "sin", "cos", "tan", "cot", "sec", "csc",
    "sin2", "cos2", "tan2", "cot2", "sec2", "csc2",
    "asin", "acos", "atan", "acot", "asec", "acsc",
    "asin2", "acos2", "atan2", "acot2", "asec2", "acsc2",
] as const;
export const builtInFuncs3 = [
    "sinh", "cosh", "tanh", "coth", "sech", "csch",
    "sinh2", "cosh2", "tanh2", "coth2", "sech2", "csch2",
    "asinh", "acosh", "atanh", "acoth", "asech", "acsch",
    "asinh2", "acosh2", "atanh2", "acoth2", "asech2", "acsch2",
] as const;
export const builtInFuncs4 = [
    "gcd", "lcm", "mod", "ceil", "floor", "round", "sign", "nPr", "nCr",
    "real", "imag", "arg", "conj",
    "midpoint", "distance", "polygon", "length",
    "join", "sort", "shuffle", "unique",
    "rgb", "hsv", "okhsv", "oklab", "oklch",
] as const;
export const builtInFuncs5 = [
    "mean", "median", "min", "max", "quartile", "quantile", "stdev", "stdevp", "var", "varp", "mad", "cov", "covp", "corr", "spearman", "stats", "count", "total",
    "ttest", "tscore", "ittest",
    "normaldist", "tdist", "poissondist", "binomialdist", "uniformdist",
    "pdf", "cdf", "inversecdf",
    "random",
] as const;
export const reservedWords = [
    ...reservedVars,
    ...builtInConsts,
    ...builtInFuncs1,
    ...builtInFuncs2,
    ...builtInFuncs3,
    ...builtInFuncs4,
    ...builtInFuncs5,
] as const;
export const builtInFuncs = [
    ...builtInFuncs1,
    ...builtInFuncs2,
    ...builtInFuncs3,
    ...builtInFuncs4,
    ...builtInFuncs5,
] as const;

export const pureAttrs = [
    "x", "y", "z"
] as const;

export const extensionFuncs = [
    "lcm", "gcd",
    "real", "imag",
    "length",
    "join", "sort", "shuffle", "unique",
    "total", "mean", "median", "min", "max", "count", "quartile", "quantile", "stdev", "stdevp", "var", "varp", "mad", "count", "total",
    "ttest", "tscore", "ittest",
    "normaldist", "tdist", "poissondist", "binomialdist", "uniformdist",
    "pdf", "cdf", "inversecdf",
    "random",
] as const;