import { MultDivArranger, MultDivChunkNode } from ".";
import { DivisionASTNode, ImplicitMultASTNode, MultiplicationASTNode, OmittedCallASTNode, PercentOfASTNode, UpToPrefixLevel } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { throughParenGet } from "../utils";


declare module '.' {
    interface MultDivArranger {
        toIR<T extends MultDivChunkNode | Leaf>(node: T): 
            T extends MultiplicationASTNode ? MultChainIR :
            T extends DivisionASTNode ? DivisionIR :
            T extends PercentOfASTNode ? MultChainIR :
            T extends ImplicitMultASTNode ? MultChainIR :
            T;
        collapse<T extends MultChainIR | DivisionIR | PercentIR | Leaf | ParenIR>(node: T): T;
    }
}

export type Leaf = OmittedCallASTNode | UpToPrefixLevel;
// a %of b -> [a], [%of], [b] in a mult chain
export type PercentIR = {
    type: 'percentIR';
}
export type DivisionIR = {
    type: 'divisionIR';
    left: MultChainIR | DivisionIR | Leaf | ParenIR;
    right: MultChainIR | DivisionIR | Leaf | ParenIR;
}
export type MultChainIR = {
    type: 'multChainIR';
    operands: (DivisionIR | PercentIR | Leaf | MultChainIR | ParenIR)[];
}
export type ParenIR = {
    type: 'parenIR';
    content: MultChainIR | DivisionIR | Leaf;
}

function _toIR(this: MultDivArranger, node: MultiplicationASTNode): MultChainIR;
function _toIR(this: MultDivArranger, node: DivisionASTNode): DivisionIR;
function _toIR(this: MultDivArranger, node: PercentOfASTNode): MultChainIR;
function _toIR(this: MultDivArranger, node: ImplicitMultASTNode): MultChainIR;
function _toIR(this: MultDivArranger, node: Leaf): Leaf;
function _toIR(this: MultDivArranger, node: MultDivChunkNode | Leaf): MultChainIR | DivisionIR | Leaf {
    if (node.type === 'multiplication') {
        const left = this.toIR(node.left);
        const right = this.toIR(node.right);
        return {
            type: 'multChainIR',
            operands: [left, right],
        };
    } else if (node.type === 'division') {
        // We need to keep parentheses, as it contains information about how we select the fractions
        const isLeftParenExp = node.left.type === 'parenExp';
        const isRightParenExp = node.right.type === 'parenExp';
        return {
            type: 'divisionIR',
            left: isLeftParenExp
                ? { type: 'parenIR', content: this.toIR(throughParenGet(node.left)) }
                : this.toIR(node.left),
            right: isRightParenExp
                ? { type: 'parenIR', content: this.toIR(throughParenGet(node.right)) }
                : this.toIR(node.right),
        };
    } else if (node.type === 'percentOf') {
        const left = this.toIR(node.left);
        const right = this.toIR(node.right);
        return {
            type: 'multChainIR',
            operands: [left, { type: 'percentIR' }, right],
        };
    } else if (node.type === 'implicitMult') {
        const operands = node.operands.map(operand => this.toIR(operand))
        return {
            type: 'multChainIR',
            operands,
        };
    } else {
        return node;
    }
}
MultDivArranger.prototype.toIR = _toIR;

function _collapse(this: MultDivArranger, node: MultChainIR): MultChainIR;
function _collapse(this: MultDivArranger, node: DivisionIR): DivisionIR;
function _collapse(this: MultDivArranger, node: PercentIR): PercentIR;
function _collapse(this: MultDivArranger, node: Leaf): Leaf;
function _collapse(this: MultDivArranger, node: ParenIR): ParenIR;
function _collapse(this: MultDivArranger, node: MultChainIR | DivisionIR | PercentIR | Leaf | ParenIR): MultChainIR | DivisionIR | PercentIR | Leaf | ParenIR {
    if (node.type === 'multChainIR') {
        const operands = node.operands.map(operand => this.collapse(operand));
        const newOperands = [];
        for (const operand of operands) {
            if (operand.type === 'multChainIR') {
                newOperands.push(...operand.operands);
            } else {
                newOperands.push(operand);
            }
        }
        return {
            type: 'multChainIR',
            operands: newOperands,
        };
    } else if (node.type === 'divisionIR') {
        const left = this.collapse(node.left);
        const right = this.collapse(node.right);
        // rule: 
        // [a / b] / c -> $[a / $[b * c]]
        if (left.type === 'divisionIR') {
            return this.collapse({
                type: 'divisionIR',
                left: left.left,
                right: this.collapse({
                    type: 'multChainIR',
                    operands: [left.right, right],
                }),
            });
        }
        return {
            type: 'divisionIR',
            left,
            right,
        };
    } else if (node.type === 'percentIR') {
        return node;
    } else if (node.type === 'parenIR') {
        return { type: 'parenIR', content: this.collapse(node.content) };
    } else {
        return node;
    }
}
MultDivArranger.prototype.collapse = _collapse;