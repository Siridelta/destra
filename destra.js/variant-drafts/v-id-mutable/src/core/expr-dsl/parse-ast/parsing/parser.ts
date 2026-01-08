import { BaseCstParser } from "./base-parser";
import { tokensList } from "../lexing/lexer";
import { initAddSubRules } from "./addsub-rules";
import { initMultDivRules } from "./multdiv-rules";
import { initAtomicRules } from "./atomic-rules";
import { initPiecewiseRules } from "./piecewise-rules";
import { initFormulaRules } from "./formula-rules";
import { initCtxHeaderRules } from "./ctx-header-rules";

export class FormulaParser extends BaseCstParser {

    constructor() {
        super(tokensList);

        initFormulaRules.call(this);
        initCtxHeaderRules.call(this);
        initAddSubRules.call(this);
        initMultDivRules.call(this);
        initAtomicRules.call(this);
        initPiecewiseRules.call(this);

        this.performSelfAnalysis();
    }

}

export const formulaParser = new FormulaParser();
