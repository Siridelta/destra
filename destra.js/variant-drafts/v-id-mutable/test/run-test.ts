/**
 * 测试运行脚本
 * 
 * 这个脚本用于运行基础功能测试。
 * 你可以使用以下命令运行：
 * 
 * 使用 tsx（推荐）:
 *   npx tsx test/run-test.ts
 * 
 * 或使用 ts-node:
 *   npx ts-node test/run-test.ts
 * 
 * 或先编译再运行:
 *   tsc test/basic.test.ts --outDir dist --module esnext --target es2020 --moduleResolution node
 *   node dist/test/basic.test.js
 */



export async function runTest() {
    await import("./basic.test.ts");
}

runTest();