

class AClass {
    constructor(public internalNumber: number) {}
    mandateMethod(): void {
        console.log('mandateMethod');
    } // must have this method
}

// A 的泛型参数 T 现在被约束为一个函数签名
type A<T extends (...args: number[]) => number> = AClass & T;


// create 函数不再需要 params 参数，因为完整的类型信息将通过 as cast 提供
function create(internalNumber: number): A<any> { // 返回 A<any>，因为具体签名由调用者断言
    // 1. 创建一个函数，这是我们 callable 对象的核心
    const callable = (...args: number[]): number => {
        // 实现乘法逻辑
        return args.reduce((product, current) => product * current, internalNumber);
    };

    // 2. 将 AClass 的原型和属性附加到这个函数上
    const instance = new AClass(internalNumber);
    Object.setPrototypeOf(callable, AClass.prototype);
    Object.getOwnPropertyNames(instance).forEach(prop => {
        (callable as any)[prop] = (instance as any)[prop];
    });

    return callable; // 直接返回 callable，让调用者进行类型断言
}


// 目标示例

// 当你输入 f1( 时，IDE 会提示 f1(x: number): number
const f1 = create(3) as A<(x: number) => number>;
console.log(f1(5)); // f1 is callable: (x: number) => number; returns 5 * 3 = 15

// 当你输入 f2( 时，IDE 会提示 f2(x: number, y: number): number
const f2 = create(3) as A<(x: number, y: number) => number>;
console.log(f2(5, 10)); // f2 is callable: (x: number, y: number) => number; returns 5 * 10 * 3 = 150

f2.mandateMethod(); // 仍然可以调用 AClass 的方法
console.log(f2.internalNumber); // 仍然可以访问 AClass 的属性