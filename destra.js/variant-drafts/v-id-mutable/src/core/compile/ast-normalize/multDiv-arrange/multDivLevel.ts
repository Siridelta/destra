import { MultDivArranger } from ".";
import { ImplicitMultASTNode, MultiplicationASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { possibleAmbiguousImages, toCharflowImage } from "../../../expr-dsl/syntax-reference/mathquill-charflow";


declare module '.' {
    interface MultDivArranger {
        chunkTop(node: PossibleChunkTopNode): PossibleChunkTopNode;
        charflowCheckAndBreak(node: ImplicitMultASTNode): ImplicitMultASTNode | (MultiplicationASTNode & { noSimplify: boolean });
        contactCheckAndBreak(node: ImplicitMultASTNode): ImplicitMultASTNode | (MultiplicationASTNode & { noSimplify: boolean });
    }
}



function isAmbiguousImplicitMult(left: any, right: any): boolean {
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


MultDivArranger.prototype.charflowCheckAndBreak = function (node: ImplicitMultASTNode): ImplicitMultASTNode | (MultiplicationASTNode & { noSimplify: boolean }){
    
    // predict charflow and check possible ambiguity
    
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
            let newRight: any = {
                type: 'implicitMult',
                operands: node.operands.slice(i + index + 1),
            }
            newRight = this.charflowCheckAndBreak(newRight);
            return {
                type: 'multiplication',
                left: {
                    type: 'implicitMult',
                    operands: node.operands.slice(0, i + index + 1),
                },
                right: newRight,
                noSimplify: true,
            }
        }
    }
    return node;
}



MultDivArranger.prototype.contactCheckAndBreak = function (node: ImplicitMultASTNode): ImplicitMultASTNode | (MultiplicationASTNode & { noSimplify: boolean }) {

    for (let i = 0; i < node.operands.length - 1; i++) {
        const left = node.operands[i];
        const right = node.operands[i + 1];
        if (isAmbiguousImplicitMult(left, right)) {
            let newRight: any = {
                type: 'implicitMult',
                operands: node.operands.slice(i + 1),
            }
            newRight = this.contactCheckAndBreak(newRight);
            return {
                type: 'multiplication',
                left: {
                    type: 'implicitMult',
                    operands: node.operands.slice(0, i + 1),
                },
                right: newRight,
                noSimplify: true,
            }
        }
    }
    return node;
}