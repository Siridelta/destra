import { expl, Graph, TickerAction } from "@ad-destra/destra";

const a = expl`a = 1 in 0::`;
const A = expl`A(dt) = ${a} -> dt`;

// 3. 导出图表
const graph = new Graph({
    root: [
        a,
    ],
    ticker: {
        handler: new TickerAction((dt) => A(dt)),
        playing: true,
    },
    settings: {
        showGrid: true,
        viewport: {
            xmin: -10, xmax: 10,
            ymin: -10, ymax: 10
        }
    }
});

export default graph;

const exported = graph.export();
console.log(exported);