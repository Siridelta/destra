import { createToken, Lexer } from "chevrotain";

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

export const builtinFuncCategories = [
    BuiltinFunc,
    SupportOmittedCallFunc,
    SupportExtensionFunc,
];