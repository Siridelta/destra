import { expr, expl, Graph, resolveGraph } from "../..";

const a = expl`sin (x)`.id('a');

const graph = new Graph({
    root: [
        a,
    ],
})

const ctx = resolveGraph(graph);
console.log(ctx);