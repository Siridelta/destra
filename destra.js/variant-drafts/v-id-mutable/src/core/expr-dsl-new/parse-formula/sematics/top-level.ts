import { FormulaVisitor, scanUdRsVarRefs } from "./base-visitor";


declare module './base-visitor' {
    interface FormulaVisitor {
        topLevel(ctx: any): any;
    }
}

export type ParametricInfo = '1D' | '2D' | null;
export type VariableDefinitionASTNode = {
    type: "variableDefinition",
    name: string,
    content: any,
    parametric: ParametricInfo,
}
export type ExplicitEquationASTNode = {
    type: "explicitEquation",
    isOmitted: false,
    lhs: any,
    rhs: any,
    op: string,
}
export type OmittedExplicitEquationASTNode = {
    type: "explicitEquation",
    isOmitted: true,
    lhs: null,
    rhs: any,
    op: null,
}
export type FunctionDefinitionASTNode = {
    type: "functionDefinition",
    name: string | null,
    params: string[],
    content: any,
}
export type ImplicitEquationASTNode = {
    type: "implicitEquation",
    operands: any[],
    ops: string[],
}
export type RegressionASTNode = {
    type: "regression",
    lhs: any,
    rhs: any,
    op: string,
    coefs: string[],
}
export type ExpressionASTNode = {
    type: "expression",
    content: any,
    parametric: ParametricInfo,
}
export type TopLevelASTNode =
    | VariableDefinitionASTNode
    | ExplicitEquationASTNode
    | OmittedExplicitEquationASTNode
    | FunctionDefinitionASTNode
    | ImplicitEquationASTNode
    | RegressionASTNode
    | ExpressionASTNode;

FormulaVisitor.prototype.topLevel = function (ctx: any): TopLevelASTNode {
    const [lhs, rhs, ...remains] = this.visit(ctx.actionBatchLevel);
    const equalOp = ctx['=']?.[0];
    const tildeOp = ctx['~']?.[0];
    const arrowOp = ctx['=>']?.[0];
    const inequalityOps = ctx.TopLevelComparisonOperator;

    // '=', 'myVar = ...'
    if (equalOp && lhs.type === "udVarRef") {
        // test 'myVar = ...'
        // for explicit equation / variable definition
        const { udVarRefs, rsVarRefs } = scanUdRsVarRefs(rhs);

        const isParametric1D = rsVarRefs.every(v => ['t'].includes(v));
        const isParametric2D = rsVarRefs.every(v => ['u', 'v'].includes(v));
        const nonParametricRsVars = rsVarRefs.filter(v => !['t', 'u', 'v'].includes(v));

        if (udVarRefs.length > 1) {
            throw new Error(
                `Too many independent variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Explicit equation (undefined variable type, dependent variable='${lhs.name}') must have exactly one independent variable.`
            );
        }
        if (udVarRefs.length === 1) {
            if (rsVarRefs.length > 0) {
                throw new Error(
                    `Too many independent variables: '${udVarRefs[0]}', ${rsVarRefs.map(v => `'${v}'`).join(', ')}.`
                    + `Explicit equation (undefined variable type, dependent variable='${lhs.name}') must have exactly one independent variable.`
                );
            }
            return {
                type: "explicitEquation",
                isOmitted: false,
                lhs,
                rhs,
                op: equalOp.image,
            }
        }
        if (!isParametric1D && !isParametric2D) {
            if (rsVarRefs.length > 1) {
                throw new Error(
                    `Too many independent variables: ${rsVarRefs.map(v => `'${v}'`).join(', ')}.`
                    + `Explicit equation (undefined variable type, dependent variable='${lhs.name}') must have exactly one independent variable.`
                );
            }
            if (rsVarRefs.length === 1) {
                return {
                    type: "explicitEquation",
                    isOmitted: false,
                    lhs,
                    rhs,
                    op: equalOp.image,
                }
            }
        }
        return {
            type: "variableDefinition",
            name: lhs.name,
            content: rhs,
            parametric:
                isParametric1D ? '1D' :
                    isParametric2D ? '2D' :
                        null,
        }
    }

    // '=', 'rsVar = ...'
    if (equalOp && lhs.type === "rsVarRef") {
        const lhsRsVar = lhs.name;
        const { udVarRefs, rsVarRefs } = scanUdRsVarRefs(rhs);
        let isExplicitEquation = false;

        if (!['x', 'y', 'z', 'r', 'rho'].includes(lhsRsVar)) {
            throw new Error(
                `Invalid dependent variable: '${lhsRsVar}'. Only x, y, z, r, rho are allowed as dependent variables in explicit equation.`
            );
        }

        // x/y/z
        if (lhsRsVar === "x" || lhsRsVar === "y" || lhsRsVar === "z") {

            const allowedVars = ["x", "y", "z"];
            const passVars = allowedVars.filter(v => v !== lhsRsVar);

            // check undefined variables
            if (udVarRefs.length > 1) {
                throw new Error(
                    `Too many undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                    + `Explicit equation (reserved variable type, dependent variable='${lhsRsVar}') must `
                    + `either have exactly one undefined variable as independent variable, `
                    + `or only have the allowed reserved variables (${passVars.map(v => `'${v}'`).join(", ")}) as independent variables.`
                );
            }

            let explicitCheck = true;
            for (const rsVar of rsVarRefs) {
                if (!allowedVars.includes(rsVar)) {
                    throw new Error(`Detected illegal independent variable: '${rsVar}'. Only ${allowedVars.join(", ")} are allowed as independent variables in explicit equation (cartesian coordinates type, dependent variable='${lhsRsVar}')`);
                }
                if (!passVars.includes(rsVar)) {
                    explicitCheck = false;
                    break;
                }
            }
            // common explicit equation
            if (explicitCheck && udVarRefs.length === 0) {
                isExplicitEquation = true;
            }
            // allow 'y = f(singleUdVar)' as explicit equation
            if (rsVarRefs.length === 0 && udVarRefs.length === 1) {
                isExplicitEquation = true;
            }
        }

        // then exclude all undefined variables
        if (udVarRefs.length > 0) {
            throw new Error(
                `Detected undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Explicit equation (reserved variable type, dependent variable='${lhsRsVar}') `
                + `cannot depend on undefined variables.`
            );
        }
        // r/theta/z
        if (lhsRsVar === "r") {
            const allowedVars = ["theta", "z"];
            for (const rsVar of rsVarRefs) {
                if (!allowedVars.includes(rsVar)) {
                    throw new Error(`Detected illegal independent variable: '${rsVar}'. Only ${allowedVars.join(", ")} are allowed as independent variables in explicit equation (polar coordinates type, dependent variable='${lhsRsVar}')`);
                }
            }
            isExplicitEquation = true;
        }
        // rho/theta/phi
        if (lhsRsVar === "rho") {
            const allowedVars = ["theta", "phi"];
            for (const rsVar of rsVarRefs) {
                if (!allowedVars.includes(rsVar)) {
                    throw new Error(`Detected illegal independent variable: '${rsVar}'. Only ${allowedVars.join(", ")} are allowed as independent variables in explicit equation (spherical coordinates type, dependent variable='${lhsRsVar}')`);
                }
            }
            isExplicitEquation = true;
        }
        if (isExplicitEquation) {
            return {
                type: "explicitEquation",
                isOmitted: false,
                lhs,
                rhs,
                op: equalOp.image,
            }
        }
    }

    // '=', 'f(x) = ...'
    if (equalOp && lhs.type === "functionDefinitionHead") {
        const functionName = lhs.name;
        const functionParams = lhs.params;
        const { udVarRefs, rsVarRefs: _rsVarRefs } = scanUdRsVarRefs(rhs);

        // params override rsVarRefs
        const rsVarRefs = Array.from(new Set(_rsVarRefs).difference(new Set(functionParams)));

        if (udVarRefs.length > 0) {
            throw new Error(
                `Detected undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Function definition (name='${functionName}', params='${functionParams.join(", ")}') should not depend on undefined variables.`
            );
        }
        if (rsVarRefs.length > 0) {
            throw new Error(
                `Detected reserved variables: ${rsVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Function definition (name='${functionName}', params='${functionParams.join(", ")}') should not depend on reserved variables.`
            );
        }
        return {
            type: "functionDefinition",
            name: functionName,
            params: functionParams,
            content: rhs,
        }
    }

    // '=>', '(x) => ...'
    if (arrowOp
        && lhs.type === "parenthesizedExpr"
        && lhs.content.type === "parenthesisCommaSeries"
        && lhs.content.items.every((item: any) =>
            item.type === "udVarRef"
            || item.type === "rsVarRef"
        )
    ) {
        const params = lhs.content.items.map((item: any) => item.name);
        const { udVarRefs: _udVarRefs, rsVarRefs: _rsVarRefs } = scanUdRsVarRefs(rhs);
        const udVarRefs = Array.from(new Set(_udVarRefs).difference(new Set(params)));
        const rsVarRefs = Array.from(new Set(_rsVarRefs).difference(new Set(params)));
        if (udVarRefs.length > 0) {
            throw new Error(
                `Detected undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Function definition (arrow syntax, params='${params.join(", ")}') should not depend on undefined variables.`
            );
        }
        if (rsVarRefs.length > 0) {
            throw new Error(
                `Detected reserved variables: ${rsVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Function definition (arrow syntax, params='${params.join(", ")}') should not depend on reserved variables.`
            );
        }
        return {
            type: "functionDefinition",
            name: null,
            params,
            content: rhs,
        }
    }

    // '=', '<', '>', '>=', '<=', implicit equation / inequality
    if (equalOp || inequalityOps.length > 0) {
        const operands = [lhs, rhs, ...remains];
        const ops = (equalOp ? [equalOp] : inequalityOps).map((op: any) => op.image) as string[];
 
        const { udVarRefsSet, rsVarRefsSet } = operands.reduce(
            (acc: { udVarRefsSet: Set<string>, rsVarRefsSet: Set<string> }, operand: any) => {
                const { udVarRefs, rsVarRefs } = scanUdRsVarRefs(operand);
                acc.udVarRefsSet.union(new Set(udVarRefs));
                acc.rsVarRefsSet.union(new Set(rsVarRefs));
                return acc;
            },
            { udVarRefsSet: new Set<string>(), rsVarRefsSet: new Set<string>() }
        );
        const udVarRefs = Array.from(udVarRefsSet);
        const rsVarRefs = Array.from(rsVarRefsSet);

        // no undefined variables
        if (udVarRefs.length > 0) {
            throw new Error(
                `Detected undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Implicit equation / inequality (ops=${ops.map(o => `'${o}'`).join(", ")}) should not depend on undefined variables.`
            );
        }
        // fall in one of the proper rsVar sets
        const nonCartesianRsVars = rsVarRefs.filter(v => !['x', 'y', 'z'].includes(v));
        const nonPolarRsVars = rsVarRefs.filter(v => !['theta', 'phi'].includes(v));
        if (nonCartesianRsVars.length > 0 && nonPolarRsVars.length > 0) {
            throw new Error(
                `Invalid reserved variables usage: ${rsVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Implicit equation / inequality (ops='${ops.map(o => `'${o}'`).join(", ")}') can only depend on `
                + `one of the following reserved variable sets: (x, y, z), (theta, phi).`
            );
        }
        // polar implicit equation do not support chaining
        if (nonPolarRsVars.length > 0) {
            if (ops.length > 1) {
                throw new Error(
                    `Detected implicit equation / inequality chaining in polar coordinates: ${ops.map(o => `'${o}'`).join(", ")}.`
                    + `Polar implicit equation / inequality does not support chaining.`
                );
            }
            return {
                type: "implicitEquation",
                operands,
                ops,
            }
        }
            
        return {
            type: "implicitEquation",
            operands,
            ops,
        }
    }

    // '~', 'Y ~ kX + b'
    if (tildeOp) {
        const { udVarRefs, rsVarRefs } = scanUdRsVarRefs(rhs);
        if (rsVarRefs.length > 0) {
            throw new Error(
                `Detected reserved variables: ${rsVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Regression (op='~') should not depend on reserved variables.`
            );
        }
        return {
            type: "regression",
            lhs,
            rhs,
            op: tildeOp.image,
            coefs: udVarRefs,
        }
    }

    // no operator, just an expression
    const { udVarRefs, rsVarRefs } = scanUdRsVarRefs(lhs);

    if (udVarRefs.length > 0) {
        throw new Error(
            `Detected undefined variables: ${udVarRefs.map(v => `'${v}'`).join(", ")}.`
            + `Expression should not depend on undefined variables.`
        );
    }

    const isParametric1D = rsVarRefs.every(v => ['t'].includes(v));
    const isParametric2D = rsVarRefs.every(v => ['u', 'v'].includes(v));
    if (rsVarRefs.length > 0) {
        if (rsVarRefs.length === 1 && ['x', 'y', 'z'].includes(rsVarRefs[0])) {
            return {
                type: "explicitEquation",
                isOmitted: true,
                lhs: null,
                rhs,
                op: null,
            }
        }
        if (!isParametric1D && !isParametric2D) {
            throw new Error(
                `Detected reserved variables: ${rsVarRefs.map(v => `'${v}'`).join(", ")}.`
                + `Expression should not depend on reserved variables, except for parametrics `
                + `(1D: t, 2D: u, v).`
            );
        }
    }

    return {
        type: "expression",
        content: lhs,
        parametric:
            isParametric1D ? '1D' :
                isParametric2D ? '2D' :
                    null,
    }
}