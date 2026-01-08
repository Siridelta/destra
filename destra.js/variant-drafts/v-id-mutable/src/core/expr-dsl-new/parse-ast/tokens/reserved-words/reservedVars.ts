import { createToken, Lexer } from "chevrotain";
import { createRegExp } from "magic-regexp";

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
    categories: [ReservedVar, Attribute],
});

export const YVar = createToken({
    name: "yVar",
    pattern: createRegExp("y"),
    categories: [ReservedVar, Attribute],
});

export const ZVar = createToken({
    name: "zVar",
    pattern: createRegExp("z"),
    categories: [ReservedVar, Attribute],
});

export const TVar = createToken({
    name: "tVar",
    pattern: createRegExp("t"),
    categories: [ReservedVar],
});

export const UVar = createToken({
    name: "uVar",
    pattern: createRegExp("u"),
    categories: [ReservedVar],
});

export const VVar = createToken({
    name: "vVar",
    pattern: createRegExp("v"),
    categories: [ReservedVar],
});

export const RVar = createToken({
    name: "rVar",
    pattern: createRegExp("r"),
    categories: [ReservedVar],
});

export const ThetaVar = createToken({
    name: "thetaVar",
    pattern: createRegExp("theta"),
    categories: [ReservedVar],
});

export const RhoVar = createToken({
    name: "rhoVar",
    pattern: createRegExp("rho"),
    categories: [ReservedVar],
});

export const PhiVar = createToken({
    name: "phiVar",
    pattern: createRegExp("phi"),
    categories: [ReservedVar],
});

export const reservedVars = [
    // 'r' after 'rho'
    // 't' after 'theta'
    XVar, YVar, ZVar, UVar, VVar, ThetaVar, RhoVar, PhiVar, RVar, TVar, 
    ReservedVar,
];