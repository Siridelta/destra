
import { Variable } from "../tokens/others";
import { ReservedVar } from "../tokens/reserved-words/reservedVars";
import { FormulaParser } from "./parser";

declare module './parser' {
    export interface FormulaParser {
        CtxVariable: any;
    }
}

export function initIdentifierRules(this: FormulaParser) {
    this.CtxVariable = this.RULE("CtxVariable", () => {
        this.OR([
            { ALT: () => this.CONSUME(Variable) },
            // ctx variables can override reserved variables
            { ALT: () => this.CONSUME(ReservedVar) },    
        ]);
    });

}