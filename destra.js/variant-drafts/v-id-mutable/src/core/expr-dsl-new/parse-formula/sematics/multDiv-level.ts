import { FormulaVisitor } from "./base-visitor";
import { ComparisonASTNode } from "./helpers";


declare module './base-visitor' {
    interface FormulaVisitor {
        multDivLevel(ctx: any): any;
        omittedCallLevel(ctx: any): any;
        prefixLevel(ctx: any): any;
        rootofLevel(ctx: any): any;
        powerLevel(ctx: any): any;
        postfixLevel(ctx: any): any;
        fromPostfix(ctx: any): any;
        factorial(ctx: any): any;
        fromDot(ctx: any): any;
        fromIndexer(ctx: any): any;
    }
}

export type MultiplicationASTNode = {
    type: "multiplication",
    left: any,
    right: any,
}
export type DivisionASTNode = {
    type: "division",
    left: any,
    right: any,
}
export type OmittedCallASTNode = {
    type: "omittedCall",
    func: any,
    arg: any,
}
export type UnaryMinusASTNode = {
    type: "unaryMinus",
    operand: any,
}
export type UnaryPlusASTNode = {
    type: "unaryPlus",
    operand: any,
}
export type RootofASTNode = {
    type: "rootof",
    operand: any,
    index: any,
}
export type PowerASTNode = {
    type: "power",
    base: any,
    exponent: any,
}
export type FactorialASTNode = {
    type: "factorial",
    operand: any,
}
export type AttrAccessASTNode = {
    type: "attrAccess",
    obj: any,
    attr: any,
}
export type ExtensionFuncCallASTNode = {
    type: "extensionFuncCall",
    func: any,
    args: any[],
    withArgsList: boolean,
}
export type ListFilteringASTNode = {
    type: "listFiltering",
    filter: ComparisonASTNode
}
export type ListIndexingASTNode = {
    type: "listIndexing",
    operand: any,
    index: any,
}
export type ListSlicingASTNode = {
    type: "listSlicing",
    operand: any,
    indices: any[],
}


FormulaVisitor.prototype.multDivLevel = function (ctx: any) {
    // Transform to left-associative AST tree

    const [lhs] = this.visit(ctx.lhs);
    const operator = ctx.operator?.[0]?.image || null;
    const [rhs] = ctx.rhs ? this.visit(ctx.rhs) : [null];
    
    if (operator && rhs 
        && (rhs.type === 'multiplication' || rhs.type === 'division')) {
        // deep seek rhs's left-most mult/div child
        let currentNode = rhs;
        while (
            currentNode.left.type === 'multiplication' 
            || currentNode.left.type === 'division'
        ) {
            currentNode = currentNode.left;
        }
        // here currentNode is the left-most mult/div child
        currentNode.left = {
            type: operator === '*' ? 'multiplication' : 'division',
            left: lhs,
            right: currentNode.left,
        }
        return rhs;
    }
    if (operator && rhs) {
        return {
            type: operator === '*'? 'multiplication' : 'division',
            left: lhs,
            right: rhs,
        }
    }
    return lhs;
}

