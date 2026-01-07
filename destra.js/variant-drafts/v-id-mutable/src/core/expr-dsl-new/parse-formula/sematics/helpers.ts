
export enum ComparisonOperator {
    Greater = ">",
    GreaterEqual = ">=",
    Less = "<",
    LessEqual = "<=",
    Equal = "=",
    Equal2 = "==",
}
export type ComparisonASTNode = {
    type: "comparison",
    operands: any[],
    operators: ComparisonOperator[],
}

export type PointCoordsIRNode = {
    type: "pointCoords",
    coords: any[],
}

// merge expr, '...', expr to RangeASTNode
// export function sanitizeBracketContentItems(items: any[]): any[] {