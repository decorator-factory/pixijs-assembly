import { Screen } from "./actors/Screen.js";
import { Emulator } from "./actors/Emulator.js";
import { KeyboardWasdController } from "./inputControllers/WasdController.js"
import { program } from "./asm_source.js";

export const load = loader => {
    //@ Load static assets such as images and bitmap fonts

};


export const setup = ({app}) => {
    //@ Create the initial state of the game
    app.renderer.backgroundColor = 0x061639;

    const container = app.stage;

    const screen = Screen({container, x: 32, y: 32});
    const emulator = Emulator({
        sourceCode: program,
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
