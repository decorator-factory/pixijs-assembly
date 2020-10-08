import { CPU } from "../cpu/emulator.js";
import { parse } from "../cpu/assembler.js";

export const Emulator = ({sourceCode, screen, wasd}) => {
    // instance variables
    const screenWidth = screen.width();
    const screenHeight = screen.height();

    const ADDR_LEFT =  screenWidth*screenHeight + 0;
    const ADDR_RIGHT = screenWidth*screenHeight + 1;
    const ADDR_UP =    screenWidth*screenHeight + 2;
    const ADDR_DOWN =  screenWidth*screenHeight + 3;

    const ioGet = addr => {
        if (0 <= addr && addr < screenWidth * screenHeight)
            throw new Error(`Attempt to read from video memory: ${addr}`);

        if (addr === ADDR_LEFT)
            return Number(wasd.left());
        if (addr === ADDR_RIGHT)
            return Number(wasd.right());
        if (addr === ADDR_UP)
            return Number(wasd.up());
        if (addr === ADDR_DOWN)
            return Number(wasd.down());

        throw new Error(`Attempt to read from unmapped IO region: ${addr}`);
    };
    const ioSet = (addr, value) => {
        if (0 <= addr && addr < screenWidth * screenHeight)
            screen.changePixel(addr % screenWidth, Math.floor(addr / screenWidth), value);
        else
            throw new Error(`Attempt to write to unmapped IO region: ${addr}`);
    };
    const cpu = CPU({ioGet, ioSet});

    const code = parse({ source: sourceCode, mountAddress: 0x10 });
    cpu.loadProgram(0x10, code);

    // update handler
    const onStep = ({state}) => {
        if (state.frame % 4n === 0n)
            cpu.run();
    };

    // destruction handler
    const onDestroy = () => {

    };

    return {
        type: "Emulator",
        onStep,
        onDestroy,
    }
};