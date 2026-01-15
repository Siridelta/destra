import { Expl, Formula } from "./formula/base";

export function stringifyFormula(f: Formula): string {
    let id: string | undefined;
    let content: string | undefined;
    if (f instanceof Expl) {
        id = f.id();
    }
    content = f['_content'] as string;   
    return `[${id}] "${content}"`;
}