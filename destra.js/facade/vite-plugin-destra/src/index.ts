import type { Plugin, ViteDevServer } from 'vite';

interface DestraPluginOptions {
    entry: string; // 图表定义文件
    apiKey?: string; // Desmos API Key
    version?: number; // Desmos API Version, default: 10 -> 'v1.10'
}

const defaultOptions = {
    apiKey: 'dcb31709b452b1cf9dc26972add0fda6',
    version: 10
} as const satisfies Partial<DestraPluginOptions>;

export default function destraPlugin(options: DestraPluginOptions): Plugin {
    let server: ViteDevServer;
    const virtualModuleId = 'virtual:destra-client';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;

    const { entry, apiKey, version } = { ...defaultOptions, ...options };

    return {
        name: 'vite-plugin-destra',

        configureServer(_server) {
            server = _server;

            // 1. 拦截根路径，服务端编译并返回宿主 HTML
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/') {
                    try {
                        const state = await compileGraph(server, entry, version);
                        const html = getHtmlTemplate(apiKey, version, state);
                        
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/html');
                        res.end(html);
                    } catch (e) {
                        const err = e as Error;
                        server.ssrFixStacktrace(err);
                        console.error("[Destra] Compile Error:", err);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'text/html');
                        res.end(`
                            <h1>Destra Compile Error</h1>
                            <pre style="background:#f0f0f0;padding:1em;border-radius:4px;overflow:auto">${err.stack}</pre>
                        `);
                    }
                    return;
                }
                next();
            });
        },

        // 2. 注入客户端 HMR 逻辑
        resolveId(id) {
            if (id === virtualModuleId) return resolvedVirtualModuleId;
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                return getClientScript();
            }
        },

        // 3. 处理热更新
        async handleHotUpdate({ server, modules }) {
            // 这里我们采取一个激进的策略：只要有更新，我们就尝试重编译图表
            // 因为用户的图表可能依赖了任何其他文件
            
            // 我们需要清理 ssrLoadModule 的缓存，否则它可能还是旧的
            // entry 本身可能不在 modules 列表里（如果它是被引用的），但我们主要关心它的依赖链
            // Vite 的 ssrLoadModule 会自动利用 ModuleGraph。
            
            // 简单起见，我们触发一次编译
            try {
                // 注意：在 handleHotUpdate 时，Vite 已经处理了 ModuleGraph 的失效逻辑
                // 所以这里直接 ssrLoadModule 应该是能拿到新代码的
                const state = await compileGraph(server, entry, version);
                
                // 通过 WebSocket 通知客户端更新
                server.ws.send({
                    type: 'custom',
                    event: 'destra:update',
                    data: state
                });
                
                // 返回空数组，告诉 Vite 我们已经处理了这次更新，不需要页面重载
                // 除非是图表文件本身以外的变更（例如 html, css），那些我们可能想保留默认行为
                // 但这里我们是在开发一个纯 Graph 项目，通常只关心 Graph 更新
                return []; 
            } catch (e) {
                console.error("[Destra] HMR Compile Error:", e);
                // 出错时，我们允许 Vite 继续默认行为（可能会刷新页面）
                // 或者我们可以发一个 error event 给客户端显示 overlay
                return modules;
            }
        }
    };
}

async function compileGraph(server: ViteDevServer, entryPath: string, version: number | undefined) {
    // 确保路径是相对于 root 的
    // ssrLoadModule 接受相对于 root 的路径或绝对路径
    const mod = await server.ssrLoadModule(entryPath);
    
    // 检查默认导出
    const graph = mod.default;
    if (!graph || typeof graph.export !== 'function') {
        throw new Error(`Entry file must export default a Graph instance. Got: ${graph}`);
    }

    // 执行编译
    const state = graph.export({ version });
    return state;
}

function getHtmlTemplate(apiKey: string, version: number, initialState: any) {
    const key = apiKey;
    const stateJson = JSON.stringify(initialState);
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Destra Preview</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>html, body, #calculator { width: 100%; height: 100%; margin: 0; overflow: hidden; }</style>
    <script src="https://www.desmos.com/api/v1.${version}/calculator.js?apiKey=${key}"></script>
    <script>
        window.__DESTRA_INITIAL_STATE__ = ${stateJson};
    </script>
</head>
<body>
    <div id="calculator"></div>
    <script type="module" src="/@id/virtual:destra-client"></script>
</body>
</html>`;
}

function getClientScript() {
    return `
    const elt = document.getElementById('calculator');
    const calculator = Desmos.GraphingCalculator(elt, {
        // expressions: false 
    });
    window.Calc = calculator;

    if (window.__DESTRA_INITIAL_STATE__) {
        console.log("[Destra] Initial render");
        calculator.setState(window.__DESTRA_INITIAL_STATE__);
    }

    if (import.meta.hot) {
        import.meta.hot.on('destra:update', (state) => {
            console.log("[Destra] Hot update received");
            calculator.setState(state);
        });
    }
    `;
}
