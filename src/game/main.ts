import { Game as MainGame } from './scenes/Game';
import { AUTO, Game, Scale, Types } from 'phaser';
import { UNIT_IDS, type CharacterType, type UnitType } from './units/UnitConfig';
import { getAllFormedSynergies } from './synergies/SynergyManager';
import type { BoardUnit } from './board/BoardState';

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
    },
    [UNIT_IDS.darkSorcerer]: {
        textures: [
            'necromancer-idle-down-0',
            'necromancer-idle-down-1',
            'necromancer-idle-down-2'
        ],
        paths: [
            'assets/units/necromancer/necromancer_down_0.png',
            'assets/units/necromancer/necromancer_down_1.png',
            'assets/units/necromancer/necromancer_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    },
    [UNIT_IDS.summoner]: {
        textures: [
            'villager-idle-down-0',
            'villager-idle-down-1',
            'villager-idle-down-2'
        ],
        paths: [
            'assets/units/villager/villager_down_0.png',
            'assets/units/villager/villager_down_1.png',
            'assets/units/villager/villager_down_2.png'
        ],
        frameMs: 180,
        scale: 4
    }
};

const ORIGINAL_CARD_WIDTH = 140;
const ORIGINAL_CARD_HEIGHT = 90;
const ENLARGED_CARD_WIDTH = 148;
const ENLARGED_CARD_HEIGHT = 96;
const ENLARGED_CARD_SPRITE_SCALE = 2.15;

const MAGIC_CIRCLE_TEXTURES = [
    'magic-circle-0',
    'magic-circle-1',
    'magic-circle-2',
    'magic-circle-3'
] as const;
const MAGIC_CIRCLE_PATHS = [
    'assets/vfx/magic_circle/magic_circle_0.png',
    'assets/vfx/magic_circle/magic_circle_1.png',
    'assets/vfx/magic_circle/magic_circle_2.png',
    'assets/vfx/magic_circle/magic_circle_3.png'
] as const;
const MAGIC_CIRCLE_FRAME_MS = 140;
const MAGIC_CIRCLE_SIZE = 84;
const MAGIC_CIRCLE_Y_OFFSET = 4;
const MAGIC_CIRCLE_DEPTH = 9;

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type MagicCircleEffect = {
    sprite: Phaser.GameObjects.Image;
    timer: Phaser.Time.TimerEvent;
    regionKey: string;
};

type MainGameRuntime = {
    boardState: {
        getCells: () => ReadonlyMap<number, BoardUnit>;
    };
    pieceVisuals: Map<number, BoardPiece>;
};

type MainGamePrototype = {
    preload: (this: MainGame) => void;
    create: (this: MainGame) => void;
    placeCharacter: (this: MainGame, character: CharacterType, x: number, y: number) => BoardPiece;
    playSummonAnimation: (this: MainGame, piece: BoardPiece) => void;
    refreshSynergyIndicators: (this: MainGame) => void;
    handleRegionAttack: (this: MainGame, regionRow: number, regionColumn: number, isRepeatAttack?: boolean) => void;
};

const magicCircleEffects = new WeakMap<MainGame, Map<number, MagicCircleEffect>>();
const attackedRegions = new WeakMap<MainGame, Set<string>>();

const getRegionKey = (regionRow: number, regionColumn: number) => `${regionRow}:${regionColumn}`;

const destroyMagicCircleEffect = (effect: MagicCircleEffect) => {
    effect.timer.remove(false);
    effect.sprite.destroy();
};

const clearMagicCircleEffects = (scene: MainGame) => {
    const effects = magicCircleEffects.get(scene);
    effects?.forEach(destroyMagicCircleEffect);
    magicCircleEffects.set(scene, new Map());
};

const syncArcaneArrowMagicCircles = (scene: MainGame) => {
    const runtime = scene as unknown as MainGameRuntime;
    const effects = magicCircleEffects.get(scene) ?? new Map<number, MagicCircleEffect>();
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    const activeCells = new Map<number, string>();

    getAllFormedSynergies(runtime.boardState.getCells())
        .filter((formedSynergy) => formedSynergy.definition.id === 'arcane-arrow')
        .forEach((formedSynergy) => {
            const regionKey = getRegionKey(formedSynergy.regionRow, formedSynergy.regionColumn);
            if (blockedRegions.has(regionKey)) {
                return;
            }

            formedSynergy.pair.forEach((cellIndex) => activeCells.set(cellIndex, regionKey));
        });

    effects.forEach((effect, cellIndex) => {
        if (activeCells.has(cellIndex)) {
            return;
        }

        destroyMagicCircleEffect(effect);
        effects.delete(cellIndex);
    });

    activeCells.forEach((regionKey, cellIndex) => {
        const piece = runtime.pieceVisuals.get(cellIndex);
        if (!piece?.sprite.active) {
            return;
        }

        const existing = effects.get(cellIndex);
        if (existing) {
            existing.regionKey = regionKey;
            existing.sprite
                .setPosition(piece.sprite.x, piece.sprite.y + MAGIC_CIRCLE_Y_OFFSET)
                .setDisplaySize(MAGIC_CIRCLE_SIZE, MAGIC_CIRCLE_SIZE);
            return;
        }

        let frameIndex = 0;
        const sprite = scene.add.image(
            piece.sprite.x,
            piece.sprite.y + MAGIC_CIRCLE_Y_OFFSET,
            MAGIC_CIRCLE_TEXTURES[frameIndex]
        )
            .setDisplaySize(MAGIC_CIRCLE_SIZE, MAGIC_CIRCLE_SIZE)
            .setDepth(MAGIC_CIRCLE_DEPTH);

        const timer = scene.time.addEvent({
            delay: MAGIC_CIRCLE_FRAME_MS,
            loop: true,
            callback: () => {
                if (!sprite.active) {
                    timer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % MAGIC_CIRCLE_TEXTURES.length;
                sprite
                    .setTexture(MAGIC_CIRCLE_TEXTURES[frameIndex])
                    .setDisplaySize(MAGIC_CIRCLE_SIZE, MAGIC_CIRCLE_SIZE);
            }
        });

        effects.set(cellIndex, { sprite, timer, regionKey });
    });

    magicCircleEffects.set(scene, effects);
};

const stopMagicCirclesInRegion = (scene: MainGame, regionRow: number, regionColumn: number) => {
    const regionKey = getRegionKey(regionRow, regionColumn);
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    blockedRegions.add(regionKey);
    attackedRegions.set(scene, blockedRegions);

    const effects = magicCircleEffects.get(scene);
    effects?.forEach((effect, cellIndex) => {
        if (effect.regionKey !== regionKey) {
            return;
        }

        destroyMagicCircleEffect(effect);
        effects.delete(cellIndex);
    });
};

/**
 * Idle de unidades no tabuleiro e VFX da sinergia Flecha Arcana.
 */
const installBoardIdleAnimations = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalCreate = prototype.create;
    const originalPlaceCharacter = prototype.placeCharacter;
    const originalPlaySummonAnimation = prototype.playSummonAnimation;
    const originalRefreshSynergyIndicators = prototype.refreshSynergyIndicators;
    const originalHandleRegionAttack = prototype.handleRegionAttack;

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

        MAGIC_CIRCLE_TEXTURES.forEach((texture, index) => {
            this.load.image(texture, MAGIC_CIRCLE_PATHS[index]);
        });
    };

    prototype.create = function (this: MainGame) {
        clearMagicCircleEffects(this);
        attackedRegions.set(this, new Set());

        originalCreate.call(this);

        this.children.list.forEach((child) => {
            if (child.type !== 'Container' || child.width !== ORIGINAL_CARD_WIDTH || child.height !== ORIGINAL_CARD_HEIGHT) {
                return;
            }

            const card = child as Phaser.GameObjects.Container;
            const background = card.list[0] as Phaser.GameObjects.Rectangle | undefined;
            const unitSprite = card.list[1] as Phaser.GameObjects.Image | undefined;
            const name = card.list[2] as Phaser.GameObjects.Text | undefined;

            card.setSize(ENLARGED_CARD_WIDTH, ENLARGED_CARD_HEIGHT);
            background?.setSize(ENLARGED_CARD_WIDTH, ENLARGED_CARD_HEIGHT).setDisplaySize(ENLARGED_CARD_WIDTH, ENLARGED_CARD_HEIGHT);
            unitSprite?.setScale(ENLARGED_CARD_SPRITE_SCALE);
            name?.setY(31);
        });
    };

    prototype.refreshSynergyIndicators = function (this: MainGame) {
        originalRefreshSynergyIndicators.call(this);
        syncArcaneArrowMagicCircles(this);
    };

    prototype.handleRegionAttack = function (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack = false
    ) {
        stopMagicCirclesInRegion(this, regionRow, regionColumn);
        originalHandleRegionAttack.call(this, regionRow, regionColumn, isRepeatAttack);
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