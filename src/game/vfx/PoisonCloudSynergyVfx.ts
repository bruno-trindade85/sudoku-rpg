import { Game as MainGame } from '../scenes/Game';
import { getAllFormedSynergies } from '../synergies/SynergyManager';
import type { BoardUnit } from '../board/BoardState';
import type { UnitType } from '../units/UnitConfig';

const POISON_CLOUD_TEXTURES = [
    'poison-cloud-vfx-0',
    'poison-cloud-vfx-1',
    'poison-cloud-vfx-2',
    'poison-cloud-vfx-3'
] as const;

const POISON_CLOUD_PATHS = [
    'assets/vfx/poison_cloud/poison_cloud_0.png',
    'assets/vfx/poison_cloud/poison_cloud_1.png',
    'assets/vfx/poison_cloud/poison_cloud_2.png',
    'assets/vfx/poison_cloud/poison_cloud_3.png'
] as const;

const POISON_CLOUD_FRAME_MS = 140;
const POISON_CLOUD_SIZE = 84;
const POISON_CLOUD_Y_OFFSET = 0;
const POISON_CLOUD_DEPTH = 9;

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type PoisonCloudEffect = {
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

const poisonCloudEffects = new WeakMap<MainGame, Map<number, PoisonCloudEffect>>();
const attackedRegions = new WeakMap<MainGame, Set<string>>();

const getRegionKey = (regionRow: number, regionColumn: number) => `${regionRow}:${regionColumn}`;

const destroyPoisonCloudEffect = (effect: PoisonCloudEffect) => {
    effect.timer.remove(false);
    effect.sprite.destroy();
};

const clearPoisonCloudEffects = (scene: MainGame) => {
    const effects = poisonCloudEffects.get(scene);
    effects?.forEach(destroyPoisonCloudEffect);
    poisonCloudEffects.set(scene, new Map());
};

const syncShadowConvergencePoisonCloudVfx = (scene: MainGame) => {
    const runtime = scene as unknown as MainGameRuntime;
    const effects = poisonCloudEffects.get(scene) ?? new Map<number, PoisonCloudEffect>();
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    const activeCells = new Map<number, string>();

    getAllFormedSynergies(runtime.boardState.getCells())
        .filter((formedSynergy) => formedSynergy.definition.id === 'shadow-convergence')
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

        destroyPoisonCloudEffect(effect);
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
                .setPosition(piece.sprite.x, piece.sprite.y + POISON_CLOUD_Y_OFFSET)
                .setDisplaySize(POISON_CLOUD_SIZE, POISON_CLOUD_SIZE);
            return;
        }

        let frameIndex = 0;
        const sprite = scene.add.image(
            piece.sprite.x,
            piece.sprite.y + POISON_CLOUD_Y_OFFSET,
            POISON_CLOUD_TEXTURES[frameIndex]
        )
            .setDisplaySize(POISON_CLOUD_SIZE, POISON_CLOUD_SIZE)
            .setDepth(POISON_CLOUD_DEPTH);

        const timer = scene.time.addEvent({
            delay: POISON_CLOUD_FRAME_MS,
            loop: true,
            callback: () => {
                if (!sprite.active) {
                    timer.remove(false);
                    return;
                }

                frameIndex = (frameIndex + 1) % POISON_CLOUD_TEXTURES.length;
                sprite
                    .setTexture(POISON_CLOUD_TEXTURES[frameIndex])
                    .setDisplaySize(POISON_CLOUD_SIZE, POISON_CLOUD_SIZE);
            }
        });

        effects.set(cellIndex, { sprite, timer, regionKey });
    });

    poisonCloudEffects.set(scene, effects);
};

const stopPoisonCloudEffectsInRegion = (scene: MainGame, regionRow: number, regionColumn: number) => {
    const regionKey = getRegionKey(regionRow, regionColumn);
    const blockedRegions = attackedRegions.get(scene) ?? new Set<string>();
    blockedRegions.add(regionKey);
    attackedRegions.set(scene, blockedRegions);

    const effects = poisonCloudEffects.get(scene);
    effects?.forEach((effect, cellIndex) => {
        if (effect.regionKey !== regionKey) {
            return;
        }

        destroyPoisonCloudEffect(effect);
        effects.delete(cellIndex);
    });
};

export const installPoisonCloudSynergyVfx = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalCreate = prototype.create;
    const originalRefreshSynergyIndicators = prototype.refreshSynergyIndicators;
    const originalHandleRegionAttack = prototype.handleRegionAttack;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);

        POISON_CLOUD_TEXTURES.forEach((texture, index) => {
            this.load.image(texture, POISON_CLOUD_PATHS[index]);
        });
    };

    prototype.create = function (this: MainGame) {
        clearPoisonCloudEffects(this);
        attackedRegions.set(this, new Set());
        originalCreate.call(this);
    };

    prototype.refreshSynergyIndicators = function (this: MainGame) {
        originalRefreshSynergyIndicators.call(this);
        syncShadowConvergencePoisonCloudVfx(this);
    };

    prototype.handleRegionAttack = function (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack = false
    ) {
        stopPoisonCloudEffectsInRegion(this, regionRow, regionColumn);
        originalHandleRegionAttack.call(this, regionRow, regionColumn, isRepeatAttack);
    };
};
