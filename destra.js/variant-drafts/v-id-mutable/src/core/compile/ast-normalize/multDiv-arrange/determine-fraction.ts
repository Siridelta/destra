import { MultDivArranger } from "./base";
import { DivisionIR, Leaf, MultChainIR, ParenIR, PercentIR } from "./collapse";


declare module './base' {
    interface MultDivArranger {
        determineFraction<T extends MultChainIR | DivisionIR>(node: T): T | MultChainIR;
        collapse_MultOnly<T extends MultChainIR | DivisionIR | Leaf | ParenIR | PercentIR>(node: T): T;
    }
}

// rule:
// a{leaf} / b -> a{leaf} / b
// (a) / b -> a / b
// a / (b) -> a / b
// [... * a] / b -> [... * a * [1 / b]]
// [... * (a)] / b -> [... * [a / b]]
// a / [(b) * ...] -> [a / b] * [1 / ...]

function _determineFraction(this: MultDivArranger, node: MultChainIR): MultChainIR;
function _determineFraction(this: MultDivArranger, node: DivisionIR): DivisionIR | MultChainIR;
function _determineFraction(this: MultDivArranger, node: MultChainIR | DivisionIR): MultChainIR | DivisionIR {
    if (node.type === 'multChainIR') {
        const operands = node.operands.map(operand =>
            operand.type === 'divisionIR' ? this.determineFraction(operand) : operand
        );
        return {
            type: 'multChainIR',
            operands,
        };
    } else {
        let left = node.left;
        let right = node.right;
        if (left.type === 'multChainIR' || (right.type === 'multChainIR' && right.operands[0].type === 'parenIR')) {
            const lastItem = left.type === 'multChainIR' ? left.operands[left.operands.length - 1] : null;
            const lastItemTake = lastItem && lastItem.type === 'parenIR';
            const leftRemains = left.type === 'multChainIR'
                ? lastItemTake ? left.operands.slice(0, -1) : [...left.operands]
                : [];
            const firstItem = right.type === 'multChainIR' ? right.operands[0] : null;
            const firstItemTake = firstItem && firstItem.type === 'parenIR';
            const rightRemains = right.type === 'multChainIR' && firstItemTake
                ? [{
                    type: 'divisionIR' as const,
                    left: {
                        type: 'number' as const,
                        base: { integer: '1' },
                    },
                    right: {
                        type: 'multChainIR' as const,
                        operands: right.operands.slice(1),
                    }
                }] : []
            const newDiv = {
                type: 'divisionIR' as const,
                left: lastItem
                    ? lastItemTake ? lastItem.content : { type: 'number' as const, base: { integer: '1' } }
                    : left,
                right: right.type === 'multChainIR' && firstItemTake
                    ? firstItem.content
                    : right,
            } satisfies DivisionIR;
            newDiv.right =
                newDiv.right.type === 'multChainIR' || newDiv.right.type === 'divisionIR'
                    ? this.determineFraction(newDiv.right) : newDiv.right;
            newDiv.left =
                newDiv.left.type === 'multChainIR' || newDiv.left.type === 'divisionIR'
                    ? this.determineFraction(newDiv.left) : newDiv.left;
            return {
                type: 'multChainIR' as const,
                operands: [...leftRemains, newDiv, ...rightRemains],
            };
        }
        if (left.type === 'divisionIR') left = this.determineFraction(left);
        if (right.type === 'divisionIR') right = this.determineFraction(right);
        if (left.type === 'parenIR') left = left.content;
        if (right.type === 'parenIR') right = right.content;
        return { type: 'divisionIR', left, right };
    }
}
MultDivArranger.prototype.determineFraction = _determineFraction;

function _collapse_MultOnly(this: MultDivArranger, node: MultChainIR): MultChainIR;
function _collapse_MultOnly(this: MultDivArranger, node: DivisionIR): DivisionIR;
function _collapse_MultOnly(this: MultDivArranger, node: Leaf): Leaf;
function _collapse_MultOnly(this: MultDivArranger, node: ParenIR): ParenIR;
function _collapse_MultOnly(this: MultDivArranger, node: PercentIR): PercentIR;
function _collapse_MultOnly(this: MultDivArranger, node: MultChainIR | DivisionIR | Leaf | ParenIR | PercentIR): MultChainIR | DivisionIR | Leaf | ParenIR | PercentIR {
    if (node.type === 'multChainIR') {
        const operands = node.operands.map(operand => this.collapse_MultOnly(operand));
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
        return {
            type: 'divisionIR',
            left: this.collapse_MultOnly(node.left),
            right: this.collapse_MultOnly(node.right),
        };
    } else if (node.type === 'parenIR') {
        return { type: 'parenIR', content: this.collapse_MultOnly(node.content) };
    } else {
        return node;
    }
}
MultDivArranger.prototype.collapse_MultOnly = _collapse_MultOnly;