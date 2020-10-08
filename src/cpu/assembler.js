import { instructions, registers } from "./common.js";


const LINE_REGEX = /\s*(?:(?<COMMENT>$|#.*$)|(?<LABEL>\.[-_a-zA-Z0-9]+$)|(?<INSTRUCTION>(?<OP>[a-zA-Z]{3})\s*(?<ARGS>.*)))/g;


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
            if (name in labels)
                throw new Error(`label ${name} already defined (line ${lineno})`);
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
