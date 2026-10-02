import { Game as MainGame } from '../scenes/Game';
import { UNIT_IDS, type UnitType } from '../units/UnitConfig';
import type { BoardUnit } from '../board/BoardState';

const GRID_SIZE = 9;
const REGION_SIZE = 3;

const IDLE_FRAME_ZERO_TEXTURE: Readonly<Record<UnitType, string>> = {
    [UNIT_IDS.mage]: 'mage-idle-down-0',
    [UNIT_IDS.archer]: 'archer-idle-down-0',
    [UNIT_IDS.paladin]: 'knight-idle-down-0',
    [UNIT_IDS.rogue]: 'rogue-idle-down-0',
    [UNIT_IDS.cleric]: 'cleric-idle-down-0',
    [UNIT_IDS.barbarian]: 'barbarian-idle-down-0',
    [UNIT_IDS.druid]: 'bard-idle-down-0',
    [UNIT_IDS.darkSorcerer]: 'necromancer-idle-down-0',
    [UNIT_IDS.summoner]: 'villager-idle-down-0'
};

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type MainGameRuntime = {
    boardState: {
        getCells: () => ReadonlyMap<number, BoardUnit>;
    };
    pieceVisuals: Map<number, BoardPiece>;
};

type MainGamePrototype = {
    handleRegionAttack: (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack?: boolean
    ) => void;
};

const frozenSprites = new WeakSet<Phaser.GameObjects.Image>();

const freezePieceOnFrameZero = (piece: BoardPiece) => {
    if (!piece.sprite.active || frozenSprites.has(piece.sprite)) {
        return;
    }

    const frameZeroTexture = IDLE_FRAME_ZERO_TEXTURE[piece.type];
    const originalSetTexture = piece.sprite.setTexture.bind(piece.sprite);

    originalSetTexture(frameZeroTexture);

    // O timer de idle continua existindo, mas depois do ataque não pode mais
    // trocar a textura deste herói. Assim ele permanece visualmente no frame 0.
    piece.sprite.setTexture = ((key: any, frame?: any) => {
        if (key === frameZeroTexture) {
            return originalSetTexture(key, frame);
        }

        return piece.sprite;
    }) as typeof piece.sprite.setTexture;

    frozenSprites.add(piece.sprite);
};

const freezeHeroesInRegion = (scene: MainGame, regionRow: number, regionColumn: number) => {
    const runtime = scene as unknown as MainGameRuntime;
    const firstRow = regionRow * REGION_SIZE;
    const firstColumn = regionColumn * REGION_SIZE;

    for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
        for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
            const cellIndex = row * GRID_SIZE + column;
            const unit = runtime.boardState.getCells().get(cellIndex);
            const piece = runtime.pieceVisuals.get(cellIndex);

            if (!unit || !piece) {
                continue;
            }

            freezePieceOnFrameZero(piece);
        }
    }
};

export const installFreezeAttackedRegionHeroes = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalHandleRegionAttack = prototype.handleRegionAttack;

    prototype.handleRegionAttack = function (
        this: MainGame,
        regionRow: number,
        regionColumn: number,
        isRepeatAttack = false
    ) {
        freezeHeroesInRegion(this, regionRow, regionColumn);
        originalHandleRegionAttack.call(this, regionRow, regionColumn, isRepeatAttack);
    };
};
