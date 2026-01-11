


export const hasType = (node: any): node is { type: string } => (
    typeof node === 'object' && Object.keys(node).includes('type')
);