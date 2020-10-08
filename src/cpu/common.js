export const registers = {
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

export const instructions = {
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
    shl: {op: 0x1a, args: ["reg", "reg"]},
    shr: {op: 0x1b, args: ["reg", "reg"]},
    dat: {op: null, args: null},
};

export const opcodeToName = Object.fromEntries(
    Object.entries(instructions).map(
        ([name, {op}]) => [op, name]
    )
);