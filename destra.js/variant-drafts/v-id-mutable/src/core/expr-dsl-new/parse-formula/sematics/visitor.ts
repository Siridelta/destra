import { formulaParser } from "../parsing/parser";

export const BaseFormulaVisitor = formulaParser.getBaseCstVisitorConstructor();

export class FormulaVisitor extends BaseFormulaVisitor {

    constructor() {
        super();
        this.validateVisitor();
    }

    




















}

export const formulaVisitor = new FormulaVisitor();