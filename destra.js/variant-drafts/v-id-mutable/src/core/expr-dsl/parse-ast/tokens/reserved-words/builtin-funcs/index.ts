import { builtinFuncCategories } from "./categories";

import { basicBuiltinFuncs } from "./basic";
import { trigonometricBuiltinFuncs } from "./trigonometric";
import { numberTheoryBuiltinFuncs } from "./number-theory";
import { complexNumbersBuiltinFuncs } from "./complex-numbers";
import { geometryBuiltinFuncs } from "./geometry";
import { listOperationBuiltinFuncs } from "./list-operation";
import { statisticsBuiltinFuncs } from "./statistics";
import { randomAndDistBuiltinFuncs } from "./random-and-dist";
import { miscBuiltinFuncs } from "./misc";
import { colorsBuiltinFuncs } from "./colors";

// --- Tokens List Segment For Parser ---

export const builtinFuncs = [
    
    ...basicBuiltinFuncs,
    ...trigonometricBuiltinFuncs,
    ...numberTheoryBuiltinFuncs,
    ...complexNumbersBuiltinFuncs,
    ...geometryBuiltinFuncs,
    ...listOperationBuiltinFuncs,
    ...colorsBuiltinFuncs,
    ...statisticsBuiltinFuncs,
    ...randomAndDistBuiltinFuncs,
    ...miscBuiltinFuncs,

    ...builtinFuncCategories,
];
