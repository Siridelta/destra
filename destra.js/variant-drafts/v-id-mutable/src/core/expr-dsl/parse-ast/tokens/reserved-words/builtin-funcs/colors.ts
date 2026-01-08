import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc } from "./categories";

export const rgbFunc = createToken({ name: "rgbFunc", pattern: createRegExp("rgb"), categories: [BuiltinFunc] });
export const hsvFunc = createToken({ name: "hsvFunc", pattern: createRegExp("hsv"), categories: [BuiltinFunc] });
export const okhsvFunc = createToken({ name: "okhsvFunc", pattern: createRegExp("okhsv"), categories: [BuiltinFunc] });
export const oklabFunc = createToken({ name: "oklabFunc", pattern: createRegExp("oklab"), categories: [BuiltinFunc] });
export const oklchFunc = createToken({ name: "oklchFunc", pattern: createRegExp("oklch"), categories: [BuiltinFunc] });

export const colorsBuiltinFuncs = [
    rgbFunc, hsvFunc, okhsvFunc, oklabFunc, oklchFunc
];