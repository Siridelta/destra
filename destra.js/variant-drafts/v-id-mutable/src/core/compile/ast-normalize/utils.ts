import { traceSubstitution, traceASTState } from "../../expr-dsl/parse-ast";
import { ParenExpASTNode } from "../../expr-dsl/parse-ast/sematics/visitor-parts/atomic-exps";
import { CtxExp, Formula, isCtxExp } from "../../formula/base";


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

    
export function traceWithSubst<R>(
    node: any,
    callback: (node: any) => R,
    config: {
        onNonFormula: ((value: any) => R);
        onCtxExp: ((f: CtxExp) => R);
        onNoAst: (() => R);
        hostFormula: Formula;
    }
): R {
    const onNonFormula = config.onNonFormula;
    const onCtxExp = config.onCtxExp;
    const onNoAst = config.onNoAst;
    const currentFormula = config.hostFormula;
    if (node.type !== 'substitution')
        return callback(node);
    const f = traceSubstitution(node, currentFormula);
    if (!(f instanceof Formula))
        return onNonFormula(f);
    const ast = traceASTState(f);
    if (!ast)
        return onNoAst();
    if (isCtxExp(f))
        return onCtxExp(f);
    let depAst = ast.root;
    if (depAst.type !== 'formula')
        throw new Error(`Internal error: Unexpected Substitution Formula AST root type. ${f}`);
    return traceWithSubst(
        depAst.content,
        callback,
        {
            onNonFormula: onNonFormula,
            onCtxExp: onCtxExp,
            onNoAst: onNoAst,
            hostFormula: f,
        }
    );
}

export function checkLevelWithSubst(
    node: any,
    checkLevel: (node: any) => boolean,
    config: {
        onNonFormula?: boolean | ((value: any) => boolean);
        onCtxExp?: boolean | ((f: CtxExp) => boolean);
        onNoAst?: boolean | (() => boolean);
        hostFormula: Formula;
    }
): boolean {
    const onNonFormula1 = config?.onNonFormula ?? true;
    const onCtxExp1 = config?.onCtxExp ?? true;
    const onNoAst1 = config?.onNoAst ?? true;
    const config2 = {
        onNonFormula: typeof onNonFormula1 === 'boolean' ? () => onNonFormula1 : onNonFormula1,
        onCtxExp: typeof onCtxExp1 === 'boolean' ? () => onCtxExp1 : onCtxExp1,
        onNoAst: typeof onNoAst1 === 'boolean' ? () => onNoAst1 : onNoAst1,
        hostFormula: config.hostFormula,
    }
    return traceWithSubst(node, checkLevel, config2);
}