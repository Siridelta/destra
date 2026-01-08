import { parseAst } from "../../parseAst";
import { Formula, FormulaType, TemplatePayload } from "../../../formula/base";

// Mock implementation to bypass protected constructor
class MockFormula extends Formula {
    constructor(public type: FormulaType, public isEmbeddable: boolean) {
        // @ts-ignore
        super({ strings: [""], values: [] });
    }
}

const v = new MockFormula(FormulaType.Variable, true);
const f = new MockFormula(FormulaType.Function, true);

const inputTemplate: TemplatePayload = {
    strings: ["1 + ", " + ", "(2)"],
    values: [v, f]
};

console.log("Testing parseAst with object interpolation...");

try {
    const ast = parseAst(inputTemplate);
    console.dir(ast, { depth: null });
} catch (e) {
    console.error(e);
}
