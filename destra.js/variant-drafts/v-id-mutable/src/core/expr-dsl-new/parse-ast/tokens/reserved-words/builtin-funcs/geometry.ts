import { createToken } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { BuiltinFunc, SupportExtensionFunc } from "./index";

export const DistanceFunc = createToken({ name: "distanceFunc", pattern: createRegExp("distance"), categories: [BuiltinFunc] });
export const MidpointFunc = createToken({ name: "midpointFunc", pattern: createRegExp("midpoint"), categories: [BuiltinFunc] });
export const PolygonFunc = createToken({ name: "polygonFunc", pattern: createRegExp("polygon"), categories: [BuiltinFunc] });
export const LengthFunc = createToken({ name: "lengthFunc", pattern: createRegExp("length"), categories: [BuiltinFunc, SupportExtensionFunc] });

export const geometryBuiltinFuncs = [
    DistanceFunc, MidpointFunc, PolygonFunc, LengthFunc
];
