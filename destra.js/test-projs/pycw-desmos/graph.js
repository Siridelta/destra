import { expr, expl, Graph, img, Folder } from "@ad-destra/destra";

import { makePassiveCoordSystem } from './coord';
import img1_src from './img2-src.png?inline';

const xMin = -10;
const xMax = 10;
const yMin = -10;
const yMax = 10;

const cs = makePassiveCoordSystem({
    type: 'free-height',
    initialYMin: yMin,
    initialYMax: yMax,
    xMin: xMin,
    xMax: xMax,
});

const {
    toCS_x, toCS_y, toCSCoord, 
    fromCS_x, fromCS_y, fromCSCoord,
    yMaxCS,
} = cs;

const img1 = img(img1_src, {
    center: fromCSCoord(expr`(0.5, 0.5${yMaxCS})`),
    width: expr`${fromCS_x(1)} - ${fromCS_x(0)}`,
    height: expr`${fromCS_y(yMaxCS)} - ${fromCS_y(0)}`,
});









const graph = new Graph({
    root: [
        new Folder({
            title: "Coordinate System",
            children: [
                cs,
            ],
            options: {
                collapsed: true,
                hidden: true,
            },
        }),
        img1,
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