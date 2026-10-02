import { Game as MainGame } from '../scenes/Game';
import { getAllFormedSynergies } from '../synergies/SynergyManager';
import type { BoardUnit } from '../board/BoardState';
import type { UnitType } from '../units/UnitConfig';

const SLASH_TEXTURES = [
    'slash-vfx-0',
    'slash-vfx-1',
    'slash-vfx-2',
    'slash-vfx-3'
] as const;

const SLASH_PATHS = [
    'assets/vfx/slash/slash_0.png',
    'assets/vfx/slash/slash_1.png',
    'assets/vfx/slash/slash_2.png',
    'assets/vfx/slash/slash_3.png'
] as const;

const SLASH_FRAME_MS = 120;
const SLASH_SIZE = 84;
const SLASH_Y_OFFSET = 0;
const SLASH_DEPTH = 11;

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type SlashEffect = {
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
    refreshSynergyIndicators: (this: MainGame) => void;
    handleRegionAttack: (this: MainGame, regionRow: number, regionColumn: number, isRepeatAttack?: boolean) => void;
};

const slashEffects = new WeakMap<MainGame, Map<number, SlashEffect>>();
const attackedRegions = new WeakMap<MainGame, Set<string>>();

const getRegionKey = (regionRow: number, regionColumn: number) => `${regionRow}:${regionColumn}`;

const destroySlashEffect = (effect: SlashEffect) => {
    effect.timer.remove(false);
    effect.sprite.destroy();
};

const clearSlashEffects = (scene: MainGame) => {
    const effects = slashEffects.get(scene);
    effects?.forEach(destroySlashEffect);
    slashEffects.set(scene, new Map());
};

const syncTacticalManeuverSlashVfx = (scene: MainGame) => {
    const runtime = scene as unknown as MainGameRuntime;
    const effects = slashEffects.get(scene) ?? new Map<number, SlashEffect>();
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    const activeCells = new Map<number, string>();

    getAllFormedSynergies(runtime.boardState.getCells())
        .filter((formedSynergy) => formedSynergy.definition.id === 'tactical-maneuver')
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

        destroySlashEffect(effect);
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
                .setPosition(piece.sprite.x, piece.sprite.y + SLASH_Y_OFFSET)
                .setDisplaySize(SLASH_SIZE, SLASH_SIZE);
            return;
        }

        let frameIndex = 0;
        const sprite = scene.add.image(
            piece.sprite.x,
            piece.sprite.y + SLASH_Y_OFFSET,
            SLASH_TEXTURES[frameIndex]
        )
            .setDisplaySize(SLASH_SIZE, SLASH_SIZE)
            .setDepth(SLASH_DEPTH);

        const timer = scene.time.addEvent({
            delay: SLASH_FRAME_MS,
            loop: true,
            callback: () => {
                if (!sprite.active) {
                    timer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % SLASH_TEXTURES.length;
                sprite
                    .setTexture(SLASH_TEXTURES[frameIndex])
                    .setDisplaySize(SLASH_SIZE, SLASH_SIZE);
            }
        });

        effects.set(cellIndex, { sprite, timer, regionKey });
    });

    slashEffects.set(scene, effects);
};

const stopSlashEffectsInRegion = (scene: MainGame, regionRow: number, regionColumn: number) => {
    const regionKey = getRegionKey(regionRow, regionColumn);
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    blockedRegions.add(regionKey);
    attackedRegions.set(scene, blockedRegions);

    const effects = slashEffects.get(scene);
    effects?.forEach((effect, cellIndex) => {
        if (effect.regionKey !== regionKey) {
            return;
        }

        destroySlashEffect(effect);
        effects.delete(cellIndex);
    });
};

export const installSlashSynergyVfx = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalCreate = prototype.create;
    const originalRefreshSynergyIndicators = prototype.refreshSynergyIndicators;
    const originalHandleRegionAttack = prototype.handleRegionAttack;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);

        SLASH_TEXTURES.forEach((texture, index) => {
            this.load.image(texture, SLASH_PATHS[index]);
        });
    };

    prototype.create = function (this: MainGame) {
        clearSlashEffects(this);
        attackedRegions.set(this, new Set());
        originalCreate.call(this);
    };

    prototype.refreshSynergyIndicators = function (this: MainGame) {
        originalRefreshSynergyIndicators.call(this);
        syncTacticalManeuverSlashVfx(this);
    };

    prototype.handleRegionAttack = function (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack = false
    ) {
        stopSlashEffectsInRegion(this, regionRow, regionColumn);
        originalHandleRegionAttack.call(this, regionRow, regionColumn, isRepeatAttack);
    };
};
