import { ASTVisitor } from "../../expr-dsl/visit-ast/visitor";

/**
 * Clone AST
 */
export class ASTCloner extends ASTVisitor<any, void> {

    public visit(node: any): any {
        if (Array.isArray(node)) {
            return node.map(item => this.visit(item));
        }
        if (typeof node === 'object' && node !== null) {
            // shall not copy undefinedvar and ctxVarDef
            const result =
                node.type === 'undefinedVar' || node.type === 'ctxVarDef'
                    ? node
                    : { ...node };
            for (const [k, v] of Object.entries(node) as [keyof typeof node, any][]) {
                result[k] = this.visit(v);
            }
            return result;
        }
        return node;
    }

}