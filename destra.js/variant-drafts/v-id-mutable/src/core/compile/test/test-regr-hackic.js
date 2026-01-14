import { expr, expl, regr, Graph, resolveGraph } from "../..";

const R = expl`1 in 1:4`.id('R');

const a_reg = regr('a_reg');
const a_next = expl`${R} * ${a_reg} * (1 - ${a_reg})`.id('a_next');
const a = expl`.5 in ${a_next}:${a_next}`.id('a');

const reg = expr`${a} ~ ${a_reg}`;

const graph = new Graph({
    root: [
        reg,
        a_next,
        a_reg,
        a,
        R,
    ],
})

const ctx = resolveGraph(graph);
console.log(ctx);