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
    ["DEF",         /def\s+(?<DEF_NAME>[-_a-zA-Z0-9]+)(?<DEF_EXPORT>\s+public(?:\s+as\s+(?<DEF_ALIAS>[-_a-zA-Z0-9.]+))?)?/],
    ["EXPORT",      /export\s+(?<EXPORT_NAME>[-_a-zA-Z0-9.]+)(?:\s+as\s+(?<EXPORT_ALIAS>[-_a-zA-Z0-9.]+))?/],
    ["USE",         /use\s+(?<USE_NAME>(\$+\.)?[-_a-zA-Z0-9.]+)(?:\s+as\s+(?<USE_ALIAS>[-_a-zA-Z0-9.]+))?/],
    ["COMMENT",     /|#.*/],
    ["LABEL",       /\.(?<LABEL_NAME>[-_a-zA-Z0-9]+)(?<LABEL_EXPORT>\s+public(?:\s+as\s+(?<LABEL_ALIAS>[-_a-zA-Z0-9.]+))?)?/],
    ["INSTRUCTION", /(?<OP>[a-zA-Z]{3})\s*(?<ARGS>.*)/],
);
// -> LINE_REGEX = /(?<NAMESPACE>...)|(?<EXPORT>...)|.../


const parseLine = (state, line) => {
    const [match] = [...line.trim().matchAll(LINE_REGEX)];
    if (!match)
        throw new Error(`Syntax error on line ${state.lineno()}: ${line}`)

    const g = match.groups;

    if (g.LABEL) {
        state.registerLabel(g.LABEL_NAME);
        if (g.LABEL_EXPORT){
            const dn = state.demangledNamespace();
            if (dn.split(".").slice(-1)[0] === "anon")
                throw new Error(`Error on line ${state.lineno()}: cannot publish from anonymous namespace.`)
            state.exportLabelAbsolute(g.LABEL_NAME, dn + "." + (g.LABEL_ALIAS || g.LABEL_NAME));
        }
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
    } else if (g.DEF) {
        // def name
        // <=>
        // .name
        // private namespace name

        // def name export as alias
        // <=>
        // .name
        // export name as alias
        // private namespace name

        state.registerLabel(g.DEF_NAME);
        if (g.DEF_EXPORT){
            const dn = state.demangledNamespace();
            if (dn.split(".").slice(-1)[0] === "anon")
                throw new Error(`Error on line ${state.lineno()}: cannot publish from anonymous namespace.`)
            state.exportLabelAbsolute(g.DEF_NAME, dn + "." + (g.DEF_ALIAS || g.DEF_NAME));
        }
        state.pushNamespace(g.DEF_NAME + "__def__" + randomId("0123456789abcdef", 8));
    } else if (g.EXPORT) {
        state.exportLabel(g.EXPORT_NAME, g.EXPORT_ALIAS || g.EXPORT_NAME);
    } else if (g.USE) {
        state.useLabel(g.USE_NAME, g.USE_ALIAS)
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
            const qualifiedName =
                arg[1] === "*" && arg[2] === "."
                ? normalizeLabel(arg.slice(3))
                : namespace === ""
                    ? arg.slice(1)
                    : namespace + "." + arg.slice(1);
            const n = labels[qualifiedName];
            if (n === undefined){
                throw new Error(`Undefined label ${arg} at line ${lineno}`);
            }
            return n % 256;
        };
    else if (arg.endsWith(":")) // high byte
        return labels => {
            const qualifiedName =
                arg[0] === "*" && arg[1] === "."
                ? normalizeLabel(arg.slice(2,-1))
                : namespace === ""
                    ? arg.slice(0, -1)
                    : namespace + "." + arg.slice(0, -1);
            const n = labels[qualifiedName];
            if (n === undefined){
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
        demangledNamespace: () => {
            if (namespace === "")
                return "";
            const parts = namespace.split(".");
            const [parents, [last]] = [parts.slice(0, -1), parts.slice(-1)];
            parents.splice(parentNamespace().length + 1);
            let dn = parents.join(".") + "." + last.replace(/__.*/, "");
            while (dn.startsWith("."))
                dn = dn.slice(1);
            return dn;
        },
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

            const rawArgs = argString
                // turn `%x` into `:x x:` :
                .replace(/%(.*)(?:\s|\b|$)/, (_, label) => `:${label} ${label}:`)
                .split(/\s+/)
                .filter(s => s !== "");
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
        exportLabel: (label, alias=null) => {
            if (!alias)
                alias = label;
            labels[parentNamespace() + "." + alias] = labels[namespace + "." + label];
        },
        exportLabelAbsolute: (label, alias) => {
            labels[alias] = labels[namespace + "." + label];
        },
        useLabel: (label, alias=null) => {
            // TODO: clean up this function

            let parent = parentNamespace();
            while (label.startsWith("$")){
                parent = parent.split(".").slice(0, -1).join(".");
                label = label.slice(1);
            }

            while (label.startsWith("."))
                label = label.slice(1);
            if (!alias)
                alias = label;

            let qualifiedName = parent + "." + label;
            if ([...qualifiedName].filter(c => c === ".").length > 1 && qualifiedName.startsWith("."))
                qualifiedName = qualifiedName.slice(1);

            labels[namespace + "." + alias] = labels[qualifiedName];
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
