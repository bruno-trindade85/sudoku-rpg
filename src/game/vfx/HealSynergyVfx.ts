import { Game as MainGame } from '../scenes/Game';
import { getAllFormedSynergies } from '../synergies/SynergyManager';
import type { BoardUnit } from '../board/BoardState';
import type { UnitType } from '../units/UnitConfig';

const HEAL_TEXTURES = [
    'heal-vfx-0',
    'heal-vfx-1',
    'heal-vfx-2',
    'heal-vfx-3'
] as const;

const HEAL_PATHS = [
    'assets/vfx/heal/heal_0.png',
    'assets/vfx/heal/heal_1.png',
    'assets/vfx/heal/heal_2.png',
    'assets/vfx/heal/heal_3.png'
] as const;

const HEAL_FRAME_MS = 140;
const HEAL_SIZE = 84;
const HEAL_Y_OFFSET = 0;
const HEAL_DEPTH = 9;

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type HealEffect = {
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

const healEffects = new WeakMap<MainGame, Map<number, HealEffect>>();
const attackedRegions = new WeakMap<MainGame, Set<string>>();

const getRegionKey = (regionRow: number, regionColumn: number) => `${regionRow}:${regionColumn}`;

const destroyHealEffect = (effect: HealEffect) => {
    effect.timer.remove(false);
    effect.sprite.destroy();
};

const clearHealEffects = (scene: MainGame) => {
    const effects = healEffects.get(scene);
    effects?.forEach(destroyHealEffect);
    healEffects.set(scene, new Map());
};

const syncNatureBlessingHealVfx = (scene: MainGame) => {
    const runtime = scene as unknown as MainGameRuntime;
    const effects = healEffects.get(scene) ?? new Map<number, HealEffect>();
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    const activeCells = new Map<number, string>();

    getAllFormedSynergies(runtime.boardState.getCells())
        .filter((formedSynergy) => formedSynergy.definition.id === 'natures-blessing')
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

        destroyHealEffect(effect);
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
                .setPosition(piece.sprite.x, piece.sprite.y + HEAL_Y_OFFSET)
                .setDisplaySize(HEAL_SIZE, HEAL_SIZE);
            return;
        }

        let frameIndex = 0;
        const sprite = scene.add.image(
            piece.sprite.x,
            piece.sprite.y + HEAL_Y_OFFSET,
            HEAL_TEXTURES[frameIndex]
        )
            .setDisplaySize(HEAL_SIZE, HEAL_SIZE)
            .setDepth(HEAL_DEPTH);

        const timer = scene.time.addEvent({
            delay: HEAL_FRAME_MS,
            loop: true,
            callback: () => {
                if (!sprite.active) {
                    timer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % HEAL_TEXTURES.length;
                sprite
                    .setTexture(HEAL_TEXTURES[frameIndex])
                    .setDisplaySize(HEAL_SIZE, HEAL_SIZE);
            }
        });

        effects.set(cellIndex, { sprite, timer, regionKey });
    });

    healEffects.set(scene, effects);
};

const stopHealEffectsInRegion = (scene: MainGame, regionRow: number, regionColumn: number) => {
    const regionKey = getRegionKey(regionRow, regionColumn);
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    blockedRegions.add(regionKey);
    attackedRegions.set(scene, blockedRegions);

    const effects = healEffects.get(scene);
    effects?.forEach((effect, cellIndex) => {
        if (effect.regionKey !== regionKey) {
            return;
        }

        destroyHealEffect(effect);
        effects.delete(cellIndex);
    });
};

export const installHealSynergyVfx = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalCreate = prototype.create;
    const originalRefreshSynergyIndicators = prototype.refreshSynergyIndicators;
    const originalHandleRegionAttack = prototype.handleRegionAttack;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);

        HEAL_TEXTURES.forEach((texture, index) => {
            this.load.image(texture, HEAL_PATHS[index]);
        });
    };

    prototype.create = function (this: MainGame) {
        clearHealEffects(this);
        attackedRegions.set(this, new Set());
        originalCreate.call(this);
    };

    prototype.refreshSynergyIndicators = function (this: MainGame) {
        originalRefreshSynergyIndicators.call(this);
        syncNatureBlessingHealVfx(this);
    };

    prototype.handleRegionAttack = function (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack = false
    ) {
        stopHealEffectsInRegion(this, regionRow, regionColumn);
        originalHandleRegionAttack.call(this, regionRow, regionColumn, isRepeatAttack);
    };
};
