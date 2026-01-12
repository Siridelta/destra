import { ASTVisitorWithDefault } from "../../../expr-dsl/visit-ast/visitor-withdefault";

/**
 * Normalize batch 3: finally add all necessary parentheses to prevent ambiguities in desmos
 * 
 * also expand numbers which is delayed to this batch
 */
export class ASTParenAdder extends ASTVisitorWithDefault<any, void> {
    
}

import './commasLevel';
import './multDivLevel';
import './prefixLevel';
import './atomic-exp';
