import { MultDivArranger } from "./base";
import { DivisionASTNode, isPrefixLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { isPostfixLevelASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/postfix-level";
import { possibleAmbiguousImages, toCharflowImage } from "../../../expr-dsl/syntax-reference/mathquill-charflow";
import { Leaf, PercentIR } from "./collapse";
import { stringifyFormula } from "../../../error";


declare module './base' {
    interface MultDivArranger {
        charflowCheckAndBreak(items: I[]): I[][];
        contactCheckAndBreak(items: I[]): I[][];
    }
}

type I = PercentIR | Leaf | DivisionASTNode;

function isAmbiguousContact(left: I, right: I): boolean {
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
    // case: right is listExp. seems always ambiguous
    if (right.type === 'listExp') {
        return true;
    }
    // case: right is prefixExp. seems always ambiguous
    if (isPrefixLevelASTNode(right)) {
        return true;
    }
    // case: for scientific notation, although not ambiguous, it looks nicer to break
    if (
        (right.type === 'number' && right.exponent !== undefined)
        || (left.type === 'number' && left.exponent !== undefined)
    ) {
        return true;
    }
    // case: well do not put two numbers next to each other
    if (left.type === 'number' && right.type === 'number') {
        return true;
    }
    return false;
}


MultDivArranger.prototype.contactCheckAndBreak = function (items: I[]): I[][] {
    const fragments: I[][] = [];
    let lastIndex = 0;
    for (let i = 0; i < items.length - 1; i++) {
        const left = items[i];
        const right = items[i + 1];
        if (isAmbiguousContact(left, right)) {
            fragments.push(...this.charflowCheckAndBreak(items.slice(lastIndex, i + 1)));
            lastIndex = i + 1;
        }
    }
    fragments.push(...this.charflowCheckAndBreak(items.slice(lastIndex)));
    return fragments;
}


MultDivArranger.prototype.charflowCheckAndBreak = function (items: I[]): I[][] {

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
        || (
            isPrefixLevelASTNode(node)
            && canStartCharflow(node.operand)
        )
    const canContinueCharflow = (node: any): boolean =>
        node.type === 'undefinedVar'
        || node.type === 'reservedVar'
        || node.type === 'contextVar'
        || node.type === 'substitution';
    const canEndCharflow = (node: any): boolean =>
        node.type === 'builtinFuncCall'
        || (
            isPostfixLevelASTNode(node)
            && canEndCharflow(node.type === 'extensionFuncCall' ? node.receiver : node.operand)
        )

    const fragments: I[][] = [];

    let i0 = 0; 
    let i = 0, j = 0;  // j is an exclusive end index
    while (i < items.length) {

        // --- Sketch charflow range (start index -> end index) ---
        if (!canStartCharflow(items[i])) {
            i++;
            continue;
        }
        j = i;
        let imageTokens: string[] = [];
        while (
            j < items.length
            && (
                j === i
                || canContinueCharflow(items[j])
                || canEndCharflow(items[j])
            )
        ) {
            let currNode: any = items[j];
            let destraImage: string | null = null;
            while (true) {
                if (isPrefixLevelASTNode(currNode)) {
                    currNode = currNode.operand;
                    continue;
                } else if (isPostfixLevelASTNode(currNode)) {
                    currNode = currNode.type === 'extensionFuncCall'
                        ? (j === i ? currNode.func : currNode.receiver) 
                        : currNode.operand;
                    continue;
                }
                break;
            }
            if (currNode.type === 'undefinedVar' || currNode.type === 'contextVar' || currNode.type === 'reservedVar') {
                destraImage = currNode.name;
            } else if (currNode.type === 'substitution') {
                const target = this.targetFormula.template.values[currNode.index];
                if (typeof target === 'number') {
                    destraImage = target.toString();
                } else {
                    destraImage = this.compileContext.globalRealnameMap.get(target) ?? null;
                    if (!destraImage) throw new Error(`Internal Error: Global realname not found for ${stringifyFormula(target)}`);
                }
            } else if (currNode.type === 'builtinFunc') {
                destraImage = currNode.name;
            } else {
                throw new Error(`Internal Error: Unknown node type ${currNode.type}`);
            }

            const { image, turncate } = toCharflowImage(destraImage!);
            imageTokens.push(image);
            j++;                    // move only if succeed to convert to charflow image
            if (turncate || canEndCharflow(currNode)) break;
        }
        // Possible index needed to append a mult dot
        const index = testCharflow(imageTokens);
        if (index === null)
            i = j;
        else {
            fragments.push(items.slice(i0, i + index + 1));
            i0 = i + index + 1;
            i = i + index;
        }
    }
    fragments.push(items.slice(i0));
    return fragments;
}

