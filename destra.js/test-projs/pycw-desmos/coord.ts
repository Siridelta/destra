import { expr, expl, builder, Substitutable, Expression, FuncExpl } from "@ad-destra/destra";


// Toolkit to establish a coordinate system
// it is 'passive', means it rely on a promised viewport setup to work properly

type PassiveCoordSystemConfig = {
    type: 'free-height' | 'fixed-height';
} & ({
    type: 'free-height';
    initialYMin: number;
    initialYMax: number;
    xMin: number;
    xMax: number;
} | {
    type: 'fixed-height';
    yMin: number;
    yMax: number;
    xMin: number;
    xMax: number;
})

// Return a set of functions to transform between desmos-standard coordinate system
// and a custom coordinate system that have x to range [0, 1] and y to range [0, height] that conserves the aspect ratio
// notice that in fix-height mode (the yMin - yMax is set) desmos-standard coordinate system may even not conserve the aspect ratio
// but our coordinate system could conserve, which is more suitable for ui design
const makeCoordSystem = builder(
    (idDrvs) => (config: PassiveCoordSystemConfig) => {

        let mathWidth: number;
        let mathHeight: number | Expression;
        let xMid: number;
        let yMid: number;

        if (config.type === 'free-height') {
            // in this case y boundaries can change if user changes viewport width
            // the only thing conservate is the y midpoint
            yMid = (config.initialYMin + config.initialYMax) / 2;
            xMid = (config.xMin + config.xMax) / 2;
            mathWidth = config.xMax - config.xMin;
            mathHeight = expr`${mathWidth} * height / width` as Expression;   // the 'width', 'height' here are pixel width and height
        } else {
            yMid = (config.yMin + config.yMax) / 2;
            xMid = (config.xMin + config.xMax) / 2;
            mathWidth = config.xMax - config.xMin;
            mathHeight = config.yMax - config.yMin;
        }

        const toCS_x = expl`(x) => (x - ${xMid}) / ${mathWidth} + 0.5)` as FuncExpl<(x: Substitutable) => Expression>;
        const toCS_y = expl`(y) => ((y - ${yMid}) / ${mathHeight} + 0.5) * height / width` as FuncExpl<(y: Substitutable) => Expression>;
        const toCSCoord = expl`(p) => (${toCS_x}(p.x), ${toCS_y}(p.y))` as FuncExpl<(p: Substitutable) => Expression>;

        const fromCS_x = expl`(x) => ${xMid} + (x - 0.5) * ${mathWidth}` as FuncExpl<(x: Substitutable) => Expression>;
        const fromCS_y = expl`(y) => ${yMid} + (y / height * width - 0.5) * ${mathHeight}` as FuncExpl<(y: Substitutable) => Expression>;
        const fromCSCoord = expl`(p) => (${fromCS_x}(p.x), ${fromCS_y}(p.y))` as FuncExpl<(p: Substitutable) => Expression>;

        // the yMax in the custom coordinate system
        const yMaxCS = expl`height / width` as Expression;

        toCS_x.id("toCS_x").applyIdDrvs(idDrvs);
        toCS_y.id("toCS_y").applyIdDrvs(idDrvs);
        toCSCoord.id("toCSCoord").applyIdDrvs(idDrvs);
        fromCS_x.id("fromCS_x").applyIdDrvs(idDrvs);
        fromCS_y.id("fromCS_y").applyIdDrvs(idDrvs);
        fromCSCoord.id("fromCSCoord").applyIdDrvs(idDrvs);


        return {
            toCSCoord,
            toCS_x,
            toCS_y,
            fromCSCoord,
            fromCS_x,
            fromCS_y,
            yMaxCS,
        };
    }
)

export const makePassiveCoordSystem = makeCoordSystem.prefix("coordSystem");