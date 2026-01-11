
import { CompileContext } from "../types";
import { reservedVars, reservedWords } from "../../expr-dsl/syntax-reference/reservedWords";
import { getState } from "../../state";
import { Expl } from "../../formula/base";
import { normalizeName2, realnamePattern } from "../../formula/realname";
import { createRegExp } from "magic-regexp";

const greekLetters = [
    "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa",
    "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon",
    "phi", "chi", "psi", "omega"
    // Desmos also supports capital Greek letters? usually Var_... syntax handles it.
    // We focus on lower case for now or common ones.
];
const sortedGreek = [...greekLetters].sort((a, b) => b.length - a.length);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const transformId = (id: string): string => {
    // Remove underscores if every segment has them
    const parts = id.split('.').map(p => p.replace(/_/g, ''));

    let key = parts[parts.length - 1];
    let path = parts.slice(0, parts.length - 1).filter(p => p.length > 0);
    if (key.length === 0) key = 'v';

    let head = key.charAt(0);
    let body = key.slice(1);

    // Check Greek
    // Sort greek letters by length desc to match longest prefix
    for (const greek of sortedGreek) {
        if (key.toLowerCase().startsWith(greek)) {
            head = `\\${greek}`;
            body = key.slice(greek.length);
            break;
        }
    }

    // Path reverse and camel case
    const qualifiers = path.reverse().map(p => capitalize(p)).join('');

    const subscript = `${body}${qualifiers}`;

    if (subscript.length > 0) {
        return `${head}_{${subscript}}`;
    } else {
        return head;
    }
};

// Helper to generate suffixed name
export const makeSuffixed = (name: string, count: number) => {
    // If name already has subscript: Head_{Sub} -> Head_{Sub2} ?
    // Or append to end: Head_{Sub}2 ? 
    // Desmos syntax: `a_{1}` is valid. `a_{1}2` is `a_{1} * 2` visually?
    // No, variable names must be single char + subscript.
    // So everything after first char must be in subscript.

    // Regex to parse Head and Subscript
    const match = name.match(/^(\\[a-zA-Z]+|.)(?:_\{(.+)\})?$/);
    if (match) {
        const head = match[1];
        const sub = match[2] || '';
        return `${head}_{${sub}${count}}`;
    }
    // Fallback
    return `${name}_{${count}}`;
};

export const globalRealnameResolution = (context: CompileContext) => {
    // Initialize globalUsedNames with reserved words and forced CtxVar names
    for (const w of reservedWords) {
        context.globalUsedNames.add(w);
    }
    for (const name of context.ctxVarForceRealnameSet) {
        context.globalUsedNames.add(name);
    }

    // Sort formulas by priority
    const priority1: Expl[] = []; // Explicit Realname
    const priority2: Expl[] = []; // Explicit ID
    const priority3: Expl[] = []; // Implicit ID

    for (const formula of context.idMap.values()) {
        const state = getState(formula);
        // Explicit Realname, ensure to 'a_{1}' format here
        if (state.explId?.realname) {
            const nName = normalizeName2(state.explId.realname);
            state.explId.realname = nName;
            priority1.push(formula);
            continue;
        }

        // Check implicit/explicit ID
        // id.ts stores isImplicit in idData
        const isImplicit = state.explId?.idData?.isImplicit ?? false;
        if (isImplicit) {
            priority3.push(formula);
        } else {
            priority2.push(formula);
        }
    }

    const assignName = (formula: Expl, candidateName: string, isForcedRealname: boolean) => {
        let finalName = candidateName;

        if (!isForcedRealname) {
            // apply transform only if not forced
            finalName = transformId(candidateName);
        }

        // Conflict resolution
        let counter = 1;
        let triedName = finalName;

        while (context.globalUsedNames.has(triedName)) {
            counter++;
            triedName = makeSuffixed(finalName, counter);
        }
        finalName = triedName;

        context.globalRealnameMap.set(formula, finalName);
        context.globalUsedNames.add(finalName);
    };

    // Process Priority 1: Explicit Realname
    for (const f of priority1) {
        const state = getState(f);
        const name = state.explId!.realname!;
        assignName(f, name, true);
    }

    // Process Priority 2: Explicit ID
    for (const f of priority2) {
        const id = f.id()!;
        assignName(f, id, false);
    }

    // Process Priority 3: Implicit ID
    for (const f of priority3) {
        const id = f.id()!;
        assignName(f, id, false);
    }
};
