import { createToken, Lexer } from "chevrotain";
import { anyOf, createRegExp } from "magic-regexp";

export const Constant = createToken({
    name: "constant",
    pattern: Lexer.NA
});

export const PiConst = createToken({
    name: "piConst",
    pattern: createRegExp("pi"),
    categories: [Constant],
});

export const TauConst = createToken({
    name: "tauConst",
    pattern: createRegExp("tau"),
    categories: [Constant],
});

export const EConst = createToken({
    name: "eConst",
    pattern: createRegExp("e"),
    categories: [Constant],
});

export const InfinityConst = createToken({
    name: "infinityConst",
    pattern: createRegExp(anyOf("infinity", "infty")),
    categories: [Constant],
});

export const IConst = createToken({
    name: "iConst",
    pattern: createRegExp("i"),
    categories: [Constant],
});

export const WidthConst = createToken({
    name: "widthConst",
    pattern: createRegExp("width"),
    categories: [Constant],
});

export const HeightConst = createToken({
    name: "heightConst",
    pattern: createRegExp("height"),
    categories: [Constant],
});

export const constants = [
    PiConst, TauConst, EConst, InfinityConst, IConst, WidthConst, HeightConst,
    Constant,
];