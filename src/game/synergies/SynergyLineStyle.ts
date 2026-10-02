import { Game as MainGame } from '../scenes/Game';
import { getAllFormedSynergies, type SynergyId } from './SynergyManager';
import type { BoardUnit } from '../board/BoardState';

type BoardPiece = {
    sprite: Phaser.GameObjects.Image;
};

type MainGameRuntime = {
    boardState: {
        getCells: () => ReadonlyMap<number, BoardUnit>;
    };
    pieceVisuals: Map<number, BoardPiece>;
};

type MainGamePrototype = {
    refreshSynergyIndicators: (this: MainGame) => void;
};

const SYNERGY_LINE_WIDTH = 6;
const SYNERGY_LINE_ALPHA = 0.78;
const SYNERGY_LINE_DEPTH = 8;

const extraSynergyLines = new WeakMap<MainGame, Phaser.GameObjects.Graphics[]>();

const getSynergyColor = (id: SynergyId): number => {
    switch (id) {
        case 'arcane-arrow':
            return 0x9d81ff;
        case 'natures-blessing':
            return 0x63d69b;
        case 'shadow-convergence':
            return 0xa855f7;
        case 'tactical-maneuver':
        default:
            return 0xf0b429;
    }
};

const clearExtraSynergyLines = (scene: MainGame) => {
    extraSynergyLines.get(scene)?.forEach((graphics) => graphics.destroy());
    extraSynergyLines.set(scene, []);
};

const drawExtraSynergyLines = (scene: MainGame) => {
    clearExtraSynergyLines(scene);

    const runtime = scene as unknown as MainGameRuntime;
    const lines: Phaser.GameObjects.Graphics[] = [];

    getAllFormedSynergies(runtime.boardState.getCells()).forEach((formedSynergy) => {
        const first = runtime.pieceVisuals.get(formedSynergy.pair[0]);
        const second = runtime.pieceVisuals.get(formedSynergy.pair[1]);

        if (!first?.sprite.active || !second?.sprite.active) {
            return;
        }

        const graphics = scene.add.graphics().setDepth(SYNERGY_LINE_DEPTH);
        graphics.lineStyle(
            SYNERGY_LINE_WIDTH,
            getSynergyColor(formedSynergy.definition.id),
            SYNERGY_LINE_ALPHA
        );
        graphics.lineBetween(
            first.sprite.x,
            first.sprite.y,
            second.sprite.x,
            second.sprite.y
        );
        lines.push(graphics);
    });

    extraSynergyLines.set(scene, lines);
};

export const installThickerSynergyLines = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalRefreshSynergyIndicators = prototype.refreshSynergyIndicators;

    prototype.refreshSynergyIndicators = function (this: MainGame) {
        originalRefreshSynergyIndicators.call(this);
        drawExtraSynergyLines(this);
    };
};
