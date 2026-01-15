import { CtxVar, Dt, Formula, RegrParam } from "./base";

import { Image } from "./image";

export type NoAst = CtxVar | RegrParam | Dt | Image;

export const isNoAst = (formula: Formula): formula is NoAst => {
    return formula instanceof CtxVar || formula instanceof RegrParam || formula instanceof Dt || formula instanceof Image;
}
