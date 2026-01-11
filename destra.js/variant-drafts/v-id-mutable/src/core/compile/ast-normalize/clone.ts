import { hasType } from "../../expr-dsl/visit-ast/utils";
import { ASTVisitorWithDefault } from "../../expr-dsl/visit-ast/visitor-withdefault";

/**
 * Clone AST
 */
export class ASTCloner extends ASTVisitorWithDefault<any, void> {

    public visit<T extends { type: string } | any[]>(node: T): T {
        node = { ...node };
        return super.visit(node);
    }
    
}