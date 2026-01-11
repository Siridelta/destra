import { MultDivArranger } from ".";
import { ImplicitMultASTNode, MultiplicationASTNode } from "../../../expr-dsl/parse-ast/sematics/visitor-parts/multDiv-level";
import { possibleAmbiguousImages, toCharflowImage } from "../../../expr-dsl/syntax-reference/mathquill-charflow";


declare module '.' {
    interface MultDivArranger {
        collapse
    }
}

