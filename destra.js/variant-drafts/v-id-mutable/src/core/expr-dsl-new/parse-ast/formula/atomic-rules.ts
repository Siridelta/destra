import { FormulaParser } from "./parser";
import "./identifier-rules";

declare module './parser' {
    export interface FormulaParser {
        atomicLevel: any;
    }
}

export function initAddSubRules(this: FormulaParser) {
    this.atomicLevel = this.RULE("atomicLevel", () => {


}