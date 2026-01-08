export enum ValueTypeKind {
    Number = "number",
    Point = "point",
    List = "list",
    Polygon = "polygon",
    Color = "color",
    Action = "action",
    Tone = "tone",
    Dist = "dist",
}

export type ValueType =
    | {
        kind: ValueTypeKind.Number;
    }
    | {
        kind: ValueTypeKind.Point;
    }
    | {
        kind: ValueTypeKind.List;
        valueType: ValueType & {
            kind:
            | ValueTypeKind.Number
            | ValueTypeKind.Point
            | ValueTypeKind.Polygon
            | ValueTypeKind.Color
            | ValueTypeKind.Tone
            | ValueTypeKind.Dist
        };
    }
    | {
        kind: ValueTypeKind.Polygon;
    }
    | {
        kind: ValueTypeKind.Color;
    }
    | {
        kind: ValueTypeKind.Action;
    }
    | {
        kind: ValueTypeKind.Tone;
    }
    | {
        kind: ValueTypeKind.Dist;
    }

export type ASTOfValueType<T extends ValueType | ValueTypeKind> = T & {
    valueType: T extends ValueType ? T : ValueType & { kind: T };
}

export type ValueTypeOfValueType<T extends ValueTypeKind, V extends ValueType | ValueTypeKind> 
    = { 
        kind: T,
        valueType: V extends ValueType ? V : ValueType & { kind: V };
    }