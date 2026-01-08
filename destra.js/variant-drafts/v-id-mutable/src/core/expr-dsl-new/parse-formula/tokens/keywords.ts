import { createToken } from "chevrotain";
import { createRegExp, exactly, whitespace } from "magic-regexp";
import { ctxVarNameExcludePattern, identifierPattern } from "../../syntax-reference/commonRegExpPatterns";

// --- Keywords ---

export const ForKeyword = createToken({
    name: "forKeyword",
    pattern: createRegExp("for"),
});

export const WithKeyword = createToken({
    name: "withKeyword",
    pattern: createRegExp("with"),
});

export const SumKeyword = createToken({
    name: "sumKeyword",
    pattern: createRegExp("sum"),
});

export const ProdKeyword = createToken({
    name: "prodKeyword",
    pattern: createRegExp("prod"),
});

export const IntKeyword = createToken({
    name: "intKeyword",
    pattern: createRegExp("int"),
});

// "in" may override builtin funcs like "inversecdf"
// so require whitespace after it
export const InKeyword = createToken({
    name: "inKeyword",
    pattern: createRegExp("in", whitespace.times.atLeast(1)),
});

export const DiffKeyword = createToken({
    name: "diffKeyword",
    pattern: createRegExp(
        exactly("d/d")
            .before(identifierPattern)
            .notBefore(ctxVarNameExcludePattern),
    ),
});

export const Int_dVarKeyword = createToken({
    name: "int_dVarKeyword",
    pattern: createRegExp(
        exactly("d")
            .before(identifierPattern)
            .notBefore(ctxVarNameExcludePattern),
    ),
});

export const RootofKeyword = createToken({
    name: "rootofKeyword",
    pattern: createRegExp("rootof"),
});

export const keywords = [
    ForKeyword,
    WithKeyword,
    SumKeyword,
    ProdKeyword,
    IntKeyword,
    InKeyword,
    DiffKeyword,
    Int_dVarKeyword,
    RootofKeyword,
];