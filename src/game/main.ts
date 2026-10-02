import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale, Types } from 'phaser';
import { UNIT_IDS, type CharacterType, type UnitType } from './units/UnitConfig';

const BOARD_IDLE_CONFIG: Partial<Record<UnitType, {
    textures: readonly string[];
    paths: readonly string[];
    frameMs: number;
    scale: number;
}>> = {
    [UNIT_IDS.archer]: {
        textures: [
            'archer-idle-down-0',
            'archer-idle-down-1',
            'archer-idle-down-2'
        ],
        paths: [
            'assets/units/archer/archer_down_0.png',
            'assets/units/archer/archer_down_1.png',
            'assets/units/archer/archer_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.mage]: {
        textures: [
            'mage-idle-down-0',
            'mage-idle-down-1',
            'mage-idle-down-2'
        ],
        paths: [
            'assets/units/mage/mage_down_0.png',
            'assets/units/mage/mage_down_1.png',
            'assets/units/mage/mage_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.paladin]: {
        textures: [
            'knight-idle-down-0',
            'knight-idle-down-1',
            'knight-idle-down-2'
        ],
        paths: [
            'assets/units/knight/knight_down_0.png',
            'assets/units/knight/knight_down_1.png',
            'assets/units/knight/knight_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.rogue]: {
        textures: [
            'rogue-idle-down-0',
            'rogue-idle-down-1',
            'rogue-idle-down-2'
        ],
        paths: [
            'assets/units/rogue/rogue_down_0.png',
            'assets/units/rogue/rogue_down_1.png',
            'assets/units/rogue/rogue_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.cleric]: {
        textures: [
            'cleric-idle-down-0',
            'cleric-idle-down-1',
            'cleric-idle-down-2'
        ],
        paths: [
            'assets/units/cleric/cleric_down_0.png',
            'assets/units/cleric/cleric_down_1.png',
            'assets/units/cleric/cleric_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.barbarian]: {
        textures: [
            'barbarian-idle-down-0',
            'barbarian-idle-down-1',
            'barbarian-idle-down-2'
        ],
        paths: [
            'assets/units/barbarian/barbarian_down_0.png',
            'assets/units/barbarian/barbarian_down_1.png',
            'assets/units/barbarian/barbarian_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.druid]: {
        textures: [
            'bard-idle-down-0',
            'bard-idle-down-1',
            'bard-idle-down-2'
        ],
        paths: [
            'assets/units/bard/bard_down_0.png',
            'assets/units/bard/bard_down_1.png',
            'assets/units/bard/bard_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    }
};

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type MainGamePrototype = {
    preload: (this: MainGame) => void;
    placeCharacter: (this: MainGame, character: CharacterType, x: number, y: number) => BoardPiece;
    playSummonAnimation: (this: MainGame, piece: BoardPiece) => void;
};

/**
 * Idle de unidades no tabuleiro.
 *
 * Os frames são carregados separadamente e o loop só é iniciado dentro de
 * placeCharacter(). Assim, os cards continuam estáticos e a animação aparece
 * apenas quando a unidade realmente entra no tabuleiro.
 */
const installBoardIdleAnimations = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalPlaceCharacter = prototype.placeCharacter;
    const originalPlaySummonAnimation = prototype.playSummonAnimation;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);

        Object.values(BOARD_IDLE_CONFIG).forEach((config) => {
            if (!config) {
                return;
            }

            config.textures.forEach((texture, index) => {
                this.load.image(texture, config.paths[index]);
            });
        });
    };

    prototype.placeCharacter = function (
        this: MainGame,
        character: CharacterType,
        x: number,
        y: number
    ): BoardPiece {
        const piece = originalPlaceCharacter.call(this, character, x, y);
        const idleConfig = BOARD_IDLE_CONFIG[character.id];

        if (!idleConfig) {
            return piece;
        }

        let frameIndex = 0;
        piece.sprite
            .setTexture(idleConfig.textures[frameIndex])
            .setScale(idleConfig.scale);

        const idleTimer = this.time.addEvent({
            delay: idleConfig.frameMs,
            loop: true,
            callback: () => {
                if (!piece.sprite.active) {
                    idleTimer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % idleConfig.textures.length;
                piece.sprite.setTexture(idleConfig.textures[frameIndex]);
            }
        });

        piece.sprite.once('destroy', () => idleTimer.remove(false));
        return piece;
    };

    // A animação de invocação original termina na escala padrão das unidades.
    // Para as unidades 16x16 com idle próprio, preservamos a escala configurada.
    prototype.playSummonAnimation = function (this: MainGame, piece: BoardPiece) {
        const idleConfig = BOARD_IDLE_CONFIG[piece.type];

        if (!idleConfig) {
            originalPlaySummonAnimation.call(this, piece);
            return;
        }

        piece.sprite
            .setVisible(true)
            .setAlpha(1)
            .setDepth(10)
            .setScale(0);

        this.tweens.add({
            targets: piece.sprite,
            scaleX: idleConfig.scale,
            scaleY: idleConfig.scale,
            duration: 180,
            onComplete: () => {
                piece.sprite
                    .setVisible(true)
                    .setAlpha(1)
                    .setDepth(10)
                    .setScale(idleConfig.scale);
            }
        });
    };
};

installBoardIdleAnimations();

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
