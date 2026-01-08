import { formulaParser } from "../parsing/parser";
import { Substitutable } from "../../../formula/base";

export const BaseFormulaVisitor = formulaParser.getBaseCstVisitorConstructor();

export class FormulaVisitor extends BaseFormulaVisitor {
    public readonly values: readonly Substitutable[];

    constructor(values: readonly Substitutable[] = []) {
        super();
        this.values = values;
        this.validateVisitor();
    }

    batchVisit(ctx: any[]): any[] {
        if (!Array.isArray(ctx)) {
            throw new Error("Internal error: batchVisit should be called with an array.");
        }
        return ctx.map((c: any) => {
            if (c.name) {  // is CST
                return this.visit(c);
            }
            if (c.tokenType) {
                return c;
            }
            throw new Error(`Internal error: Invalid item in batchVisit: unexpected item type ${typeof c}.`);
        });
    }
}
