import { instructions, registers } from "./common.js";


const randomId = (base, length) => {
    const result = [];
    for (let i = 0; i<length; i++)
        result.push(base[Math.floor(Math.random() * base.length)]);
    return result.join("");
}


const buildRegex = flags => (...groups) => new RegExp(
    groups.map(([name, regex]) => `(?<${name}>(?:${regex.source})$)`).join("|"),
    flags
);

const LINE_REGEX = buildRegex("g")(
    ["NAMESPACE",   /(?<NS_PRIVATE>private\s+)?namespace\s*(?<NS_RESET>reset\s*)?(?<NS>[-_a-zA-Z0-9.]+)?/],
    ["SUB",         /sub\s+(?<SUB_NAME>[-_a-zA-Z0-9]+)/],
    ["EXPORT",      /export\s+(?<EXPORT_NAME>[-_a-zA-Z0-9.]+)(?:\s+as\s+(?<EXPORT_ALIAS>[-_a-zA-Z0-9.]+))?/],
    ["USE",         /use\s+(?<USE_NAME>[-_a-zA-Z0-9.]+)(?:\s+as\s+(?<USE_ALIAS>[-_a-zA-Z0-9.]+))?/],
    ["COMMENT",     /|#.*/],
    ["LABEL",       /\.[-_a-zA-Z0-9]+/],
    ["INSTRUCTION", /(?<OP>[a-zA-Z]{3})\s*(?<ARGS>.*)/],
);
// -> LINE_REGEX = /(?<NAMESPACE>...)|(?<EXPORT>...)|.../


const parseLine = (state, line) => {
    const [match] = [...line.trim().matchAll(LINE_REGEX)];
    if (!match)
        throw new Error(`Syntax error on line ${state.lineno()}: ${line}`)

    const g = match.groups;

    if (g.LABEL) {
        state.registerLabel(g.LABEL.slice(1));
    } else if (g.INSTRUCTION) {
        state.insertInstruction(g.OP, g.ARGS);
    } else if (g.NAMESPACE) {
        if (g.NS_RESET)
            state.setNamespace(g.NS === "global" || !g.NS ? "" : g.NS);
        else if (g.NS === "pop")
            state.popNamespace();
        else if (g.NS_PRIVATE)
            state.pushNamespace((g.NS || "anon") + "__p__" + randomId("0123456789abcdef", 8));
        else
            if (!g.NS)
                throw new Error(`Syntax error on line ${state.lineno()}: public `
                                +"namespace cannot be anonymous; did you mean"
                                +"'private namespace'?");
            else
                state.pushNamespace(g.NS);
    } else if (g.SUB) {
        // sub name
        // <=>
        // .name
        // private namespace name
        state.registerLabel(g.SUB_NAME);
        state.pushNamespace(g.SUB_NAME + "__sub__" + randomId("0123456789abcdef", 8));
    } else if (g.EXPORT) {
        state.exportLabel(g.EXPORT_NAME, g.EXPORT_ALIAS || g.EXPORT_NAME);
    } else if (g.USE) {
        state.useLabel(g.USE_NAME, g.USE_ALIAS || g.USE_NAME)
    }
};


const normalizeLabel = label =>
    label.includes(".")
    ? label
    : "." + label;


const parseArg = (lineno, namespace) => arg => {
    //@ Return a function (labels: Map<string, number>) => number.
    //@ This solves the issue of referring to labels which are
    //@ defined later on in the code.
    if (arg.startsWith(":")) // low byte
        return labels => {
            const n =
                arg[1] === "$" && arg[2] === "."
                ? labels[normalizeLabel(arg.slice(3))]
                : labels[namespace + "." + arg.slice(1)];
            if (n === undefined){
                console.log({namespace, labels});
                throw new Error(`Undefined label ${arg} at line ${lineno}`);
            }
            return n % 256;
        };
    else if (arg.endsWith(":")) // high byte
        return labels => {
            const n =
                arg[0] === "$" && arg[1] === "."
                ? labels[normalizeLabel(arg.slice(2,-1))]
                : labels[namespace + "." + arg.slice(0, -1)];
            if (n === undefined){
                console.log({namespace, labels});
                throw new Error(`Undefined label ${arg} at line ${lineno}`);
            }
            return n >> 8;
        };
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

    let namespace = "";

    const parentNamespace = () => {
        if (namespace === "")
            throw new Error(`Global namespace has no parent (line ${lineno})`);
        return namespace.split(".").slice(0, -1).join(".");
    };

    const state = {
        lineno: () => lineno,
        registerLabel: name => {
            name = namespace + "." + name;
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

            const args = rawArgs.map(parseArg(lineno, namespace));
            if (instruction.op !== null){
                [() => instruction.op, ...args].forEach(f => byteFactories.push(f));
                instructionPointer += 1 + args.length;
            } else {
                args.forEach(f => byteFactories.push(f));
                instructionPointer += args.length;
            }
        },
        setNamespace: ns => {
            namespace = ns;
        },
        popNamespace: () => {
            namespace = parentNamespace();
        },
        pushNamespace: ns => {
            if (namespace === "")
                namespace = ns;
            else
                namespace += "." + ns;
        },
        exportLabel: (label, alias) => {
            labels[parentNamespace() + "." + alias] = labels[namespace + "." + label];
        },
        useLabel: (label, alias) => {
            if (!label.includes("."))
                label = "." + label; // global labels start with `.`
            labels[namespace + "." + alias] = labels[label];
        },
    };

    for (const line of source.split("\n")){
        parseLine(state, line);
        lineno++;
    }

    // this console.log is for demonstration purposes
    console.log(labels);

    return byteFactories.map(f => f(labels));
}
