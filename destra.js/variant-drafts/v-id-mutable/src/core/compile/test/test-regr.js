import { expr, expl, Graph, resolveGraph } from "../..";

const k = regr('k');
const b = regr('b');

const X = expl`[1...10]`;
const Y = expl` ${X}^2 + 3${X} - 4`;

const reg = expr`${Y} ~ ${k}${X} + ${b}`;

const P = expl`(${k}, ${b})`;

const graph = new Graph({
    root: [
        reg,
        P
    ],
})

const ctx = resolveGraph(graph);
console.log(ctx);