import { ASTNormalizer1, wrapWithParentheses } from ".";
import { BuiltinFuncCallASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { ImplicitMultASTNode, isUpToImplicitMultLevelASTNode, isUpToMultDivLevelASTNode, MultiplicationASTNode, OmittedCallASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { possibleAmbiguousImages, toCharflowImage } from "../../../expr-dsl/syntax-reference/mathquill-charflow";

declare module '.' {
    interface ASTNormalizer1 {

        omittedCall(node: OmittedCallASTNode): OmittedCallASTNode | BuiltinFuncCallASTNode;

        implicitMult(node: ImplicitMultASTNode): ImplicitMultASTNode | MultiplicationASTNode;

    }
}

ASTNormalizer1.prototype.omittedCall = function (node: OmittedCallASTNode): OmittedCallASTNode | BuiltinFuncCallASTNode {
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

ASTNormalizer1.prototype.implicitMult = function (node: ImplicitMultASTNode): ImplicitMultASTNode | MultiplicationASTNode {
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

    // predict charflow and check possible ambiguity
    //
    // if ambiguous, return index that requires adding mult dot after
    // else return null
    const testCharflow = (imageTokens: string[]): number | null => {
        let testFlow = imageTokens.join('');
        for (let i = 0; i < imageTokens.length; i++) {
            for (const checkImage of possibleAmbiguousImages) {
                if (
                    testFlow.startsWith(checkImage)
                    && checkImage.length > imageTokens[i].length
                ) {
                    return i;
                }
            }
            testFlow = testFlow.slice(imageTokens[i].length);
        }
        return null;
    }
    const canStartCharflow = (node: any): boolean =>
        node.type === 'undefinedVar'
        || node.type === 'reservedVar'
        || node.type === 'contextVar'
        || node.type === 'substitution'
        || (
            node.type === 'extensionFuncCall'
            && node.withArgsList === false
        )
    const canContinueCharflow = (node: any): boolean =>
        node.type === 'undefinedVar'
        || node.type === 'reservedVar'
        || node.type === 'contextVar'
        || node.type === 'substitution';
    let i = 0, j = 0;  // j is an exclusive end index
    while (i < node.operands.length) {
        if (!canStartCharflow(node.operands[i])) {
            i++;
            continue;
        }
        j = i;
        let imageTokens: string[] = [];
        while (
            j < node.operands.length
            && (
                j === i
                || canContinueCharflow(node.operands[j])
            )
        ) {
            const currNode = node.operands[j];
            let destraImage: string | null = null;
            if (currNode.type === 'undefinedVar' || currNode.type === 'contextVar' || currNode.type === 'reservedVar') {
                destraImage = currNode.name;
            } else if (currNode.type === 'substitution') {
                const target = this.targetFormula.template.values[currNode.index];
                if (typeof target === 'number') {
                    destraImage = target.toString();
                } else {
                    destraImage = this.compileContext.globalRealnameMap.get(target) ?? null;
                    if (!destraImage) throw new Error(`Internal Error: Global realname not found for ${target}`);
                }
            } else if (currNode.type === 'extensionFuncCall') {
                destraImage = currNode.func.name;
            } else {
                throw new Error(`Internal Error: Unknown node type ${currNode.type}`);
            }

            const { image, turncate } = toCharflowImage(destraImage!);
            imageTokens.push(image);
            j++;     // move only if succeed to convert to charflow image
            if (turncate) break;
        }
        // Possible index needed to append a mult dot
        const index = testCharflow(imageTokens);
        if (index === null)
            i = j;
        else {
            // Potential inefficiency: the left part will be analyzed again in the revisit
            return this.visit({
                type: 'multiplication',
                left: {
                    type: 'implicitMult',
                    operands: node.operands.slice(0, i + index + 1),
                },
                right: {
                    type: 'implicitMult',
                    operands: node.operands.slice(i + index + 1),
                },
                noSimplify: true,
            });
        }
    }

    // visit at last
    node.operands = node.operands.map(operand => this.visit(operand));
    return node;
}

