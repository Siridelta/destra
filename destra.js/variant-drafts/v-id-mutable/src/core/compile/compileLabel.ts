import { Label } from "../formula/label";
import { getState } from "../state";
import { CompileContext } from "./types";

export const compileLabel = (label: Label, ctx: CompileContext, force: boolean = false) => {
    const state = getState(label);
    state.compile ??= {};
    if (!force && state.compile.compiled) {
        return state.compile.compiled;
    }

    const { template, values } = label;
    let source = template[0]!;
    for (let i = 0; i < values.length; i += 1) {
        const val = values[i];
        const name = ctx.globalRealnameMap.get(val);

        if (!name) 
            throw new Error(`Variable ${val.id()} realname not found.`);
        
        source += `\${${name}}`;
        source += template[i + 1]!;
    }
    
    state.compile.compiled = source;
    return source;
}