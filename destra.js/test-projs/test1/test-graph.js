import { expr, expl, Graph, Folder } from "@ad-destra/destra";

// 1. 定义变量
const a = expl`1 in 0::10`.id('a');
const b = expl`2 in 0::10`.id('b');

// 2. 定义公式
const f = expl`(x, y) => x ^ ${a} + y ^ ${b}`.id('f');
const i1 = expr`${f}(x, y) = 0`;

// 3. 导出图表
const graph = new Graph({
    root: [
        new Folder({
            title: "Playground Demo",
            children: [a, b, f, i1]
        })
    ],
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