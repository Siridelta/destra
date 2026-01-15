import { expr, expl, builder } from "@ad-destra/destra";


// Toolkit to establish a coordinate system
// it is 'passive', means it rely on a promised viewport setup to work properly

type PassiveCoordSystemConfig = {
    type: 'free-height' | 'fixed-height';
} & {
    type: 'free-height';
    initialYMin: number;
    initialYMax: number;
} & {
    type: 'fixed-height';
    initialYMin: number;
    initialYMax: number;
}

const csBuilder = builder(
    (idDrvs) => (x: number, y: number) => {
        return expl`(${x}, ${y})`.id("pt").applyIdDrvs(idDrvs);
    }
)