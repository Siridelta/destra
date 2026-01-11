import { DivisionASTNode, ImplicitMultASTNode, MultDivLevelASTNode, MultiplicationASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { ASTVisitorWithDefault } from "../../../expr-dsl/visit-ast/visitor-withdefault";
import { Formula } from "../../../formula/base";
import { CompileContext } from "../../types";

/**
 * Normalize batch 2: chunked process mult/div/IM chunks
 */
export class MultDivArranger extends ASTVisitorWithDefault<any, void> {
    public compileContext: CompileContext;
    public targetFormula: Formula;

    constructor(compileContext: CompileContext, targetFormula: Formula) {
        super();
        this.compileContext = compileContext;
        this.targetFormula = targetFormula;
    }
}


export type PossibleChunkTopNode =
    | MultiplicationASTNode
    | DivisionASTNode
    | PercentOfASTNode
    | ImplicitMultASTNode;


export interface MultDivArranger {

    multiplication(node: MultiplicationASTNode): PossibleChunkTopNode;
    division(node: DivisionASTNode): PossibleChunkTopNode;
    percentOf(node: PercentOfASTNode): PossibleChunkTopNode;
    multDivLevel<T extends MultDivLevelASTNode & PossibleChunkTopNode>(node: T): PossibleChunkTopNode;

    implicitMult(node: ImplicitMultASTNode): PossibleChunkTopNode;

}

// only visit children; if is chunkTop, dispatch to chunkTop branch
MultDivArranger.prototype.multiplication = function (node: MultiplicationASTNode): PossibleChunkTopNode { return this.multDivLevel(node); }
MultDivArranger.prototype.division = function (node: DivisionASTNode): PossibleChunkTopNode { return this.multDivLevel(node); }
MultDivArranger.prototype.percentOf = function (node: PercentOfASTNode): PossibleChunkTopNode { return this.multDivLevel(node); }
MultDivArranger.prototype.multDivLevel = function <T extends MultDivLevelASTNode & PossibleChunkTopNode>(node: T): PossibleChunkTopNode {
    node.left = this.visit(node.left);
    node.right = this.visit(node.right);

    if ((node as any).chunkTop === true) {
        delete (node as any).chunkTop;
        return this.chunkTop(node as PossibleChunkTopNode);
    }

    return node;
}
MultDivArranger.prototype.implicitMult = function (node: ImplicitMultASTNode): PossibleChunkTopNode {
    for (const i in node.operands) {
        node.operands[i] = this.visit(node.operands[i]);
    }

    if ((node as any).chunkTop === true) {
        delete (node as any).chunkTop;
        return this.chunkTop(node as PossibleChunkTopNode);
    }

    return node;
}









import './multDivLevel';

