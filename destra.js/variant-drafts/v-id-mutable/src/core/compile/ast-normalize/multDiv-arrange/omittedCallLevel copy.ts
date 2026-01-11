import { MultDivArranger } from ".";
import { wrapWithParentheses } from "../utils";
import { BuiltinFuncCallASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { ImplicitMultASTNode, isUpToImplicitMultLevelASTNode, isUpToMultDivLevelASTNode, MultiplicationASTNode, OmittedCallASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { possibleAmbiguousImages, toCharflowImage } from "../../../expr-dsl/syntax-reference/mathquill-charflow";



export function isAmbiguousImplicitMult(left: any, right: any): boolean {
    // case: right is parenExp. need to prevent ambiguity to function call & extension func call
    // todo: should also check inside postfixExps
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

MultDivArranger.prototype.implicitMult2 = function (node: ImplicitMultASTNode): ImplicitMultASTNode | MultiplicationASTNode {
    node = { ...node };
    node.operands = node.operands.map(operand => {
        if (!isUpToMultDivLevelASTNode(operand)) {
            operand = wrapWithParentheses(operand);
        }
        return operand;
    });

    // check no nested implicit mult, and flatten if possible
    for (let i = 0; i < node.operands.length; i++) {
        const operand = node.operands[i];
        if (operand.type === 'implicitMult') {
            node.operands.splice(i, 1);
            node.operands.splice(i, 0, ...operand.operands);
            i--;
        }
    }

    if (node.operands.length === 1) {
        return this.visit(node.operands[0]);
    }

    for (let i = 0; i < node.operands.length - 1; i++) {
        const left = node.operands[i];
        const right = node.operands[i + 1];
        if (isAmbiguousImplicitMult(left, right)) {
            return this.visit({
                type: 'multiplication',
                left: {
                    type: 'implicitMult',
                    operands: node.operands.slice(0, i + 1),
                },
                right: {
                    type: 'implicitMult',
                    operands: node.operands.slice(i + 1),
                },
                noSimplify: true,
            });
        }
    }


    // visit at last
    node.operands = node.operands.map(operand => this.visit(operand));
    return node;
}

