import { createToken, Lexer } from "chevrotain";
import { createRegExp } from "magic-regexp";
import { CustomIdentifier } from "../others";

export const ReservedVar = createToken({
    name: "ReservedVar",
    pattern: Lexer.NA
});

// 为什么 Attribute 要全划到这里.....
// attribute 目前只包含 x, y, z 三个，全和这里的重合了。
export const Attribute = createToken({
    name: "Attribute",
    pattern: Lexer.NA
});

export const XVar = createToken({
    name: "xVar",
    pattern: createRegExp("x"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar, Attribute],
});

export const YVar = createToken({
    name: "yVar",
    pattern: createRegExp("y"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar, Attribute],
});

export const ZVar = createToken({
    name: "zVar",
    pattern: createRegExp("z"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar, Attribute],
});

export const TVar = createToken({
    name: "tVar",
    pattern: createRegExp("t"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const UVar = createToken({
    name: "uVar",
    pattern: createRegExp("u"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const VVar = createToken({
    name: "vVar",
    pattern: createRegExp("v"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const RVar = createToken({
    name: "rVar",
    pattern: createRegExp("r"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const ThetaVar = createToken({
    name: "thetaVar",
    pattern: createRegExp("theta"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const RhoVar = createToken({
    name: "rhoVar",
    pattern: createRegExp("rho"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const PhiVar = createToken({
    name: "phiVar",
    pattern: createRegExp("phi"),
    longer_alt: CustomIdentifier,
    categories: [ReservedVar],
});

export const reservedVars = [
    // 'r' after 'rho'
    // 't' after 'theta'
    XVar, YVar, ZVar, UVar, VVar, ThetaVar, RhoVar, PhiVar, RVar, TVar, 
    ReservedVar,
];