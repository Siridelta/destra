import { MultDivArranger } from "./base";
import { ParenExpASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { throughParenGet } from "../utils";
import { DivisionIR, Leaf, MultChainIR, ParenIR, PercentIR } from "./collapse";


declare module './base' {
    interface MultDivArranger {
        convertBack<T extends MultChainIR['operands'][number]>(items: T):
            T extends MultChainIR ? ImplicitMultASTNode | MultiplicationASTNode | PercentOfASTNode :
            T extends DivisionIR ? DivisionASTNode :
            T extends PercentIR ? PercentIR :
            T extends ParenIR ? ParenExpASTNode :
            T extends Leaf ? Leaf :
            never;
    }
}

function _convertBack(this: MultDivArranger, node: MultChainIR): ImplicitMultASTNode | MultiplicationASTNode | PercentOfASTNode;
function _convertBack(this: MultDivArranger, node: DivisionIR): DivisionASTNode;
function _convertBack(this: MultDivArranger, node: PercentIR): PercentIR;
function _convertBack(this: MultDivArranger, node: ParenIR): ParenExpASTNode;
function _convertBack(this: MultDivArranger, node: Leaf): Leaf;
function _convertBack(this: MultDivArranger, node: MultChainIR['operands'][number]):
    ImplicitMultASTNode | MultiplicationASTNode | PercentOfASTNode | DivisionASTNode | PercentIR | ParenExpASTNode | Leaf {

    if (node.type === 'divisionIR') {
        return {
            type: 'division',
            left: throughParenGet(this.convertBack(node.left)),
            right: throughParenGet(this.convertBack(node.right)),
        };
    } else if (node.type === 'percentIR') {
        return node;
    } else if (node.type === 'parenIR') {
        return {
            type: 'parenExp',
            content: this.convertBack(node.content),
        };
    } else if (node.type !== 'multChainIR') {
        return node;
    }

    // Assert there is no multChainIR in the operands
    // cuz we've flattened it in the collapse2 step
    const operands = (node.operands as (DivisionIR | PercentIR | Leaf | ParenIR)[]).map(operand => this.convertBack(operand));
    const fragments = this.contactCheckAndBreak(operands);
    let currNode: ImplicitMultASTNode | MultiplicationASTNode | PercentOfASTNode | DivisionASTNode | PercentOfASTNode | Leaf | null = null;
    let nextType: 'percentOf' | 'multiplication' | null = null;
    let nextRhsChain: (DivisionASTNode | Leaf)[] = [];

    const buildNode = (type: 'percentOf' | 'multiplication') => {
        if (nextRhsChain.length === 0) {
            return null;
        }
        let right: DivisionASTNode | Leaf | ImplicitMultASTNode;
        if (nextRhsChain.length === 1) {
            right = nextRhsChain[0];
        } else {
            right = {
                type: 'implicitMult',
                operands: nextRhsChain,
            } satisfies ImplicitMultASTNode;
        }
        nextRhsChain = [];
        if (currNode === null) {
            currNode = right;
            nextType = type;
        } else {
            currNode = {
                type: nextType!,
                left: currNode,
                right: right,
            } satisfies MultiplicationASTNode | PercentOfASTNode;
            nextType = type;
        }
        return currNode;
    }

    for (const fragment of fragments) {
        for (const node of fragment) {
            if (node.type === 'percentIR') {
                const r = buildNode('percentOf');
                if (r === null) throw new Error('Failed to build node for percentIR');
            } else {
                nextRhsChain.push(node);
            }
        }
        buildNode('multiplication');
    }
    if (currNode === null) throw new Error('Failed to build node for multChainIR');
    return currNode;
}
MultDivArranger.prototype.convertBack = _convertBack;