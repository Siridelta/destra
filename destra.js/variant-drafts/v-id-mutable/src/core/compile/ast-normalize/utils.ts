import { ParenExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";


export function wrapWithParentheses(node: any): ParenExpASTNode {
    return {
        type: 'parenExp',
        content: node,
    } satisfies ParenExpASTNode;
}

export function removeChildParentheses(node: any, childKey: string): any {
    while (node[childKey].type === 'parenExp') {
        node[childKey] = node[childKey].content;
    }
    return node;
}

export function throughParenCall(node: any, callback: (node: any) => any): void {
    while (node.type === 'parenExp') {
        node = node.content;
    }
    callback(node);
}

export function throughParenGet(node: any): any {
    while (node.type === 'parenExp') {
        node = node.content;
    }
    return node;
}

export function throughParenSet(node: ParenExpASTNode, value: any): void {
    while (node.content.type === 'parenExp') {
        node = node.content;
    }
    node.content = value;
}