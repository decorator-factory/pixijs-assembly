/*
@ WasdController:
    left: () => boolean
    right: () => boolean
    up: () => boolean
    down: () => boolean

The idea is to allow using different devices to control movement.
*/

import { keyboard } from '../util.js';


export const KeyboardWasdController = (() => {
    const left = keyboard("a");
    const right = keyboard("d");
    const up = keyboard("w");
    const down = keyboard("s");

    return {
        left: () => left.isDown(),
        right: () => right.isDown(),
        up: () => up.isDown(),
        down: () => down.isDown(),
    };
})();