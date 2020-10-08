/*
@ keyboard: (value: string) => {
    isUp: () => boolean
    isDown: () => boolean
    unsubscribe: () => void
}
*/

export const keyboard = value => {
    // inspired by: https://github.com/kittykatattack/learningPixi#keyboard

    let isDown = false;
    let isUp = true;

    const onDown = e => {
        if (e.key === value) {
            isDown = true;
            isUp = false;
            e.preventDefault();
        }
    };
    window.addEventListener("keydown", onDown);

    const onUp = e => {
        if (e.key === value) {
            isDown = false;
            isUp = true;
            e.preventDefault();
        }
    };
    window.addEventListener("keyup", onUp);

    const unsubscribe = () => {
        window.removeEventListener("keydown", onDown);
        window.removeEventListener("keyup", onUp);
    }

    return {
        isUp: () => isUp,
        isDown: () => isDown,
        unsubscribe,
    };
};


/*
@ Event<E> : () => {
    subscribe: (key: string, h: (event: E, key: string) => void) => void
    unsubscribe: (key: string) => void
    emit: (event: E) => void
}
*/
export const Event = () => {
    const subscribers = new Map();

    return {
        subscribe: (key, h) => subscribers.set(key, h),
        unsubscribe: key => subscribers.delete(key),
        emit: event => subscribers.forEach((handler, key) => handler(event, key)),
    };
};



//@ makeSprite: (path: string, {centered: bool?}) => PIXI.Sprite
export const makeSprite = (path, {centered=false}) => {
    const sprite = new Sprite(TextureCache[path]);
    if (centered)
        sprite.anchor.set(0.5);
    return sprite;
};