
export enum ComparisonOperator {
    Greater = ">",
    GreaterEqual = ">=",
    Less = "<",
    LessEqual = "<=",
    Equal = "=",
}
export type ComparisonASTNode = {
    type: "comparison",
    operands: any[],
    operators: ComparisonOperator[],
}