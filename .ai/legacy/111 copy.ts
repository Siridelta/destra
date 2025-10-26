

// class AClass {
//     constructor(public internalNumber: number) {}
//     mandateMethod(): void {
//         console.log('mandateMethod');
//     } // must have this method
// }

// interface A<T extends string[]> extends AClass {
//     // ???
// }


// function create<T extends string[]>(params: T, internalNumber: number): A<T> {
//     return new AClass(internalNumber) as A<T>; //??????
// }


// // 目标示例

// const f1 = create(['x'], 3) as A<['x']>;   // I will manually write the 'as' cast every time
// f1(5); // f1 is callable: (x: number) => number; returns 5 * 3 = 15

// const f2 = create(['x', 'y'], 3) as A<['x', 'y']>;  // I will manually write the 'as' cast every time
// f2(5, 10); // f2 is callable: (x: number, y: number) => number; returns 5 * 10 * 3 = 150

enum E {
    A = 'A',
    B = 'B',
    C = 'C',
}

type O = 
  | ({ a: E.A, b: number }) // if a is E.A, must have b
  | ({ a: Exclude<E, E.A>});

const o: O = { a: E.A, b: 1 };