import { expr, expl, Graph, img } from "@ad-destra/destra";

import { makePassiveCoordSystem } from './coord';
import img1_src from './img1-src.png?inline';

const xMin = -10;
const xMax = 10;
const yMin = -10;
const yMax = 10;

const {
    toCS_x, toCS_y, toCSCoord, 
    fromCS_x, fromCS_y, fromCSCoord,
    yMaxCS,
} = makePassiveCoordSystem({
    type: 'free-height',
    initialYMin: yMin,
    initialYMax: yMax,
    xMin: xMin,
    xMax: xMax,
});

const img1 = img(img1_src, {
    center: fromCSCoord(0, 0),
    width: fromCS_x(1),
    height: fromCS_y(yMaxCS),
    
});









const graph = new Graph({
    root: [
        img1
    ],
    settings: {
        showGrid: true,
        viewport: {
            xmin: xMin, xmax: xMax,
            ymin: yMin, ymax: yMax
        }
    }
});

export default graph;

const exported = graph.export();
console.log(exported);