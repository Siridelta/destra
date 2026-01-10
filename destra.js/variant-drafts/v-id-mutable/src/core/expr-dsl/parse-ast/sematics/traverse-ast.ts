
export function traverse(
    ast: any,
    { enter = () => { }, exit = () => { } }:
        { enter?: (ast: any) => any, exit?: (ast: any) => any }
) {
    enter(ast);
    for (const child of getASTChildren(ast)) {
        traverse(child, { enter, exit });
    }
    exit(ast);
    return ast;
}

export function getASTChildren(ast: any): any[] {
    return (() => {
        if (!ast)
            throw new Error('Internal error: AST is undefined in getASTChildren');
        if (!ast.type)
            throw new Error('Internal error: AST type is undefined in getASTChildren');
        switch (ast.type) {
            case 'formula':
                return [ast.content, ast.slider];
            case 'sliderConfig':
                return [ast.from, ast.to, ast.step];
            case 'ctxFactoryHead':
                switch (ast.subtype) {
                    case 'expr':
                        return [...ast.ctxVarDefs];
                    case 'range':
                        return [ast.ctxVarDef];
                    case 'null':
                        return [...ast.ctxVarDefs];
                    default:
                        return [];
                }
            case 'variableDefinition':
                return [ast.content];
            case 'explicitEquation':
                return [ast.lhs, ast.rhs];
            case 'omittedExplicitEquation':
                return [ast.rhs];
            case 'functionDefinition':
                return [...ast.params, ast.content];
            case 'implicitEquation':
                return [...ast.operands];
            case 'regression':
                return [ast.lhs, ast.rhs];
            case 'expression':
                return [ast.content];
            case 'commas':
                return [...ast.items];
            case 'action':
                return [ast.target, ast.value];
            case 'addition':
                return [ast.left, ast.right];
            case 'subtraction':
                return [ast.left, ast.right];
            case 'sumClause':
                return [ast.ctxVarDef, ast.content];
            case 'prodClause':
                return [ast.ctxVarDef, ast.content];
            case 'intClause':
                return [ast.ctxVarDef, ast.content];
            case 'diffClause':
                return [ast.ctxVarDef, ast.content];
            case 'forClause':
                return [...ast.ctxVarDefs, ast.content];
            case 'withClause':
                return [...ast.ctxVarDefs, ast.content];
            case 'ctxVarDef':
                switch (ast.subtype) {
                    case 'expr':
                        return [ast.expr];
                    case 'range':
                        return [ast.lower, ast.upper];
                    case 'null':
                        return [];
                    default:
                        return [];
                }
            case 'multiplication':
                return [ast.left, ast.right];
            case 'division':
                return [ast.left, ast.right];
            case 'cross':
                return [ast.left, ast.right];
            case 'omittedCall':
                return [ast.func, ast.arg];
            case 'implicitMult':
                return [...ast.operands];
            case 'unaryMinus':
                return [ast.operand];
            case 'unaryPlus':
                return [ast.operand];
            case 'rootof':
                return [ast.index, ast.operand];
            case 'power':
                return [ast.base, ast.exponent];
            case 'factorial':
                return [ast.operand];
            case 'attrAccess':
                return [ast.operand];
            case 'extensionFuncCall':
                return [ast.receiver, ast.func, ...ast.args];
            case 'comparison':
                return [...ast.operands];
            case 'listFiltering':
                return [ast.operand, ast.filter];
            case 'listIndexing':
                return [ast.operand, ast.index];
            case 'listSlicing':
                return [ast.operand, ...ast.indices];
            case 'listSliceRange':
                return [ast.start, ast.end];
            case 'builtinFuncCall':
                return [ast.func, ...ast.args];
            case 'definedFuncCall':
                return [ast.func, ...ast.args];
            case 'parenExp':
                return [ast.content];
            case 'tupleExp':
                return [...ast.items];
            case 'listExp':
                return [...ast.items];
            case 'listRange':
                return [ast.start, ast.end];
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
                throw new Error(`Internal error: Unexpected AST node type ${ast.type} in getASTChildren`);
        }
    })().filter((c: any) => c !== null && c !== undefined);
}