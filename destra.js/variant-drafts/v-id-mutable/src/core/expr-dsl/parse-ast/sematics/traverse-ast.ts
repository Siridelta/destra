import { CtxVarExprDefASTNode } from "./visitor-parts/addSub-level";

// return false in 'enter' to skip children
export function traverse(
    ast: any,
    { enter = () => { }, exit = () => { } }:
        { enter?: (ast: any) => any, exit?: (ast: any) => any },
    allowIR: boolean = false
) {
    const enterReturn = enter(ast);
    if (enterReturn !== false) {
        for (const child of getASTChildren(ast, allowIR)) {
            traverse(child, { enter, exit }, allowIR);
        }
    }
    exit(ast);
    return ast;
}

export type ASTPath = (string | number)[];

export function getChildByPath(ast: any, path: ASTPath): any {
    let node = ast;
    for (const p of path) {
        node = node[p];
    }
    return node;
}

export function setChildByPath(ast: any, path: ASTPath, child: any): any {
    if (path.length === 0)
        throw new Error('Internal error: Path is empty in setChildByPath');
    let node = ast;
    for (const p of path.slice(0, -1)) {
        node = node[p];
    }
    const lastPath = path[path.length - 1];
    node[lastPath] = child;
    return ast;
}

export function setChildByPathImmutable(ast: any, path: ASTPath, child: any): any {
    if (path.length === 0)
        throw new Error('Internal error: Path is empty in setChildByPath');
    if (path.length === 1) {
        return { ...ast, [path[0]]: child };
    } else {
        return { ...ast, [path[0]]: setChildByPathImmutable(ast[path[0]], path.slice(1), child) };
    }
}

export function getASTChildPaths(ast: any, allowIR: boolean = false): ASTPath[] {
    if (!ast)
        throw new Error('Internal error: AST is undefined in getASTChildren');
    if (!ast.type)
        throw new Error('Internal error: AST type is undefined in getASTChildren');
    switch (ast.type) {
        case 'formula':
            return [['content'], ['slider']];
        case 'sliderConfig':
            return [['from'], ['to'], ['step']];
        case 'ctxFactoryHead':
            switch (ast.subtype) {
                case 'expr':
                    return (ast.ctxVarDefs as CtxVarExprDefASTNode[]).map((_, i) => ['ctxVarDefs', i]);
                case 'range':
                    return [['ctxVarDef']];
                case 'null':
                    return (ast.ctxVarDefs as CtxVarExprDefASTNode[]).map((_, i) => ['ctxVarDefs', i]);
                default:
                    return [];
            }
        case 'variableDefinition':
            return [['content']];
        case 'explicitEquation':
            return [['lhs'], ['rhs']];
        case 'omittedExplicitEquation':
            return [['rhs']];
        case 'functionDefinition':
            return [['content'], ...(ast.params as any[]).map((_, i) => ['params', i])];
        case 'implicitEquation':
            return (ast.operands as any[]).map((_, i) => ['operands', i]);
        case 'regression':
            return [['lhs'], ['rhs']];
        case 'expression':
            return [['content']];
        case 'commas':
            return (ast.items as any[]).map((_, i) => ['items', i]);
        case 'action':
            return [['target'], ['value']];
        case 'addition':
            return [['left'], ['right']];
        case 'subtraction':
            return [['left'], ['right']];
        case 'sumClause':
            return [['ctxVarDef'], ['content']];
        case 'prodClause':
            return [['ctxVarDef'], ['content']];
        case 'intClause':
            return [['ctxVarDef'], ['content']];
        case 'diffClause':
            return [['ctxVarDef'], ['content']];
        case 'forClause':
            return [...(ast.ctxVarDefs as CtxVarExprDefASTNode[]).map((_, i) => ['ctxVarDefs', i]), ['content']];
        case 'withClause':
            return [...(ast.ctxVarDefs as CtxVarExprDefASTNode[]).map((_, i) => ['ctxVarDefs', i]), ['content']];
        case 'ctxVarDef':
            switch (ast.subtype) {
                case 'expr':
                    return [['expr']];
                case 'range':
                    return [['lower'], ['upper']];
                case 'null':
                    return [];
                default:
                    return [];
            }
        case 'multiplication':
            return [['left'], ['right']];
        case 'division':
            return [['left'], ['right']];
        case 'cross':
            return [['left'], ['right']];
        case 'percentOf':
            return [['left'], ['right']];
        case 'mod':
            return [['left'], ['right']];
        case 'omittedCall':
            return [['func'], ['arg']];
        case 'implicitMult':
            return (ast.operands as any[]).map((_, i) => ['operands', i]);
        case 'unaryMinus':
            return [['operand']];
        case 'unaryPlus':
            return [['operand']];
        case 'rootof':
            return [['index'], ['operand']];
        case 'power':
            return [['base'], ['exponent']];
        case 'factorial':
            return [['operand']];
        case 'attrAccess':
            return [['operand']];
        case 'extensionFuncCall':
            return [['receiver'], ['func'], ...(ast.args as any[]).map((_, i) => ['args', i])];
        case 'comparison':
            return (ast.operands as any[]).map((_, i) => ['operands', i]);
        case 'listFiltering':
            return [['operand'], ['filter']];
        case 'listIndexing':
            return [['operand'], ['index']];
        case 'listSlicing':
            return [['operand'], ...(ast.indices as any[]).map((_, i) => ['indices', i])];
        case 'listSliceRange':
            return [['start'], ['end']];
        case 'builtinFuncCall':
            return [['func'], ...(ast.args as any[]).map((_, i) => ['args', i])];
        case 'definedFuncCall':
            return [['func'], ...(ast.args as any[]).map((_, i) => ['args', i])];
        case 'parenExp':
            return [['content']];
        case 'tupleExp':
            return (ast.items as any[]).map((_, i) => ['items', i]);
        case 'listExp':
            return (ast.items as any[]).map((_, i) => ['items', i]);
        case 'listRange':
            return [['start'], ['end']];
        case 'absExp':
            return [['content']];
        case 'piecewiseExp':
            return [...(ast.branches as any[]).map((_, i) => ['branches', i]), ['default']];
        case 'piecewiseBranch':
            return [['condition'], ['value']];
        case 'number':
            return [];
        case 'colorHexLiteral':
            return [];
        case 'substitution':
            return [];
        case 'builtinFunc':
            return [];
        case 'constant':
            return [];
        case 'reservedVar':
            return [];
        case 'contextVar':
            return [];
        case 'undefinedVar':
            return [];
        default:
            if (allowIR) {
                switch (ast.type) {
                    case 'maybeOCallFuncIR':
                        return [['func']];
                    case 'maybeFuncDefIR':
                        return [['func'], ...(ast.params as any[]).map((_, i) => ['params', i])];
                    case 'varIR':
                        return [];
                    default:
                        throw new Error(`Internal error: Unexpected AST node type ${ast.type} in getASTChildren`);
                }
            }
            throw new Error(`Internal error: Unexpected AST node type ${ast.type} in getASTChildren`);
    }
}

export function getASTChildren(ast: any, allowIR: boolean = false): any[] {
    return getASTChildPaths(ast, allowIR)
        .map(path => getChildByPath(ast, path))
        .filter((c: any) => c !== null && c !== undefined);
}