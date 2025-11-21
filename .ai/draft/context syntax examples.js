
// 1

function ex1() {
    const S = Sum`n = 1...10`(n => {
        return expr`${n}^2`;
    });

    const I = Int`x = 0, 1`(x => {
        return expr`${x}^2`;
    });

    const s = expr`sum(n = 1...10) n^2`;
    const i = expr`int(0, 1) x^2 dx`;
}

// 2

function ex2 () {
    const S = Sum`n = 1, 10`(n => {
        return expr`${n}^2`;
    });

    const I = Int`x = 0, 1`(x => {
        return expr`${x}^2`;
    });

    const s = expr`sum(n = 1, 10) n^2`;
    const i = expr`int(0, 1) x^2 dx`;
}

// 3

function ex3 () {
    const S = Sum`n = 1 to 10`(n => {
        return expr`${n}^2`;
    });

    const I = Int`x = 0 to 1`(x => {
        return expr`${x}^2`;
    });

    const s = expr`sum(n = 1 to 10) n^2`;
    const i = expr`int(0 to 1) x^2 dx`;
}