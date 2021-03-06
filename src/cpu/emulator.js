import { opcodeToName } from "./common.js";

// a % m is negative if a is negative;
// mod(a, m) is always non-negative if m is positive:
const mod = (x, m) => x >= 0 ? x % m : (x % m) + m;



export const CPU = ({ioGet, ioSet}) => {
    //@ CPU emulator.
    //@
    //@ Parameters:
    //@     ioGet: (addr: number) => number
    //@         When the CPU is trying to get a value at a memory address
    //@         which is mapped to IO, ioGet is invoked with `addr`
    //@         being equal to the memory offset relative to the start
    //@         of the IO memory region (i.e. if the IO region starts at
    //@         0xa000 and the requested address is 0xa123, then `addr`
    //@         will be 0x0123)
    //@
    //@     ioSet: (addr: number, value: number) => void
    //@         Same idea as ioGet, but for writing into memory instead of
    //@         reading from it.
    //@
    //@ Return value:
    //@     loadProgram: (startAddress: number, values: Array<number>) => void
    //@         Set the start address (which is stored at 0x0000-0x0001)
    //@         to `startAddress` and load the bytes from `values` into
    //@         memory starting from that address. Note that `values` doesn't
    //@         have to be an Array -- it simply has to support forEach:
    //@         forEach: (fn: (value: number, index:number) => void) => void
    //@
    //@     run: ({cyclesLimit: number}) => {halted: boolean}
    //@         Set up the initial state and run the CPU. If the CPU executes
    //@         more than `cyclesLimit` instructions, it gets paused and stops.
    //@         `halted` is set to `true` if the `run` function finished
    //@         naturally (i.e. with a `hlt` instruction) as opposed to
    //@         exceeding the cycle limit.


    const ram = new Uint8Array(65536);

    let IP = 0x0000;
    let SP = 0xf000;
    let rA = 0x00;
    let rB = 0x00;
    let rC = 0x00;
    let rD = 0x00;
    let rM = 0x00;

    let flagZero = false;
    let flagCarry = false;

    let halted = false;

    const IO_START = 0xe000;
    const IO_END = 0xefff;

    const memorySet = (addr, value) => {
        if (addr < 0 || addr > 0xffff)
            throw new Error(`Programming error: ${addr} out of bounds`)

        if (IO_START <= addr && addr <= IO_END)
            ioSet(addr - IO_START, value);
        else
            ram[addr] = value;
    };

    const memoryGet = addr => {

        if (addr < 0 || addr > 0xffff)
            throw new Error(`Programming error: ${addr} out of bounds`)

        if (IO_START <= addr && addr <= IO_END)
            return ioGet(addr - IO_START);
        else
            return ram[addr];
    };

    const registers = {
        0: { get: () => rA, set: x => { rA = x; } },
        1: { get: () => rB, set: x => { rB = x; } },
        2: { get: () => rC, set: x => { rC = x; } },
        3: { get: () => rD, set: x => { rD = x; } },

        4: { get: () => rM, set: x => { rM = x; } },

        5: { get: () => IP % 256, set: x => { IP = (IP & 0xff00) + x; } },
        6: { get: () => IP >> 8, set: x => { IP = (IP & 0x00ff) + (x << 8); } },

        7: { get: () => SP % 256, set: x => { SP = (SP & 0xff00) + x; } },
        8: { get: () => SP >> 8, set: x => { SP = (SP & 0x00ff) + (x << 8); } },

        default: { get: () => 0, set: x => {} },
    };

    const regGet = reg =>
        (registers[reg] || registers.default).get();

    const regSet = (reg, x) =>
        (registers[reg] || registers.default).set(mod(x, 256));


    const getStack = () => {
        const rv = []
        for (let i=SP; i>=0xf000; i--){
            rv.push(ram[i]);
        }
        return rv;
    };


    const stackPop = () => {
        SP--;
        return ram[SP];
    };

    const stackPush = x => {
        ram[SP] = x;
        SP++;
    };

    const instructions = {
        0xff: arg => {
            halted = true;
        },

        0x00: arg => { // NUM
            const reg = arg();
            const n = arg();
            regSet(reg, n);
        },
        0x01: arg => { // MOV
            const dest = arg();
            const src = arg();
            regSet(dest, regGet(src));
        },

        0x02: arg => { // JMP
            const low = arg();
            const high = arg();
            IP = low + high*256;
        },
        0x03: arg => { // JIN
            const low = arg();
            const high = arg();
            IP = regGet(low) + regGet(high)*256;
        },
        0x04: arg => { // JIZ
            const low = arg();
            const high = arg();
            if (flagZero)
                IP = low + high*256;
        },
        0x05: arg => { // JNZ
            const low = arg();
            const high = arg();
            if (!flagZero)
                IP = low + high*256;
        },
        0x06: arg => { // JIC
            const low = arg();
            const high = arg();
            if (flagCarry)
                IP = low + high*256;
        },
        0x07: arg => { // JNC
            const low = arg();
            const high = arg();
            if (!flagCarry)
                IP = low + high*256;
        },

        0x08: arg => { // CLC
            const low = arg();
            const high = arg();
            stackPush(IP % 256);
            stackPush(IP >> 8);
            IP = low + high*256;
        },
        0x09: arg => { // CLR
            const low = arg();
            const high = arg();
            stackPush(IP % 256);
            stackPush(IP >> 8);
            IP = regGet(low) + regGet(high)*256;
        },
        0x0a: arg => { // RET
            const ipHigh = stackPop();
            const ipLow = stackPop();
            IP = ipLow + ipHigh*256;
        },

        0x0b: arg => { // ALC
            SP += arg();
        },
        0x0c: arg => { // EAT
            SP -= arg();
        },
        0x0d: arg => { // OFG
            const dest = arg();
            const offset = arg();
            regSet(dest, memoryGet(SP - offset - 1));
        },
        0x0e: arg => { // OFS
            const src = arg();
            const offset = arg();
            memorySet(SP - offset - 1, regGet(src));
        },

        0x0f: arg => { // POP
            const dest = arg();
            regSet(dest, stackPop());
        },
        0x10: arg => { // PSH
            const src = arg();
            stackPush(regGet(src));
        },

        0x11: arg => { // GEC
            const low = arg();
            const high = arg();
            rM = memoryGet(low + high*256);
        },
        0x12: arg => { // SEC
            const low = arg();
            const high = arg();
            memorySet(low + high*256, rM);
        },
        0x13: arg => { // GER
            const low = arg();
            const high = arg();
            rM = memoryGet(regGet(low) + regGet(high)*256);
        },
        0x14: arg => { // SER
            const low = arg();
            const high = arg();
            memorySet(regGet(low) + regGet(high)*256, rM);
        },

        0x15: arg => { // INC
            const dest = arg();
            const newValue = regGet(dest) + 1;
            flagZero = (newValue === 256);
            flagCarry = (newValue === 256);
            regSet(dest, newValue);
        },
        0x16: arg => { // DEC
            const dest = arg();
            const newValue = regGet(dest) - 1;
            flagZero = (newValue === 0);
            flagCarry = (newValue === -1);
            regSet(dest, newValue);
        },

        0x17: arg => { // ADD
            const dest = arg();
            const src = arg();
            const left = regGet(dest);
            const right = regGet(src);
            flagCarry = left + right >= 256;
            flagZero = (left + right) % 256 === 0;
            regSet(dest, left + right);
        },
        0x18: arg => { // SUB
            const dest = arg();
            const src = arg();
            const left = regGet(dest);
            const right = regGet(src);
            flagCarry = left < right;
            flagZero = left === right;
            regSet(dest, left - right);
        },
        0x19: arg => { // MUL
            const dest = arg();
            const src = arg();
            const left = regGet(dest);
            const right = regGet(src);
            flagCarry = left * right >= 256;
            flagZero = (left * right) % 256 === 0;
            regSet(dest, left * right);
        },
        0x1a: arg => { // SHL
            const dest = arg();
            const src = arg();
            regSet(dest, regGet(dest) << regGet(src));
        },
        0x1b: arg => { // SHR
            const dest = arg();
            const src = arg();
            regSet(dest, regGet(dest) >> regGet(src));
        },

        0x1c: arg => { // INL
            const low = arg();
            const high = arg();
            const newValue = (regGet(low) + regGet(high)*256 + 1) % 65536;
            regSet(low, newValue % 256);
            regSet(high, newValue >> 8);
        },
        0x1d: arg => { // DEL
            const low = arg();
            const high = arg();
            const newValue = mod(regGet(low) + regGet(high)*256 - 1, 65536);
            regSet(low, newValue % 256);
            regSet(high, newValue >> 8);
        },
    };


    let fresh = true;

    const run = ({cyclesLimit}) => {
        const readArgument = () => {
            const arg = memoryGet(IP);
            IP++;
            return arg;
        };

        if (fresh){ // We're starting from scratch, not resuming
            IP = ram[0x0000] + ram[0x0001]*256;
            halted = false;
            fresh = false;
        }

        let cycles = 0;
        while (!halted) {
            const opcode = readArgument();
            const instruction = instructions[opcode];

            if (!instruction)
                throw new Error(`Invalid opcode at IP=0x${IP.toString(16).padStart(4, "0")}: 0x${opcode.toString(16).padStart(4, "0")}`);

            instruction(readArgument);

            cycles++;
            if (cycles > cyclesLimit){
                cycles = 0;
                return { halted: false };
            }
        }
        fresh = true;
        return { halted: true };
    };

    return {
        run,
        loadProgram: (startAddress, values) => {
            ram[0x0000] = startAddress % 256;
            ram[0x0001] = startAddress >> 8;
            values.forEach((value, i) => { ram[startAddress + i] = value; });
        },
    };
};
