import { FormulaVisitor } from "./base-visitor";
import { ComparisonASTNode } from "./helpers";
import { SupportOmittedCallFunc } from "../tokens/reserved-words/builtin-funcs/categories";
import { RangeDots } from "../tokens/op-and-puncs";


declare module './base-visitor' {
    interface FormulaVisitor {
        postfixLevel(ctx: any): any;
        fromPostfix(ctx: any): any;
        factorial(ctx: any): any;
        fromDot(ctx: any): any;
        fromIndexer(ctx: any): any;
        indexerRestItem(ctx: any): any;

        toListSliceRangeASTNode(items: any[]): ListSliceRangeASTNode;
    }
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
    receiver: any,
    func: any,
    args: any[],
    withArgsList: boolean,
}
export type ListFilteringASTNode = {
    type: "listFiltering",
    operand: any,
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
export type ListSliceRangeASTNode = {
    type: "listSliceRange",
    start: any,
    end: any | null,
}

// vacancy need to be null (not undefined)
// return true if success, false if no vacancy is found and failed to add
function addToPostfixAST(obj: any, postfixAST: any): boolean {
    switch (postfixAST.type) {
        case 'factorial':
            if (postfixAST.operand === null) {
                postfixAST.operand = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.operand);
            }
        case 'attrAccess':
            if (postfixAST.obj === null) {
                postfixAST.obj = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.obj);
            }
        case 'extensionFuncCall':
            if (postfixAST.receiver === null) {
                postfixAST.receiver = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.receiver);
            }
        case 'listFiltering':
            if (postfixAST.operand === null) {
                postfixAST.operand = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.operand);
            }
        case 'listIndexing':
            if (postfixAST.operand === null) {
                postfixAST.operand = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.operand);
            }
        case 'listSlicing':
            if (postfixAST.operand === null) {
                postfixAST.operand = obj;
                return true;
            } else {
                return addToPostfixAST(obj, postfixAST.operand);
            }
        default:
            return false;
    }
}

FormulaVisitor.prototype.postfixLevel = function (ctx: any) {

    const [operand] = this.visit(ctx.atomicExp);
    const [postfixAST] = ctx.fromPostfix ? this.visit(ctx.fromPostfix) : [null];

    if (postfixAST) {
        if (addToPostfixAST(operand, postfixAST)) {
            return postfixAST;
        }
        throw new Error("Internal error: Failed to add to postfixAST");
    }
    return operand;
}

FormulaVisitor.prototype.fromPostfix = function (ctx: any) {
    if (!ctx.case) {
        throw new Error("Internal error: No case found for fromPostfix");
    }
    return this.visit(ctx.case);
}

FormulaVisitor.prototype.factorial = function (ctx: any) {
    const factorialAST = {
        type: "factorial",
        operand: null,    // vacancy
    }

    // no follow-up postfix syntaxes, return directly
    if (!ctx.fromPostfix[0]) {
        return factorialAST;
    }

    // follow-up postfix syntaxes, add to postfixAST
    const [postfixAST] = ctx.fromPostfix ? this.visit(ctx.fromPostfix) : [null];
    if (!postfixAST) {
        return factorialAST;
    } // else postfixAST exists
    if (addToPostfixAST(factorialAST, postfixAST)) {
        return postfixAST;
    }
    throw new Error("Internal error: Failed to add to postfixAST");
}

FormulaVisitor.prototype.fromDot = function (ctx: any) {
    const attr = ctx.attr?.[0]?.image ?? null;
    const extFunc = ctx.extFunc?.[0]?.image ?? null;
    const [argsList] = ctx.argsList ? this.visit(ctx.argsList) : [null];

    const dotAST =
        attr ?
            {
                type: "attrAccess",
                obj: null,    // vacancy
                attr: attr,
            } :
            extFunc ?
                {
                    type: "extensionFuncCall",
                    receiver: null,    // vacancy
                    func: extFunc,
                    args: argsList ?? [],
                    withArgsList: argsList !== null,
                } :
                null;

    if (!dotAST) {
        throw new Error("Internal error: No from-dot syntax found for fromDot");
    }


    // no follow-up postfix syntaxes, return directly
    if (!ctx.fromPostfix[0]) {
        return dotAST;
    }

    // follow-up postfix syntaxes, add to postfixAST
    const postfixAST = ctx.fromPostfix ? this.visit(ctx.fromPostfix) : [null];
    if (!postfixAST) {
        return dotAST;
    } // else postfixAST exists
    if (addToPostfixAST(dotAST, postfixAST)) {
        return postfixAST;
    }
    throw new Error("Internal error: Failed to add to postfixAST");
}

FormulaVisitor.prototype.toListSliceRangeASTNode = function (items: any[]): ListSliceRangeASTNode {
    if (items.length < 2 || items.length > 3) {
        throw new Error("Internal error: Invalid item syntax for listSliceRange: length must be 2 or 3");
    }
    if (!(items[1]?.tokenType === RangeDots)) {
        throw new Error("Internal error: Invalid item syntax for listSliceRange: second item must be RangeDots");
    }
    return {
        type: "listSliceRange",
        start: items[0],
        end: items.length === 3 ? items[2] : null,
    }
}

FormulaVisitor.prototype.fromIndexer = function (ctx: any) {
    const [firstFactor] = this.visit(ctx.firstFactor);
    const compOp1s = ctx.ComparisonOperator1 ? this.visit(ctx.ComparisonOperator1) : [];
    const compOp2s = ctx.ComparisonOperator2 ? this.visit(ctx.ComparisonOperator2) : [];
    const _compOperands = ctx.compOperand ? this.visit(ctx.compOperand) : [];
    const compOperands = [firstFactor, ..._compOperands];
    const firstItemRest = ctx.firstItemRest ? this.visit(ctx.firstItemRest) : [];
    const restItems = ctx.indexerRestItem ? this.visit(ctx.indexerRestItem) : [];
    const items = [...restItems];

    const indexerAST = (() => {
        // case: L[L1 > L2 < L3 < L4] or L[L1 = L2 == L3 == L4]
        if (compOp1s.length > 0 || compOp2s.length > 0) {
            if (compOp1s.length > 0 && compOp2s.length > 0) {
                throw new Error("Internal error: Invalid comparison operator syntax for fromIndexer: both ComparisonOperator1 and ComparisonOperator2 are present");
            }
            const compOps = compOp1s.length > 0 ? compOp1s : compOp2s;
            return {
                type: "listFiltering",
                operand: null,    // vacancy
                filter: {
                    type: "comparison",
                    operands: compOperands,
                    operators: compOps,
                },
            }
        }

        // case: L[1...3] or L[1...] or L[1,2,3] or L[1,2,...] or L[1,2,3,...]
        if (firstItemRest.length > 0) {
            items.unshift(
                this.toListSliceRangeASTNode([firstFactor, ...firstItemRest]),
            );
        } else {
            items.unshift(firstFactor);
        }

        // scan again to merge comma seperated expr-rangedots-expr patterns
        for (let i = 0; i < items.length; i++) {
            const item1 = i - 1 >= 0 ? items[i - 1] : null;
            const item2 = items[i];
            const item3 = i + 1 < items.length ? items[i + 1] : null;
            if (!(item2?.tokenType === RangeDots))
                continue;
            if (item3?.tokenType === RangeDots) // if we exclude dots after dots, we also excluded dots before dots
                throw new Error(
                    `Invalid indexer syntax: found consecutive '...' tokens. `
                );
            if (!item1)
                throw new Error(
                    `Cannot be blank before '...' token. `
                );
            if (!item3) {
                items.splice(i - 1, 2, this.toListSliceRangeASTNode([item1, item2]));
                i--;
            } else {
                items.splice(i - 1, 3, this.toListSliceRangeASTNode([item1, item2, item3]));
                i--;
            }
        }

        // if there is only one simple index, return listIndexingAST 
        // (which produce element rather than a list in desmos semantics)
        if (items.length === 1 && !(items[0]?.type === 'listSliceRange')) {
            return {
                type: "listIndexing",
                operand: null,    // vacancy
                index: items[0],
            };
        }

        return {
            type: "listSlicing",
            operand: null,    // vacancy
            indices: items,
        }
    })();

    const fromPostfixAST = ctx.fromPostfix ? this.visit(ctx.fromPostfix) : [null];
    if (!fromPostfixAST) {
        return indexerAST;
    } // else fromPostfixAST exists
    if (addToPostfixAST(indexerAST, fromPostfixAST)) {
        return fromPostfixAST;
    }
    throw new Error("Internal error: Failed to add to fromPostfixAST");
}

FormulaVisitor.prototype.indexerRestItem = function (ctx: any) {
    const items = ctx.item ? this.visit(ctx.item) : [];
    if (items.length === 0 || items.length > 3) {
        throw Error(`Internal Error: Invalid item syntax for indexerRestItem: unexpected token count ${items.length}`);
    }
    if (items.length === 1) {
        return items[0];
    }
    return this.toListSliceRangeASTNode(items);
}