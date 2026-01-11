import { ASTNormalizer1, wrapWithParentheses } from ".";
import { CrossASTNode, DivisionASTNode, ImplicitMultASTNode, isUpToImplicitMultLevelASTNode, isUpToMultDivLevelASTNode, isUpToOmittedCallLevelASTNode, ModASTNode, MultDivLevelASTNode, MultiplicationASTNode, PercentOfASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { isAmbiguousImplicitMult } from "./omittedCallLevel";

declare module '.' {
    interface ASTNormalizer1 {

        multiplication(node: MultiplicationASTNode): MultiplicationASTNode | ImplicitMultASTNode;
        division(node: DivisionASTNode): DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode;
        cross(node: CrossASTNode): CrossASTNode;
        percentOf(node: PercentOfASTNode): PercentOfASTNode;
        mod(node: ModASTNode): ModASTNode;
        multDivLevel<T extends MultDivLevelASTNode>(node: T): MultDivLevelASTNode | ImplicitMultASTNode;

    }
}



ASTNormalizer1.prototype.multiplication = function (node: MultiplicationASTNode): MultiplicationASTNode | ImplicitMultASTNode { return this.multDivLevel(node) as MultiplicationASTNode | ImplicitMultASTNode; }
ASTNormalizer1.prototype.division = function (node: DivisionASTNode): DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode { return this.multDivLevel(node) as DivisionASTNode | MultiplicationASTNode | ImplicitMultASTNode; }
ASTNormalizer1.prototype.cross = function (node: CrossASTNode): CrossASTNode { return this.multDivLevel(node) as CrossASTNode; }
ASTNormalizer1.prototype.percentOf = function (node: PercentOfASTNode): PercentOfASTNode { return this.multDivLevel(node) as PercentOfASTNode; }
ASTNormalizer1.prototype.mod = function (node: ModASTNode): ModASTNode { throw new Error('Internal Error: ModASTNode should had been expanded to mod(..., ...)'); }
ASTNormalizer1.prototype.multDivLevel = function <T extends MultDivLevelASTNode>(node: T): MultDivLevelASTNode | ImplicitMultASTNode {
    let _node: MultDivLevelASTNode | ImplicitMultASTNode = { ...node };
    _node.left = this.visit(_node.left);
    _node.right = this.visit(_node.right);

    // Level overflow protection
    if (!isUpToMultDivLevelASTNode(_node.left)) {
        _node.left = wrapWithParentheses(_node.left);
    }
    if (!isUpToOmittedCallLevelASTNode(_node.right)) {
        _node.right = wrapWithParentheses(_node.right);
    }

    // But we remove parenthesis in all case if we use division, cuz it is actually fraction and super safe
    if (_node.type === 'division') {
        if (_node.left.type === 'parenExp') {
            _node.left = _node.left.content;
        }
        if (_node.right.type === 'parenExp') {
            _node.right = _node.right.content;
        }
    }

    // --- Mult / Div Chain Simplify ---
    //
    // mult / div chain simplify rules:
    // (brackets indicates ast structure; '(...)' indicates intended repeatations on this rule)
    // 1. [a / b] / c -> a / [b * c]
    // 2. [a / [b * c]] / d -> a / [[b * c] * d] (...)
    // 
    // 3. a * [b * c] -> [a * b] * c (...)
    //
    // 4. [a * b] / c -> a * [b / c] (...)
    //
    // 5. a / [[b * c] * d] -> a / [b * [c * d]] (...)
    // 
    // 6. a / [b * [c * d]] -> [a / b] * [1 / [c * d]] (...)
    const needRestoreIMs = new Set<MultiplicationASTNode>();

    if (_node.type === 'division' || _node.type === 'multiplication') {
        const revisitSet = new Set<MultiplicationASTNode | DivisionASTNode>([_node]);

        // To be able to operate iMult chain as well, as iMult should be also treated as multiplication,
        // we need to break iMult chain if necessary.
        // but breaking iMults would need the next step to also trynna restore them if possible,
        // so we need to keep track of broken iMults very carefully, so that the next step can attempt to restore.
        // we add them during calling attemptBreakIMult, and remove them during the loop.
        const attemptBreakIMult = (node: any, side: 'left' | 'right') => {
            if (node.type !== 'implicitMult') return node;
            const newOperands = [...node.operands];
            const item = side === 'left' ? newOperands.shift() : newOperands.pop();
            if (!item) throw new Error('Internal Error: attemptBreakIMult should had been called with a non-empty implicit mult');
            const otherHandside =
                newOperands.length === 1 ? newOperands[0] : {
                    type: 'implicitMult' as const,
                    operands: newOperands,
                };
            needRestoreIMs.add(node);   // add here
            if (side === 'left') {
                return {
                    type: 'multiplication' as const,
                    left: item,
                    right: otherHandside,
                }
            } else {
                return {
                    type: 'multiplication' as const,
                    left: otherHandside,
                    right: item,
                }
            }
        }

        const clear = (nodes: any[]) => {
            for (const node of nodes) {
                revisitSet.delete(node);
                if (node.type === 'multiplication')
                    needRestoreIMs.delete(node);
            }
        }
        const add = (nodes: any[]) => {
            for (const node of nodes) {
                revisitSet.add(node);
                if (node.type === 'multiplication')
                    needRestoreIMs.add(node);
            }
        }

        while (revisitSet.size > 0) {
            // pop a node from set
            let currNode = revisitSet.values().next().value!;
            revisitSet.delete(currNode);
            const currIsRoot = currNode === _node;

            // 1. [a / b] / c -> a / [b * c]
            if (currNode.type === 'division' && currNode.left.type === 'division') {
                clear([currNode.left]);
                currNode = {
                    type: 'division' as const,
                    left: currNode.left.left,
                    right: {
                        type: 'multiplication' as const,
                        left: currNode.left.right,
                        right: currNode.right,
                    },
                };
                add([currNode, currNode.right]);
            }
            // 2. [a / [b * c]] / d -> a / [[b * c] * d]
            else if (
                currNode.type === 'division'
                && currNode.left.type === 'division'
                && (
                    currNode.left.right = attemptBreakIMult(currNode.left.right, 'right'),
                    currNode.left.right.type === 'multiplication'
                )
            ) {
                clear([currNode.left, currNode.left.right]);
                currNode = {
                    type: 'division' as const,
                    left: currNode.left.left,
                    right: {
                        type: 'multiplication' as const,
                        left: {
                            type: 'multiplication' as const,
                            left: currNode.left.right.left,
                            right: currNode.left.right.right,
                        },
                        right: currNode.right,
                    },
                };
                add([currNode, currNode.right, currNode.right.left]);
            }
            // 3. a * [b * c] -> [a * b] * c
            else if (
                currNode.type === 'multiplication'
                && currNode.right.type === 'multiplication'
            ) {
                clear([currNode.right]);
                currNode = {
                    type: 'multiplication' as const,
                    left: {
                        type: 'multiplication' as const,
                        left: currNode.left,
                        right: currNode.right.left,
                    },
                    right: currNode.right.right,
                }
                add([currNode, currNode.left]);
            }
            // 4. [a * b] / c -> a * [b / c]
            else if (
                currNode.type === 'division'
                && currNode.left.type === 'multiplication'
            ) {
                clear([currNode.left]);
                currNode = {
                    type: 'multiplication' as const,
                    left: currNode.left.left,
                    right: {
                        type: 'division' as const,
                        left: currNode.left.right,
                        right: currNode.right,
                    },
                };
                add([currNode, currNode.right]);
            }
            // 5. a / [[b * c] * d] -> a / [b * [c * d]]
            else if (
                currNode.type === 'division'
                && currNode.right.type === 'multiplication'
                && currNode.right.left.type === 'multiplication'
            ) {
                clear([currNode.right, currNode.right.left]);
                currNode = {
                    type: 'division' as const,
                    left: currNode.left,
                    right: {
                        type: 'multiplication' as const,
                        left: currNode.right.left.left,
                        right: {
                            type: 'multiplication' as const,
                            left: currNode.right.left.right,
                            right: currNode.right.right,
                        },
                    },
                };
                add([currNode, currNode.right, currNode.right.right]);
            }
            // 6. a / [b * [c * d]] -> [a / b] * [1 / [c * d]]
            else if (
                currNode.type === 'division'
                && currNode.right.type === 'multiplication'
                && currNode.right.left.type === 'multiplication'
            ) {
                clear([currNode.right, currNode.right.left]);
                currNode = {
                    type: 'multiplication' as const,
                    left: {
                        type: 'division' as const,
                        left: currNode.left,
                        right: currNode.right.left,
                    },
                    right: {
                        type: 'division' as const,
                        left: {
                            type: 'number' as const,
                            base: {
                                integer: '1',
                                decimal: undefined,
                            }
                        },
                        right: {
                            type: 'multiplication' as const,
                            left: currNode.right.right.left,
                            right: currNode.right.right.right,
                        },
                    }
                }
                add([currNode, currNode.left, currNode.right, currNode.right.right]);
            }

            // ensure the root node reference is not lost
            if (currIsRoot) _node = currNode;
        }
    }

    // --- In-advance dot & parenthesis simplify ---
    //
    // in-advance simplify for mult if possible, remove mult dot (turn to implicit mult)
    
    if (_node.type === 'multiplication')
        needRestoreIMs.add(_node);
    
    const rewriteTo = (src: any, dst: any) => {
        dst
    }

    if (
        _node.type === 'multiplication'
        && !((_node as any).noSimplify === true)
    ) {
        if (
            (isUpToImplicitMultLevelASTNode(_node.left) || _node.left.type === 'division') // division as fraction is actually safe
            && (isUpToImplicitMultLevelASTNode(_node.right) || _node.right.type === 'division')
            && !isAmbiguousImplicitMult(_node.left, _node.right)  // test if they are not ambiguous
        ) {
            _node = {
                type: 'implicitMult',
                operands: [_node.left, _node.right],
            };
            _node = this.visit(_node);
        } else if (
            // also try to remove parenthesis from right, cuz removing parenthesis may clear ambiguity
            (isUpToImplicitMultLevelASTNode(_node.left) || _node.left.type === 'division')
            && _node.right.type === 'parenExp'
            && (isUpToImplicitMultLevelASTNode(_node.right.content) || _node.right.content.type === 'division')
            && !isAmbiguousImplicitMult(_node.left, _node.right.content)
        ) {
            _node = {
                type: 'implicitMult',
                operands: [_node.left, _node.right.content],
            };
            _node = this.visit(_node);
        }
    }

    return _node;
}