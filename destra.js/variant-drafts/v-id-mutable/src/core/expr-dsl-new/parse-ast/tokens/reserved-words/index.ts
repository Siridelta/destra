import { builtinFuncs } from "./builtin-funcs";
import { constants } from "./constants";
import { reservedVars } from "./reservedVars";

export const reservedWords = [
    ...builtinFuncs,
    ...constants,
    ...reservedVars,
];