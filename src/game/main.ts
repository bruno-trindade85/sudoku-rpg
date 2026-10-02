import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale, Types } from 'phaser';
import { UNIT_IDS, type CharacterType } from './units/UnitConfig';

const ARCHER_IDLE_TEXTURES = [
    'archer-idle-down-0',
    'archer-idle-down-1',
    'archer-idle-down-2'
] as const;
const ARCHER_IDLE_FRAME_MS = 180;

type BoardPiece = {
    sprite: Phaser.GameObjects.Image;
};

type MainGamePrototype = {
    preload: (this: MainGame) => void;
    placeCharacter: (this: MainGame, character: CharacterType, x: number, y: number) => BoardPiece;
};

/**
 * Teste de idle do arqueiro.
 *
 * Os três frames são carregados separadamente e a troca de textura só é
 * iniciada dentro de placeCharacter(), ou seja: o card do arqueiro continua
 * estático e a animação começa apenas quando o arqueiro entra no tabuleiro.
 */
const installArcherBoardIdle = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalPlaceCharacter = prototype.placeCharacter;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);
        this.load.image(ARCHER_IDLE_TEXTURES[0], 'assets/units/archer/archer_down_0.png');
        this.load.image(ARCHER_IDLE_TEXTURES[1], 'assets/units/archer/archer_down_1.png');
        this.load.image(ARCHER_IDLE_TEXTURES[2], 'assets/units/archer/archer_down_2.png');
    };

    prototype.placeCharacter = function (
        this: MainGame,
        character: CharacterType,
        x: number,
        y: number
    ): BoardPiece {
        const piece = originalPlaceCharacter.call(this, character, x, y);

        if (character.id !== UNIT_IDS.archer) {
            return piece;
        }

        let frameIndex = 0;
        piece.sprite.setTexture(ARCHER_IDLE_TEXTURES[frameIndex]);

        const idleTimer = this.time.addEvent({
            delay: ARCHER_IDLE_FRAME_MS,
            loop: true,
            callback: () => {
                if (!piece.sprite.active) {
                    idleTimer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % ARCHER_IDLE_TEXTURES.length;
                piece.sprite.setTexture(ARCHER_IDLE_TEXTURES[frameIndex]);
            }
        });

        piece.sprite.once('destroy', () => idleTimer.remove(false));
        return piece;
    };
};

installArcherBoardIdle();

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
