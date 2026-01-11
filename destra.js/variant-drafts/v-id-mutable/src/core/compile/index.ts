
import { Graph } from "./types";
import { registryAndCollisionCheck } from "./resolve-names/step1_registry";
import { globalRealnameResolution } from "./resolve-names/step2_globalRealname";
import { ctxRealnameResolution } from "./resolve-names/step3_ctxRealname";

export { Graph, Folder, type GraphInput, type FolderInput, type GraphSettings, type Ticker } from "./types";

/**
 * Resolve the graph: perform ID checks, global name resolution, and context variable resolution.
 * This covers Step 1 to Step 3 of the compilation process.
 */
export const resolveGraph = (graph: Graph) => {
    // Step 1: ID Registry & Collision Check
    const ctx = registryAndCollisionCheck(graph);
    
    // Step 2: Global Realname Resolution
    globalRealnameResolution(ctx);
    
    // Step 3: Context Variable Realname Resolution
    ctxRealnameResolution(ctx);
    
    return ctx;
};
