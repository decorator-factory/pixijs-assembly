/*
@ PointerController
    x: () => number
    y: () => number
    dx: () => number
    dy: () => number
    isPressed: () => boolean

    onPress: Event
    onRelease: Event
*/


import { Event } from '../util.js';


export const MousePointerController = (() => {
    // coordinates
    let mx = 0;
    let my = 0;
    let dx = 0;
    let dy = 0;
    document.addEventListener('mousemove', e => {
        [dx, dy] = [e.clientX - mx, e.clientY - my];
        [mx, my] = [e.clientX, e.clientY];
    });

    // press events
    let isPressed = false;

    const onPress = Event();
    document.addEventListener('mousedown', e => {
        isPressed = true;
        onPress.emit({x: e.clientX, y: e.clientY});
    });

    const onRelease = Event();
    document.addEventListener('mouseup', e => {
        isPressed = false;
        onRelease.emit({x: e.clientX, y: e.clientY});
    });

    // fin
    return {
        x: () => mx,
        y: () => my,
        dx: () => dx,
        dy: () => dy,
        isPressed: () => isPressed,
        onPress,
        onRelease,
    };
})();