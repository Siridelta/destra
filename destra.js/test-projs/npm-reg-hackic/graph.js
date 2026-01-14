import { expr, expl, regr, Graph, LoopMode } from "@ad-destra/destra";

const R = expl`3.131 in 1:4`.id('R');

const a_reg = regr('a_reg');
const a_next = expl`${R} * ${a_reg} * (1 - ${a_reg})`.id('a_next');
const a = expl`.5 in ${a_next}:${a_next}`.id('a')
    .slider({
        playing: true,
        speed: 1,
        loopMode: LoopMode.LOOP_FORWARD_REVERSE,
    });

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

export default graph;

const exported = graph.export();
console.log(exported);