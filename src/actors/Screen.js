const charArray = (width, height) => {
    const array = new Uint8Array(width * height);
    return {
        get: (x, y) => array[y*width + x],
        set: (x, y, value) => { array[y*width + x] = value; },
        forEach: fn => {
            for (let i = 0; i < width; i++)
                for (let j = 0; j < height; j++)
                    fn(array[j*width + i], i, j);
        },
    }
};


const BLACK = 0;
const RED = 1;
const GREEN = 2;
const BLUE = 3;
const AQUA = 4;


const COLOR_MAP = {
    [BLACK]: 0x000000,
    [RED]: 0xff0000,
    [GREEN]: 0x00ff00,
    [BLUE]: 0x0000ff,
    [AQUA]: 0x00f0f0,
};

const PIXEL_WIDTH = 32;
const PIXEL_HEIGHT = 32;


export const Screen = ({container, x, y}) => {
    // instance variables
    const data = charArray(16, 16);
    let redraw = true;

    //graphics
    const sprite = new Graphics();
    sprite.x = x;
    sprite.y = y;
    container.addChild(sprite);

    // update handler
    const onStep = ({delta, state}) => {
        if (redraw){
            sprite.clear();
           data.forEach((value, x, y) => {
                sprite
                    .beginFill(COLOR_MAP[value] || COLOR_MAP[BLACK])
                    .drawRect(
                        PIXEL_WIDTH*x, PIXEL_HEIGHT*y,
                        PIXEL_WIDTH, PIXEL_HEIGHT
                    )
                    .endFill();
            });
            redraw = false;
        }
    };

    // destruction handler
    const onDestroy = () => {
        container.removeChild(sprite);
        sprite.destroy();
    };

    return {
        type: "Screen",
        onStep,
        onDestroy,
        changePixel: (x, y, value) => {
            redraw = true;
            data.set(x, y, value);
        },
        width: () => 16,
        height: () => 16,
    };
};