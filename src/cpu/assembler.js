const registers = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    m: 4,
    ipl: 5,
    iph: 6,
    spl: 7,
    sph: 8,
};

const instructions = {
    hlt: {op: 0xff, args: []},
    num: {op: 0x00, args: ["reg", "const"]},
    mov: {op: 0x01, args: ["reg", "reg"]},
    jmp: {op: 0x02, args: ["const", "const"]},
    jin: {op: 0x03, args: ["reg", "reg"]},
    jiz: {op: 0x04, args: ["const", "const"]},
    jnz: {op: 0x05, args: ["const", "const"]},
    jic: {op: 0x06, args: ["const", "const"]},
    jnc: {op: 0x07, args: ["const", "const"]},
    clc: {op: 0x08, args: ["const", "const"]},
    clr: {op: 0x09, args: ["reg", "reg"]},
    ret: {op: 0x0a, args: []},
    alc: {op: 0x0b, args: ["const"]},
    eat: {op: 0x0c, args: ["const"]},
    ofg: {op: 0x0d, args: ["const"]},
    ofs: {op: 0x0e, args: ["const"]},
    pop: {op: 0x0f, args: ["reg"]},
    psh: {op: 0x10, args: ["reg"]},
    gec: {op: 0x11, args: ["const", "const"]},
    sec: {op: 0x12, args: ["const", "const"]},
    ger: {op: 0x13, args: ["reg", "reg"]},
    ser: {op: 0x14, args: ["reg", "reg"]},
    inc: {op: 0x15, args: ["reg"]},
    dec: {op: 0x16, args: ["reg"]},
    add: {op: 0x17, args: ["reg", "reg"]},
    sub: {op: 0x18, args: ["reg", "reg"]},
    mul: {op: 0x19, args: ["reg", "reg"]},
    sub: {op: 0x1a, args: ["reg", "reg"]},
    dat: {op: null, args: null},
};


const LINE_REGEX = /\s*(?:(?<COMMENT>$|#.*$)|(?<LABEL>\.[_a-zA-Z0-9]+)|(?<INSTRUCTION>(?<OP>[a-zA-Z]{3})\s*(?<ARGS>.*)))/;


const parseLine = (state, line) => {
    const [match] = [...line.matchAll(LINE_REGEX)];
    if (!match)
        throw new Error(`Syntax error on line ${state.lineno()}: ${line}`)

    if (match.groups.LABEL) {
        state.registerLabel(match.groups.LABEL.slice(1));
    } else if (match.groups.INSTRUCTION) {
        state.insertInstruction(match.groups.OP, match.groups.ARGS);
    }
};



const parseArg = lineno => arg => {
    //@ Return a function (labels: Map<string, number>) => number.
    //@ This solves the issue of referring to labels which are
    //@ defined later on in the code.
    if (arg.startsWith(":")) // low byte
        return labels => labels[arg.slice(1)] % 256;
    else if (arg.endsWith(":")) // high byte
        return labels => labels[arg.slice(0, -1)] >> 8;
    else if (!isNaN(parseInt(arg)))
        return () => parseInt(arg);
    else if (arg in registers)
        return () => registers[arg];
    else
        throw new Error(`Invalid argument ${arg} at line ${lineno}`)
}


export const parse = ({source, mountAddress}) => {
    const labels = {};
    let instructionPointer = mountAddress;
    let lineno = 1;

    // byteFactories: Array<(labels: Map<string, number>) => number>
    let byteFactories = [];

    const state = {
        lineno: () => lineno,
        registerLabel: name => {
            labels[name] = instructionPointer;
        },
        insertInstruction: (op, argString) => {
            const instruction = instructions[op];
            if (!instruction)
                throw new Error(`Unknown instruction ${op} (line ${lineno})`);

            const rawArgs = argString.trim().split(/\s+/).filter(s => s !== "");
            if (instruction.args !== null && rawArgs.length !== instruction.args.length)
                throw new Error(`Invalid argument count `
                                +`(line ${lineno}, instruction ${op}): `
                                +`expected ${instruction.args.length}, `
                                +`got ${rawArgs.length}`);

            const args = rawArgs.map(parseArg(lineno));
            if (instruction.op !== null){
                [() => instruction.op, ...args].forEach(f => byteFactories.push(f));
                instructionPointer += 1 + args.length;
            } else {
                args.forEach(f => byteFactories.push(f));
                instructionPointer += args.length;
            }
        },
    };

    for (const line of source.split("\n")){
        parseLine(state, line);
        lineno++;
    }

    return byteFactories.map(f => f(labels));
}
