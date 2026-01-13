import { ASTVisitorWithDefault } from "../../../expr-dsl/visit-ast/visitor-withdefault";
import { Formula } from "../../../formula/base";
import { checkLevelWithSubst } from "../utils";

/**
 * Normalize batch 3: finally add all necessary parentheses to prevent ambiguities in desmos
 * 
 * also expand numbers which is delayed to this batch
 */
export class ASTParenAdder extends ASTVisitorWithDefault<any, void> {
    public targetFormula: Formula;

    constructor(targetFormula: Formula) {
        super();
        this.targetFormula = targetFormula;
    }

    public checkLevelWithSubst(
        node: any,
        checkLevel: (node: any) => boolean,
        config?: {
            onNonFormula?: boolean | ((value: any) => boolean);
            onCtxExp?: boolean | ((f: Formula) => boolean);
            onNoAst?: boolean | (() => boolean);
            hostFormula?: Formula;
        }
    ): boolean {
        return checkLevelWithSubst(node, checkLevel, {
            hostFormula: this.targetFormula,
            ...(config ?? {}),
        });
    }

}


import './atomic-exp';
import './commasLevel';
import './multDivLevel';
import './prefixLevel';

