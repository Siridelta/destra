# ExpressionState 定义

从 `@types/desmos` 库（社区制作的 Desmos 对象定义）里截取的、关于 ExpressionState 属性的代码片段。可以参考它了解 Desmos 里一个表达式可能的公式属性。

注意，Desmos 官方 API 和资料里的 "Expression" 概念并不等同于我们的 Expression 公式类型的概念。Desmos 的 Expression 概念更接近于我们的 "Formula / 公式"（总体类别）的概念，而我们的 "Expression / 表达式" 公式类型是更具体的、只包含纯表达式内容的公式类型之一。

```typescript
declare namespace Desmos {
    
    // ...

    /**
     * The dragMode of a point determines whether it can be changed by dragging in the x direction, the y direction,
     * both, or neither.
     * In addition, a point may have its dragMode set to Desmos.DragModes.AUTO, in which case the normal calculator rules
     * for determining point behavior will be applied. For example, a point whose coordinates are both slider variables would
     * be draggable in both the x and y directions.
     * The dragMode of a table column determines the behavior of the points represented by the column. The dragMode is only applicable
     * to explicitly specified column values, and has no effect on computed column values.
     */
    const DragModes: {
        X: "X";
        Y: "Y";
        XY: "XY";
        NONE: "NONE";
        AUTO: "AUTO";
    };

    // ...

    /**
     * The labelOrientation property specifies the desired position of a point's label, relative to the point itself.
     * This will override the calculator's default behavior of trying to position labels in such a way as to maintain legibility. To restore this behavior,
     * set the value back to Desmos.LabelOrientations.DEFAULT.
     * The default value is Desmos.LabelOrientations.DEFAULT.
     * 我修改了，适应 v1.12 API，它带来了更多的标签朝向，以及正确的字符串。目前尚不清楚带 "AUTO" 的朝向是什么意思，官方 API 文档里也没有说明。
     */
    const LabelOrientations: {
        DEFAULT: "default",
        CENTER: "center",
        CENTER_AUTO: "center_auto",
        AUTO_CENTER: "auto_center",
        ABOVE: "above",
        ABOVE_LEFT: "above_left",
        ABOVE_RIGHT: "above_right",
        ABOVE_AUTO: "above_auto",
        BELOW: "below",
        BELOW_LEFT: "below_left",
        BELOW_RIGHT: "below_right",
        BELOW_AUTO: "below_auto",
        LEFT: "left",
        AUTO_LEFT: "auto_left",
        RIGHT: "right",
        AUTO_RIGHT: "auto_right",
    };

    /**
     * The labelSize property specifies the text size of a point's label.
     * The default value is Desmos.LabelSizes.MEDIUM.
     */
    const LabelSizes: {
        SMALL: "SMALL";
        MEDIUM: "MEDIUM";
        LARGE: "LARGE";
    };

    /**
     * Drawing styles for points and curves may be chosen from a set of predefined values.
     * 我修改了，适应 v1.12 API，它带来了更多的点样式。以及这里把点样式和线样式写一起真的有点抽象（）
     */
    const Styles: {
        // 点样式
        POINT: "POINT";
        OPEN: "OPEN";
        CROSS: "CROSS";
        SQUARE: "SQUARE";
        PLUS: "PLUS";
        TRIANGLE: "TRIANGLE";
        DIAMOND: "DIAMOND";
        STAR: "STAR";
        // 线样式
        SOLID: "SOLID";
        DASHED: "DASHED";
        DOTTED: "DOTTED";
    };

    // ...

    type ExpressionState = 
        |  ....  // "text" 类型
        | {
            type?: "expression";
            /**
             * Following {@link https://www.desmos.com/api/v1.11/docs/index.html#document-expressions Desmos Expressions}.
             */
            latex?: string;
            /**
             * Hex color. See {@link https://www.desmos.com/api/v1.11/docs/#document-colors Colors}.
             * Default will cycle through 6 default colors.
             */
            color?: string;
            /**
             * Sets the line drawing style of curves or point lists.
             * See {@link https://www.desmos.com/api/v1.11/docs/#document-styles} Styles.
             */
            lineStyle?: keyof typeof Styles;
            /**
             * Determines width of lines in pixels. May be any positive number, or a LaTeX string that evaluates to a positive number.
             * @default 2.5
             */
            lineWidth?: number | string;
            /**
             * Determines opacity of lines. May be a number between 0 and 1, or a LaTeX string that evaluates to a number between 0 and 1.
             * @default 0.9
             */
            lineOpacity?: number | string;
            /**
             * Sets the point drawing style of point lists.
             * See {@link https://www.desmos.com/api/v1.11/docs/#document-styles} Styles.
             */
            pointStyle?: keyof typeof Styles;
            /**
             * Determines diameter of points in pixels. May be any positive number, or a LaTeX string that evaluates to a positive number.
             * @default 9
             */
            pointSize?: number | string;
            /**
             * Determines opacity of points. May be a number between 0 and 1, or a LaTeX string that evaluates to a number between 0 and 1.
             * @default 0.9
             */
            pointOpacity?: number | string;
            /**
             * Determines opacity of the interior of a polygon or parametric curve. May be a number between 0 and 1, or a LaTeX string that evaluates to a number between 0 and 1. Defaults to 0.4.
             */
            fillOpacity?: number | string;
            /**
             * Determines whether points are plotted for point lists.
             */
            points?: boolean;
            /**
             * Determines whether line segments are plotted for point lists.
             */
            lines?: boolean;
            /**
             * Determines whether a polygon or parametric curve has its interior shaded.
             */
            fill?: boolean;
            /**
             * Determines whether the graph is drawn. Defaults to false.
             */
            hidden?: boolean;
            /**
             * Determines whether the expression should appear in the expressions list. Does not affect graph visibility.
             * @default false
             */
            secret?: boolean;
            /**
             * Sets bounds of slider expressions. If step is omitted, '', or undefined, the slider will be continuously adjustable. See note below.
             */
            sliderBounds?: {
                min: number | string;
                max: number | string;
                step: number | string;
            };
            /**
             * Sets bounds of parametric curves. See note below.
             */
            parametricDomain?: {
                min: number | string;
                max: number | string;
            };
            /**
             * Sets bounds of polar curves. See note below.
             */
            polarDomain?: {
                min: number | string;
                max: number | string;
            };
            /**
             * Should be a valid property name for a javascript object (letters, numbers, and _).
             */
            id?: string;
            /**
             * Sets the drag mode of a point. See Drag Modes. Defaults to DragModes.AUTO.
             */
            dragMode?: keyof typeof DragModes;
            /**
             * . Sets the text label of a point. If a label is set to the empty string then the point's default label (its coordinates) will be applied.
             */
            label?: string;
            /**
             * Sets the visibility of a point's text label.
             */
            showLabel?: boolean;
            /**
             * Sets the size of a point's text label. See LabelSizes.
             */
            labelSize?: keyof typeof LabelSizes;
            /**
             * Sets the desired position of a point's text label. See LabelOrientations.
             */
            labelOrientation?: keyof typeof LabelOrientations;
            // 补充 labelAngle，会整体旋转标签，并且也会影响 labelOrientation 的效果，影响最终放置位置
            labelAngle?: string;
        }
        | ...  // "table" 类型，等等

    // ...
}
```