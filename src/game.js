import { Screen } from "./actors/Screen.js";
import { Emulator } from "./actors/Emulator.js";
import { KeyboardWasdController } from "./inputControllers/WasdController.js"


export const load = loader => {
    //@ Load static assets such as images and bitmap fonts

};


const PROGRAM = `
.setup
    # change the entry point to .main:
    num m :main
    sec 0x00 0x00
    num m main:
    sec 0x00 0x01

    hlt


.x
    dat 0

.y
    dat 5


.clear
    num b 0
    ._clear_bx
        num a 0
        ._clear_ax
            # c <- b*16 + a
            mov c b
            num d 16
            mul c d
            add c a

            num d 0xe0
            num m 0
            ser c d

            inc a
            psh a
            num d 16
            sub a d
            pop a
            jnz :_clear_ax _clear_ax:
        inc b
        psh b
        num d 16
        sub b d
        pop b
        jnz :_clear_bx _clear_bx:
    ret


.main
    clc :clear clear:

    num a 0

    gec :x x:
    add a m

    gec :y y:
    num b 16
    mul b m
    add a b

    num m 2
    num b 0xe0
    ser a b

    # left button? -> M
    gec 0x00 0xe1
    add m m
    jiz :skip1 skip1:
        gec :x x:
        dec m
        jic :skip1 skip1:
            sec :x x:
    .skip1

    # right button? -> M
    gec 0x01 0xe1
    add m m
    jiz :skip2 skip2:
        gec :x x:
        inc m

        psh m
        num d 16
        sub m d
        pop m
        jiz :skip2 skip2:

        sec :x x:
    .skip2

    # up button? -> M
    gec 0x02 0xe1
    add m m
    jiz :skip3 skip3:
        gec :y y:
        dec m
        jic :skip3 skip3:
            sec :y y:
    .skip3

    # down button? -> M
    gec 0x03 0xe1
    add m m
    jiz :skip4 skip4:
        gec :y y:
        inc m

        psh m
        num d 16
        sub m d
        pop m
        jiz :skip4 skip4:

        sec :y y:
    .skip4


    hlt
`;


export const setup = ({app}) => {
    //@ Create the initial state of the game
    app.renderer.backgroundColor = 0x061639;

    const container = app.stage;

    const screen = Screen({container, x: 32, y: 32});
    const emulator = Emulator({
        sourceCode: PROGRAM,
        screen,
        wasd: KeyboardWasdController,
    });

    return {
        actors: [screen, emulator],
        frame: 0n,
        _ofTypeCache: new Map(),
    };
}



export const loop = ({app, delta, state}) => {
    //@ Mutate the state one step at a time

    const toDestroy = new Set();
    const toAdd = [];

    for (const actor of state.actors){
        actor.onStep({
            self: actor,
            app,
            delta,
            state,
            destroy: a => toDestroy.add(a ? a : actor),
            create: makeActor => toAdd.push(makeActor),
            ofType: type => {
                // since actors aren't added or destroyed during the update,
                // we can cache each query!
                if (state._ofTypeCache.has(type)){
                    return state._ofTypeCache.get(type);
                }else{
                    const foundActors =
                        state.actors.filter(actor => actor.type === type);
                    state._ofTypeCache.set(type, foundActors);
                    return foundActors;
                }
            },
        });
    }

    if (toDestroy.size !== 0){
        state.actors = state.actors.filter(actor => !toDestroy.has(actor));
        toDestroy.forEach(actor => {
            actor.onDestroy({app, state});
            state._ofTypeCache.delete(actor.type);
        });
    }

    for (const makeActor of toAdd){
        const actor = makeActor();
        state._ofTypeCache.delete(actor.type);
        state.actors.push(actor);
    }

    state.frame += 1n;
};
