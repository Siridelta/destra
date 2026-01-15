import { expr } from "../factories";
import { Expression, Formula, createTemplatePayload } from "./base";
import { ActionStyleValue, NumericStyleValue, PointStyleValue } from "./style";
import { FormulaType, Substitutable } from "./types";



export interface ImageOptions {
    /**
     * 图片中心点坐标 (必须是 Point 类型的 Expression，如 expr`(0,0)`)
     */
    center?: PointStyleValue;

    /**
     * 图片宽度 (单位：坐标轴单位)
     * 默认值: 10
     */
    width?: NumericStyleValue;

    /**
     * 图片高度 (单位：坐标轴单位)
     * 默认值: 10
     */
    height?: NumericStyleValue;

    /**
     * 旋转角度 (弧度)
     * 默认值: 0
     */
    angle?: NumericStyleValue;

    /**
     * 不透明度 (0-1)
     * 默认值: 1
     */
    opacity?: NumericStyleValue;

    /**
     * Desmos 界面中显示的名称
     */
    name?: string;

    /**
     * 是否允许拖拽
     * 默认值: true
     */
    draggable?: boolean;

    /**
     * 点击时触发的动作 (Action)
     */
    onClick?: ActionStyleValue;

    /**
     * 鼠标悬停时显示的图片 URL
     */
    hoverImage?: string;

    /**
     * 鼠标按下时显示的图片 URL
     */
    depressedImage?: string;
}

export class Image extends Formula {
    public readonly type = FormulaType.Image;
    public readonly isEmbeddable = false as const;

    public readonly url: string;
    public readonly name?: string;

    // 存储完整的配置项 (包含默认值)
    public readonly options: ImageOptions;

    constructor(url: string, options?: ImageOptions) {

        options = options || {};

        // 1. 收集所有作为属性传入的表达式，以便构建依赖关系
        const deps: Substitutable[] = [];
        
        const addIfExpr = (val: NumericStyleValue | PointStyleValue | ActionStyleValue | undefined) => {
            if (val instanceof Formula) deps.push(val);
        };
        
        addIfExpr(options.center);
        addIfExpr(options.width);
        addIfExpr(options.height);
        addIfExpr(options.angle);
        addIfExpr(options.opacity);
        addIfExpr(options.onClick);

        // 2. 构造一个虚拟的 TemplatePayload 传递给基类 Formula
        // Formula 会自动解析 deps 中的依赖项，从而正确构建依赖图 DAG
        // 这样当这些属性表达式所依赖的变量改变时，Image 也会被标记为受影响（虽然 Image 本身不参与计算）
        super(createTemplatePayload(
            Object.freeze(new Array(deps.length + 1).fill("")) as any, 
            deps
        ));

        this.url = url;
        this.name = options.name;

        // 如果宽高都未指定，desmos 里宽高默认值为 10，但是 desmos 初始化图像时会根据图像宽高比手动指定一个符合比例的宽度
        // 所以我们也要手动指定宽度，否则不带宽度传入 state，desmos 会把它宽高视为 10, 10，图片会变形
        if (options.width === undefined && options.height === undefined) {
            const dimensions = tryParseDimensions(url);
            if (dimensions) {
                const [picWidth, picHeight] = dimensions;
                options.height = 10;
                options.width = expr`${picWidth} / ${picHeight} * ${options.height}` as Expression;
            }
        }

        // 3. 应用默认值
        this.options = {
            ...options
        };
    }

    protected get _content(): string {
        return `[Image ${this.name || this.url.slice(0, 20)}...]`;
    }
}

// 增加一个简单的 Base64 解析辅助函数
// 注意：这个实现只处理最常见的 PNG 和 JPEG，用于优化开发体验
const tryParseDimensions = (url: string): [number, number] | undefined => {
    if (!url.startsWith('data:image/')) return undefined;

    try {
        const base64Data = url.split(',')[1];
        if (!base64Data) return undefined;

        // 读取头部数据（只需前 1KB 即可包含头部信息）
        // atob 在现代浏览器和 Node.js (v16+) 均全局可用
        const header = atob(base64Data.slice(0, 1024));

        const getByte = (i: number) => header.charCodeAt(i);
        const getUInt16BE = (i: number) => (getByte(i) << 8) | getByte(i + 1);
        const getUInt32BE = (i: number) => (getByte(i) << 24) | (getByte(i + 1) << 16) | (getByte(i + 2) << 8) | getByte(i + 3);

        // 检测 PNG: 89 50 4E 47 ...
        if (getByte(0) === 0x89 && header.slice(1, 4) === 'PNG') {
            // PNG IHDR chunk 始于 offset 8
            // Width @ 16, Height @ 20
            return [getUInt32BE(16), getUInt32BE(20)];
        }

        // 检测 JPEG: FF D8 ...
        if (getByte(0) === 0xFF && getByte(1) === 0xD8) {
            let offset = 2;
            while (offset < header.length - 10) { // 防止越界
                const marker = getByte(offset + 1);
                // SOF0 (Baseline) = C0, SOF2 (Progressive) = C2
                if (marker === 0xC0 || marker === 0xC2) {
                    const h = getUInt16BE(offset + 5);
                    const w = getUInt16BE(offset + 7);
                    return [w, h];
                }
                // 跳过当前 segment
                offset += 2 + getUInt16BE(offset + 2);
            }
        }
    } catch (e) {
        // 解析失败则忽略，不做任何处理
    }
    return undefined;
}