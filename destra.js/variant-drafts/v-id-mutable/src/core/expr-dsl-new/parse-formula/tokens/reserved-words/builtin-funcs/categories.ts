import { createToken, Lexer } from "chevrotain";

// --- Built-in Function Categories ---

export const BuiltinFunc = createToken({
    name: "BuiltinFunc",
    pattern: Lexer.NA
});

export const SupportOmittedCallFunc = createToken({
    name: "SupportOmittedCallFunc",
    pattern: Lexer.NA
});

export const SupportExtensionFunc = createToken({
    name: "SupportExtensionFunc",
    pattern: Lexer.NA
});

export const builtinFuncCategories = [
    BuiltinFunc,
    SupportOmittedCallFunc,
    SupportExtensionFunc,
];