import { getASTChildPaths, getChildByPath, setChildByPath } from "../../expr-dsl/parse-ast/sematics/traverse-ast";
import { DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, PercentOfASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";
import { ASTVisitorWithDefault } from "../../expr-dsl/visit-ast/visitor-withdefault";
import { throughParenCall } from "./utils";

/**
 * Mark chunks in mult/div/IMs
 * mark the top nodes of chunks for later chunked processing
 */
export class MultDivChunkMarker extends ASTVisitorWithDefault<any, void> {

}

export type MultDivChunkMark = { multDivChunkTop: boolean }
export type MultiplicationASTNodeMarked = MultiplicationASTNode & MultDivChunkMark;
export type DivisionASTNodeMarked = DivisionASTNode & MultDivChunkMark;
export type PercentOfASTNodeMarked = PercentOfASTNode & MultDivChunkMark;
export type ImplicitMultASTNodeMarked = ImplicitMultASTNode & MultDivChunkMark;

type I1 = MultiplicationASTNode | DivisionASTNode | PercentOfASTNode;

export interface MultDivChunkMarker {

    multiplication(node: MultiplicationASTNode): MultiplicationASTNodeMarked;
    division(node: DivisionASTNode): DivisionASTNodeMarked;
    percentOf(node: PercentOfASTNode): PercentOfASTNodeMarked;
    multDivLevel<T extends I1>(node: T): T & MultDivChunkMark;

    implicitMult(node: ImplicitMultASTNode): ImplicitMultASTNodeMarked;

}


// In this batch we only pass top tags to idenfity chunked-processing entrypoints in the next batch.
MultDivChunkMarker.prototype.multiplication = function (node: MultiplicationASTNode): MultiplicationASTNodeMarked { return this.multDivLevel(node); }
MultDivChunkMarker.prototype.division = function (node: DivisionASTNode): DivisionASTNodeMarked { return this.multDivLevel(node); }
MultDivChunkMarker.prototype.percentOf = function (node: PercentOfASTNode): PercentOfASTNodeMarked { return this.multDivLevel(node); }
MultDivChunkMarker.prototype.multDivLevel = function <T extends I1>(node: T): T & MultDivChunkMark {

    node.left = this.visit(node.left);
    node.right = this.visit(node.right);

    // chunk top tag
    let _node = node as T & MultDivChunkMark;
    _node.multDivChunkTop = true;
    if (_node.left?.multDivChunkTop) {
        delete _node.left.multDivChunkTop;
    }
    if (_node.right?.multDivChunkTop) {
        delete _node.right.multDivChunkTop;
    }

    // division can manage through parenExp
    if (_node.type === 'division') {
        const deleteTag = (node: any) => {
            if (node?.multDivChunkTop) {
                delete node.multDivChunkTop;
            }
        }
        throughParenCall(_node.left, deleteTag);
        throughParenCall(_node.right, deleteTag);
    }

    return _node;
}

MultDivChunkMarker.prototype.implicitMult = function (node: ImplicitMultASTNode): ImplicitMultASTNodeMarked {

    let _node = node as ImplicitMultASTNodeMarked;

    _node.operands = _node.operands.map(operand => {
        operand = this.visit(operand);
        delete operand.multDivChunkTop;
        return operand;
    });

    _node.multDivChunkTop = true;

    return _node;
}

