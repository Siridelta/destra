import { getStyleValueFormulas } from "../resolve-names/step1_registry";
import { expr, expl, label } from "../..";

const a = expl`a = 1`;
const b = expl`b = 2`;
const c = expl`c = #25FF9D`;
const d = expl`d = 4`;


const e = expr`x^2`
    .fill({ opacity: a })
    .line({ width: b })
    .point({ size: d, opacity: a })
    .color(c)
    .label({ text: label`d = ${d}` });

const f = getStyleValueFormulas(e);
console.log(f);