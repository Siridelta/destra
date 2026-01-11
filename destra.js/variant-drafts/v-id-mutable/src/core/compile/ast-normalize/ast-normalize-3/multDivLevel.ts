import { ASTNormalizer3 } from ".";
import { BuiltinFuncCallASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { CrossASTNode, DivisionASTNode, ImplicitMultASTNode, isUpToImplicitMultLevelASTNode, ModASTNode, MultDivLevelASTNode, MultiplicationASTNode, OmittedCallASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { removeChildParentheses, wrapWithParentheses } from "../utils";

declare module '.' {
    interface ASTNormalizer3 {

        multiplication(node: MultiplicationASTNode): MultiplicationASTNode | ImplicitMultASTNode;
        division(node: DivisionASTNode): DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode;
        cross(node: CrossASTNode): CrossASTNode;
        percentOf(node: PercentOfASTNode): PercentOfASTNode;
        multDivLevel<T extends MultDivLevelASTNode>(node: T): MultDivLevelASTNode | ImplicitMultASTNode;

        omittedCall(node: OmittedCallASTNode): OmittedCallASTNode | BuiltinFuncCallASTNode;

        implicitMult(node: ImplicitMultASTNode): ImplicitMultASTNode | MultiplicationASTNode;

    }
}

// In this batch we only add basic overflow protection (to mult/div level, not lower)
// and remove all parentheses inside mult-Div-IM levels,
// and pass top tags to idenfity chunked-processing entrypoints in the next batch.
ASTNormalizer3.prototype.multiplication = function (node: MultiplicationASTNode): MultiplicationASTNode | ImplicitMultASTNode { return this.multDivLevel(node) as MultiplicationASTNode | ImplicitMultASTNode; }
ASTNormalizer3.prototype.division = function (node: DivisionASTNode): DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode { return this.multDivLevel(node) as DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode; }
ASTNormalizer3.prototype.cross = function (node: CrossASTNode): CrossASTNode { return this.multDivLevel(node) as CrossASTNode; }
ASTNormalizer3.prototype.percentOf = function (node: PercentOfASTNode): PercentOfASTNode { return this.multDivLevel(node) as PercentOfASTNode; }
ASTNormalizer3.prototype.multDivLevel = function <T extends MultDivLevelASTNode>(node: T): MultDivLevelASTNode | ImplicitMultASTNode {
    let _node: MultDivLevelASTNode | ImplicitMultASTNode = { ...node };
    _node.left = this.visit(_node.left);
    _node.right = this.visit(_node.right);

    // if under mult/div/percentOf/IMult, remove parentheses first
    // the parentheses will be handled chunkedly in the next batch
    if (
        _node.type === 'multiplication' || _node.type === 'division' || _node.type === 'percentOf'
    ) {
        removeChildParentheses(_node, 'left');
        removeChildParentheses(_node, 'right');

        // chunk top tag
        (_node as any).multDivChunkTop = true;
        if (_node.left?.multDivChunkTop) {
            delete _node.left.multDivChunkTop;
        }
        if (_node.right?.multDivChunkTop) {
            delete _node.right.multDivChunkTop;
        }
    }

    // And also we will ignore cross afterwards, so we consistently wrap them at this moment
    // the behavior of cross is unclear for now, so we always wrap it (if in a multDiv/IM-level context) for safety
    if (_node.left.type === 'cross') {
        _node.left = wrapWithParentheses(_node.left);
    }
    if (_node.right.type === 'cross') {
        _node.right = wrapWithParentheses(_node.right);
    }

    return _node;
}

ASTNormalizer3.prototype.omittedCall = function (node: OmittedCallASTNode): OmittedCallASTNode | BuiltinFuncCallASTNode {
    let _node: OmittedCallASTNode | BuiltinFuncCallASTNode = { ...node };
    _node.func = this.visit(_node.func);
    _node.arg = this.visit(_node.arg);

    if (!isUpToImplicitMultLevelASTNode(_node.arg)) {
        _node.arg = wrapWithParentheses(_node.arg);
    }
    if (_node.arg.type === 'parenExp') {
        _node = {
            type: 'builtinFuncCall',
            func: _node.func,
            args: [_node.arg.content],
        }
    }
    return _node;
}

export function isAmbiguousImplicitMult(left: any, right: any): boolean {
    // case: right is parenExp. need to prevent ambiguity to function call & extension func call
    if (right.type === 'parenExp') {
        if (
            left.type === 'substitution'
            || left.type === 'undefinedVar'
            || left.type === 'contextVar'
            || (
                left.type === 'extensionFuncCall'
                && left.withArgsList === false
            )
        ) {
            return true;
        }
    }
    // case: right is listExp. need to prevent ambiguity to list indexing
    if (right.type === 'listExp') {
        if (
            left.type === 'substitution'
            || left.type === 'undefinedVar'
            || left.type === 'contextVar'
        ) {
            return true;
        }
    }
    return false;
}

ASTNormalizer3.prototype.implicitMult = function (node: ImplicitMultASTNode): ImplicitMultASTNode | MultiplicationASTNode {
    node = { ...node };

    // Some edge case that there is only 1 item
    if (node.operands.length === 1) {
        return this.visit(node.operands[0]);
    }

    node.operands = node.operands.map(operand => {

        // visit child first
        operand = this.visit(operand);

        // Remove parentheses in this batch
        operand = removeChildParentheses({ operand }, 'operand').operand;

        // Always wrap cross
        if (operand.type === 'cross') {
            operand = wrapWithParentheses(operand);
        }

        // remove top tag
        delete (operand as any).multDivChunkTop;

        return operand;
    });

    // chunk top tag
    (node as any).multDivChunkTop = true;

    return node;
}

