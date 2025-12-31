import { Parser } from "./parser";

const inputs = [
    "1 + 2 * 3",
    "sin(x) + cos(y)",
    "[1, 2, 3]",
    "[1...10]", // Range list
    "1 + [2...5] * 3", // Mixed
    "-x^2"
];

for (const input of inputs) {
    console.log(`\nParsing: "${input}"`);
    try {
        const parser = new Parser(input);
        const ast = parser.parse();
        console.log(JSON.stringify(ast, null, 2));
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

