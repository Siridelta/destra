import { expr, expl, Graph, resolveGraph } from "../..";

const X = expl`x`.id('X');
const Y = expl`y`.id('Y');

const C1 = expl.With`
    x = ${X}
`(({ x }) => 
    expr`${Y}`
).id('C1');

const C2 = expl.With`
    x = 1
`(({ x }) => 
    expr`${X} + ${x}`
).id('C2');

const graph = new Graph({
    root: [
        C1,
        C2,
    ],
})

const ctx = resolveGraph(graph);
console.log(ctx);