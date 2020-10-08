import * as game from './game.js';

export default (container) => {
    const app = new Application({
        width: 1024,
        height: 768,
        antialias: true,
        transparent: false,
        resolution: 1,
    });


    container.appendChild(app.view);

    game.load(loader);
    loader.load(() => {
        let state = game.setup({app});
        const {loop} = game;
        app.ticker.add(delta => loop({app, delta, state}));
    });
};