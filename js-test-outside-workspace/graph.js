import { expr, expl, Graph, img } from "@ad-destra/destra";
import img1_src from './img1-src.png?inline';

const img1 = img(img1_src, {
    center: expr`(0,0)`,
});

// 3. 导出图表
const graph = new Graph({
    root: [
        img1
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