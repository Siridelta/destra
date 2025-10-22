class BernardExpr {
    constructor(private expr: string) {}
    toString(): string {
        return this.expr;
    }
}

// ----------------------------------------------------
// 1. 定义基础的数据结构 (Style Properties)
// ----------------------------------------------------
interface PointStyle {
    size?: number | BernardExpr; // 属性值可以是JS原生类型，也可以是Bernard表达式
    drag?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | BernardExpr;
}

interface LabelStyle {
    content?: string | BernardExpr;
    size?: number | BernardExpr;
    color?: string | BernardExpr;
}

// ----------------------------------------------------
// 2. 定义 "混合体" 编辑器类型
// ----------------------------------------------------

// PointEditor 是一个接口，它继承了 PointStyle 的所有数据属性
// 同时，它自己还有一个 "调用签名"，这让它成为了一个可调用的函数。
interface PointEditor extends PointStyle {
    // 这就是调用签名，它定义了当这个对象被当作函数调用时的参数和返回值
    (updater: (p: PointStyle) => void): void;
}

// LabelEditor 同理
interface LabelEditor extends LabelStyle {
    (updater: (lbl: LabelStyle) => void): void;
}


// ----------------------------------------------------
// 3. 定义顶层的 Style 编辑器
// ----------------------------------------------------
interface StyleEditor {
    point: PointEditor;
    label: LabelEditor;
    // ... 未来可以添加 line, fill 等其他编辑器
}

// ----------------------------------------------------
// 4. 在我们的 Expl 类中应用这个类型
// ----------------------------------------------------

class Expl {
    private _styles: { point?: PointStyle, label?: LabelStyle } = {};

    style(editorCallback: (s: StyleEditor) => void): this {
        // 在这里，我们需要在运行时创建一个符合 StyleEditor 接口的对象
        // 这通常通过 Proxy 或者动态创建函数和属性来实现
        
        const styleEditor: StyleEditor = {
            point: this.createEditorFor('point'),
            label: this.createEditorFor('label')
        };
        
        // 调用用户传入的回调函数，让用户来操作这个编辑器
        editorCallback(styleEditor);
        
        // 返回 this 以支持链式调用
        return this;
    }

    // 辅助方法，用于在运行时创建混合体对象
    private createEditorFor<K extends keyof StyleEditor>(key: K): StyleEditor[K] {
        // 创建一个函数
        const editorFn = (updater: (style: any) => void) => {
            if (!this._styles[key]) {
                (this._styles as any)[key] = {};
            }
            updater(this._styles[key]!);
        };

        // 将数据属性代理到内部的 _styles 对象上
        return new Proxy(editorFn, {
            get: (target, prop, receiver) => {
                return (this._styles[key] as any)?.[prop];
            },
            set: (target, prop, value, receiver) => {
                if (!this._styles[key]) {
                    (this._styles as any)[key] = {};
                }
                (this._styles[key] as any)[prop] = value;
                return true;
            }
        }) as StyleEditor[K];
    }
}