import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale, Types } from 'phaser';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#17191f',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        // Mantém a proporção do jogo e centraliza o canvas quando a janela muda de tamanho.
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        MainGame
    ]
};

const StartGame = (parent: string) => {
    // O parent recebido permite montar o jogo em qualquer contêiner da página.
    return new Game({ ...config, parent });
}

export default StartGame;
