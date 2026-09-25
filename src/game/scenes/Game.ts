import { Scene } from 'phaser';
import { CHARACTER_TYPES, UNIT_SPRITE_FLIP_X, UNIT_TEXTURES, type CharacterType } from '../units/UnitConfig';
import { BoardState, GRID_SIZE, REGION_SIZE } from '../board/BoardState';
import {
    canMoveOrSwap,
    canPlace,
    getRegionIndex,
    isRegionComplete
} from '../board/BoardValidator';
import {
    getAllFormedSynergies,
    getFormedSynergiesInRegion,
    type FormedSynergy,
    type SynergyDefinition
} from '../synergies/SynergyManager';
import { PlayerState } from '../player/PlayerState';
import { CombatManager } from '../combat/CombatManager';
import { GameUI, type CombatHistoryEvent } from '../ui/GameUI';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const CELL_SIZE = 92;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
const BOARD_X = (GAME_WIDTH - BOARD_SIZE) / 2;
const BOARD_Y = (GAME_HEIGHT - BOARD_SIZE) / 2 - 45;
const BACKGROUND_TEXTURE_KEY = 'dungeon-background';
const UNIT_CARD_WIDTH = 140;
const UNIT_CARD_HEIGHT = 90;
const UNIT_CARD_GAP = 16;
const UNIT_CARD_BOTTOM_MARGIN = 18;
const UNIT_SPRITE_SCALE = 2;
type PlacedCharacter = {
    type: string;
    sprite: Phaser.GameObjects.Image;
};

type CharacterCardVisual = {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Rectangle;
};

const COLORS = {
    board: 0xf6f1e7,
    cellLine: 0x35332f,
    regionLine: 0x121110,
    hover: 0xf0b429,
    selection: 0x4c8dff,
    invalid: 0xe05252,
    completedRegion: 0x63d69b,
    attackedRegionOverlay: 0x6b7280,
    unitArea: 0x242833,
    unitCard: 0x3a4050,
    unitCardSelected: 0x5b4ec7,
    unitText: 0xffffff
};

export class Game extends Scene {
    private readonly boardState = new BoardState();
    private readonly playerState = new PlayerState();
    private readonly combatManager = new CombatManager();
    private readonly pieceVisuals = new Map<number, PlacedCharacter>();
    private gameUI!: GameUI;
    private combatHistory: CombatHistoryEvent[] = [];
    private isRepositionMode = false;
    private repositionSourceCell?: number;
    private boardX = 0;
    private boardY = 0;
    private dragHighlight?: Phaser.GameObjects.Rectangle;
    private cardDragText?: Phaser.GameObjects.Text;
    private invalidHighlight?: Phaser.GameObjects.Rectangle;
    private invalidHighlightVersion = 0;
    private draggedPiece?: { piece: PlacedCharacter; sourceCell: number };
    private synergyConnectionGraphics: Phaser.GameObjects.Graphics[] = [];
    private cardHoldTimer?: Phaser.Time.TimerEvent;
    private highlightedCharacterType?: string;

    constructor() {
        super('Game');
    }

    preload() {
        this.load.image(BACKGROUND_TEXTURE_KEY, 'assets/backgrounds/dungeon-01.png');
        CHARACTER_TYPES.forEach((character) => {
            this.load.image(UNIT_TEXTURES[character.id], `assets/units/${UNIT_TEXTURES[character.id]}.png`);
        });
        this.load.image('dragon', 'assets/enemies/dragon.png');
    }

    create() {
        const boardX = BOARD_X;
        const boardY = BOARD_Y;
        this.boardX = boardX;
        this.boardY = boardY;
        this.createDungeonBackground();
        const graphics = this.add.graphics();
        const hoverHighlight = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6, COLORS.hover, 0.2)
            .setVisible(false);
        const selectionHighlight = this.add.rectangle(0, 0, CELL_SIZE - 8, CELL_SIZE - 8, COLORS.selection, 0.35)
            .setVisible(false);
        const invalidHighlight = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6, COLORS.invalid, 0.45)
            .setVisible(false);
        this.invalidHighlight = invalidHighlight;
        this.dragHighlight = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6, 0x63d69b, 0.3)
            .setVisible(false);
        let selectedCell = -1;
        let selectedCharacter: CharacterType | undefined;
        const characterCards = new Map<string, CharacterCardVisual>();
        const showInvalidCell = (x: number, y: number) => {
            this.showInvalidCell(x, y);
        };

        // A cena pode ser reiniciada; por isso o estado da partida é zerado antes
        // de recriar os elementos visuais e os eventos.
        this.pieceVisuals.clear();
        this.boardState.reset();
        this.playerState.reset();
        this.combatManager.reset();
        this.combatHistory = [];
        this.isRepositionMode = false;
        this.repositionSourceCell = undefined;
        this.events.off('region-completed', this.handleRegionAttack, this);
        this.events.on('region-completed', this.handleRegionAttack, this);

        this.gameUI = new GameUI(this);
        this.gameUI.createHud(boardX, boardY, BOARD_SIZE, () => this.handleRepositionRequest());
        this.updateBossInterface();
        this.updateHeroInterface();
        this.updateFuryInterface();
        this.updateRepositionInterface();
        this.gameUI.updateCombatHistory(this.combatHistory);
        this.refreshSynergyIndicators();

        graphics.fillStyle(COLORS.board, 0.13);
        graphics.fillRect(boardX, boardY, BOARD_SIZE, BOARD_SIZE);

        // Linhas mais grossas marcam os limites das nove regiões 3x3.
        for (let index = 0; index <= GRID_SIZE; index++) {
            const isRegionBoundary = index % REGION_SIZE === 0;
            const lineWidth = isRegionBoundary ? 5 : 2;
            const lineColor = isRegionBoundary ? COLORS.regionLine : COLORS.cellLine;
            const offset = index * CELL_SIZE;

            graphics.lineStyle(lineWidth, lineColor, isRegionBoundary ? 0.9 : 0.58);
            graphics.lineBetween(boardX + offset, boardY, boardX + offset, boardY + BOARD_SIZE);
            graphics.lineBetween(boardX, boardY + offset, boardX + BOARD_SIZE, boardY + offset);
        }

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let column = 0; column < GRID_SIZE; column++) {
                const cellIndex = row * GRID_SIZE + column;
                const cellX = boardX + column * CELL_SIZE + CELL_SIZE / 2;
                const cellY = boardY + row * CELL_SIZE + CELL_SIZE / 2;
                const cell = this.add.zone(cellX, cellY, CELL_SIZE, CELL_SIZE).setInteractive({ useHandCursor: true });

                cell.on('pointerover', () => {
                    if (cellIndex !== selectedCell) {
                        hoverHighlight.setPosition(cellX, cellY).setVisible(true);
                    }
                });

                cell.on('pointerout', () => hoverHighlight.setVisible(false));

                cell.on('pointerdown', () => {
                    if (this.playerState.isDefeated()) {
                        return;
                    }

                    selectedCell = cellIndex;
                    hoverHighlight.setVisible(false);
                    selectionHighlight.setPosition(cellX, cellY).setVisible(true);

                    if (this.isRepositionMode) {
                        const characterAtCell = this.boardState.getCell(cellIndex);

                        if (this.repositionSourceCell === undefined) {
                            if (characterAtCell) {
                                this.repositionSourceCell = cellIndex;
                            } else {
                                showInvalidCell(cellX, cellY);
                            }
                            return;
                        }

                        const sourceCell = this.repositionSourceCell;
                        const characterToMove = this.boardState.getCell(sourceCell);
                        if (characterToMove && this.tryReposition(sourceCell, cellIndex, row, column, cellX, cellY)) {
                            this.isRepositionMode = false;
                            this.repositionSourceCell = undefined;
                            this.updateRepositionInterface();
                        } else {
                            showInvalidCell(cellX, cellY);
                        }
                        return;
                    }

                    if (selectedCharacter) {
                        if (this.tryPlaceCharacter(selectedCharacter, cellIndex, row, column, cellX, cellY)) {
                        } else {
                            showInvalidCell(cellX, cellY);
                        }
                    }
                });
            }
        }

        const cardsRowWidth = CHARACTER_TYPES.length * UNIT_CARD_WIDTH + (CHARACTER_TYPES.length - 1) * UNIT_CARD_GAP;
        const cardsRowY = this.scale.height - UNIT_CARD_HEIGHT / 2 - UNIT_CARD_BOTTOM_MARGIN;
        const cardStartX = (this.scale.width - cardsRowWidth) / 2 + UNIT_CARD_WIDTH / 2;
        const titleY = cardsRowY - UNIT_CARD_HEIGHT / 2 - 10;

        this.add.rectangle(this.scale.width / 2, cardsRowY, cardsRowWidth + 32, UNIT_CARD_HEIGHT + 10, COLORS.unitArea, 0.72);
        this.add.text(this.scale.width / 2, titleY, 'Unidades', {
            fontFamily: 'Arial',
            fontSize: 17,
            color: '#ffffff'
        }).setOrigin(0.5);

        CHARACTER_TYPES.forEach((character, index) => {
            const cardX = cardStartX + index * (UNIT_CARD_WIDTH + UNIT_CARD_GAP);
            const cardY = cardsRowY;
            const cardBackground = this.add.rectangle(0, 0, UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT, COLORS.unitCard, 0.92)
                .setStrokeStyle(2, character.color, 0.85);
            const unitSprite = this.add.image(0, -12, UNIT_TEXTURES[character.id])
                .setScale(UNIT_SPRITE_SCALE)
                .setFlipX(UNIT_SPRITE_FLIP_X[character.id]);
            const name = this.add.text(0, 29, character.name.toUpperCase(), {
                fontFamily: 'Arial Black',
                fontSize: character.name.length > 12 ? 10 : 12,
                color: '#ffffff'
            }).setOrigin(0.5);
            const card = this.add.container(cardX, cardY, [cardBackground, unitSprite, name])
                .setSize(UNIT_CARD_WIDTH, UNIT_CARD_HEIGHT)
                .setInteractive({ useHandCursor: true });
            this.input.setDraggable(card);

            characterCards.set(character.id, { container: card, background: cardBackground });

            card.on('pointerdown', () => {
                if (this.playerState.isDefeated()) {
                    return;
                }

                selectedCharacter = character;
                updateCharacterCardSelection();

                this.stopCharacterPositionHighlight();
                this.cardHoldTimer?.remove(false);
                this.cardHoldTimer = this.time.delayedCall(1000, () => {
                    this.startCharacterPositionHighlight(character.id);
                });
            });
            card.on('pointerup', () => {
                this.cancelCardHoldHighlight();
            });
            card.on('pointerover', () => {
                if (this.playerState.isDefeated()) {
                    return;
                }

                this.tweens.killTweensOf(card);
                this.tweens.add({ targets: card, y: cardY - 8, scaleX: 1.03, scaleY: 1.03, duration: 140, ease: 'Sine.Out' });
            });
            card.on('pointerout', () => {
                this.cancelCardHoldHighlight();
                this.tweens.killTweensOf(card);
                this.tweens.add({ targets: card, y: cardY, scaleX: 1, scaleY: 1, duration: 140, ease: 'Sine.Out' });
            });
            card.on('dragstart', () => {
                this.cancelCardHoldHighlight();
                if (!this.playerState.isDefeated()) {
                    this.tweens.killTweensOf(card);
                    card.setScale(1);
                    card.setAlpha(0.55);
                }
                this.startCardDrag(character, cardX, cardY);
            });
            card.on('drag', (pointer: Phaser.Input.Pointer) => {
                if (this.playerState.isDefeated()) {
                    return;
                }

                card.setPosition(pointer.worldX, pointer.worldY);
                this.cardDragText?.setPosition(pointer.worldX, pointer.worldY);
                this.updateCardDragShadow(pointer.worldX, pointer.worldY);
            });
            card.on('dragend', (pointer: Phaser.Input.Pointer) => {
                card.setPosition(cardX, cardY);
                card.setScale(1);
                card.setAlpha(1);
                this.finishCardDrag(character, pointer.worldX, pointer.worldY);
            });
        });

        const updateCharacterCardSelection = () => {
            for (const [characterId, card] of characterCards) {
                const isSelected = characterId === selectedCharacter?.id;
                card.background.setFillStyle(isSelected ? COLORS.unitCardSelected : COLORS.unitCard);
                const characterColor = CHARACTER_TYPES.find((character) => character.id === characterId)?.color ?? COLORS.unitCard;
                card.background.setStrokeStyle(isSelected ? 3 : 2, characterColor, isSelected ? 1 : 0.85);
            }
        };
    }

    private createDungeonBackground() {
        const background = this.add.image(this.scale.width / 2, this.scale.height / 2, BACKGROUND_TEXTURE_KEY)
            .setDepth(-100);
        const source = background.texture.getSourceImage() as HTMLImageElement;
        const scale = Math.max(this.scale.width / source.width, this.scale.height / source.height);

        background.setScale(scale);
    }

    private tryPlaceCharacter(character: CharacterType, cellIndex: number, row: number, column: number, x: number, y: number): boolean {
        if (this.playerState.isDefeated() || !canPlace(this.boardState.getCells(), character.id, row, column)) {
            return false;
        }

        this.boardState.setCell(cellIndex, { type: character.id });
        const placedCharacter = this.placeCharacter(character, x, y);
        this.pieceVisuals.set(cellIndex, placedCharacter);
        this.updateRegionState(row, column, this.boardX, this.boardY);
        this.refreshSynergyIndicators();
        this.playSummonAnimation(placedCharacter);
        this.increaseDragonFury();
        return true;
    }

    private tryReposition(sourceCell: number, targetCell: number, targetRow: number, targetColumn: number, targetX: number, targetY: number): boolean {
        const movingCharacter = this.pieceVisuals.get(sourceCell);
        const targetCharacter = this.pieceVisuals.get(targetCell);

        if (this.playerState.isDefeated() || !movingCharacter || sourceCell === targetCell || !this.playerState.hasRepositionCredit()) {
            return false;
        }
        const targetRowAtSource = Math.floor(sourceCell / GRID_SIZE);
        const targetColumnAtSource = sourceCell % GRID_SIZE;

        if (!this.canAttemptReposition(sourceCell, targetCell)) {
            return false;
        }

        // A jogada já foi validada; primeiro altera o estado lógico e depois os visuais.
        this.boardState.moveOrSwap(sourceCell, targetCell);
        this.pieceVisuals.set(targetCell, movingCharacter);

        if (targetCharacter) {
            this.pieceVisuals.set(sourceCell, targetCharacter);
            this.movePieceVisual(targetCharacter, this.getCellCenter(targetRowAtSource, targetColumnAtSource));
        } else {
            this.pieceVisuals.delete(sourceCell);
        }

        this.movePieceVisual(movingCharacter, { x: targetX, y: targetY });
        this.playerState.consumeRepositionCredit();
        this.updateRepositionInterface();
        this.recordCombatEvent({ type: 'reposition' });
        this.updateRegionState(targetRowAtSource, targetColumnAtSource, this.boardX, this.boardY);
        this.updateRegionState(targetRow, targetColumn, this.boardX, this.boardY);
        this.refreshSynergyIndicators();
        this.playPlacementAnimation(movingCharacter);

        return true;
    }

    private placeCharacter(character: CharacterType, x: number, y: number): PlacedCharacter {
        const sprite = this.add.image(x, y, UNIT_TEXTURES[character.id])
            .setScale(UNIT_SPRITE_SCALE)
            .setFlipX(UNIT_SPRITE_FLIP_X[character.id])
            // Mantém as unidades acima do tabuleiro e dos realces de chão.
            .setDepth(10)
            .setInteractive({ useHandCursor: true });
        const placedCharacter = { type: character.id, sprite };

        this.input.setDraggable(sprite);
        sprite.on('pointerdown', () => {
            if (this.isRepositionMode) {
                this.repositionSourceCell = this.findPieceCell(placedCharacter);
            }
        });
        sprite.on('dragstart', () => this.startPieceDrag(placedCharacter));
        sprite.on('drag', (pointer: Phaser.Input.Pointer) => this.updatePieceDrag(placedCharacter, pointer.worldX, pointer.worldY));
        sprite.on('dragend', (pointer: Phaser.Input.Pointer) => this.finishPieceDrag(placedCharacter, pointer.worldX, pointer.worldY));

        return placedCharacter;
    }

    private getCellCenter(row: number, column: number) {
        return {
            x: this.boardX + column * CELL_SIZE + CELL_SIZE / 2,
            y: this.boardY + row * CELL_SIZE + CELL_SIZE / 2
        };
    }

    private getCellAtPosition(x: number, y: number) {
        const column = Math.floor((x - this.boardX) / CELL_SIZE);
        const row = Math.floor((y - this.boardY) / CELL_SIZE);

        if (row < 0 || row >= GRID_SIZE || column < 0 || column >= GRID_SIZE) {
            return undefined;
        }

        return { row, column, cellIndex: row * GRID_SIZE + column, ...this.getCellCenter(row, column) };
    }

    private movePieceVisual(piece: PlacedCharacter, position: { x: number; y: number }) {
        piece.sprite.setPosition(position.x, position.y);
    }

    private playPlacementAnimation(piece: PlacedCharacter) {
        this.tweens.add({
            targets: piece.sprite,
            scaleX: UNIT_SPRITE_SCALE * 1.12,
            scaleY: UNIT_SPRITE_SCALE * 1.12,
            duration: 100,
            yoyo: true
        });
    }

    private playSummonAnimation(piece: PlacedCharacter) {
        piece.sprite.setScale(0).setAlpha(0);
        this.tweens.add({
            targets: piece.sprite,
            scaleX: UNIT_SPRITE_SCALE,
            scaleY: UNIT_SPRITE_SCALE,
            alpha: 1,
            duration: 180
        });
    }

    private showInvalidCell(x: number, y: number) {
        // A versão evita que o timer de um aviso antigo esconda um aviso mais recente.
        const feedbackVersion = ++this.invalidHighlightVersion;
        this.invalidHighlight?.setPosition(x, y).setVisible(true);
        this.time.delayedCall(350, () => {
            if (feedbackVersion === this.invalidHighlightVersion) {
                this.invalidHighlight?.setVisible(false);
            }
        });
    }

    private startCharacterPositionHighlight(characterType: string) {
        this.highlightedCharacterType = characterType;

        for (const placedCharacter of this.pieceVisuals.values()) {
            if (placedCharacter.type !== characterType) {
                continue;
            }

            this.tweens.killTweensOf(placedCharacter.sprite);
            placedCharacter.sprite.setAlpha(1);
            this.tweens.add({
                targets: placedCharacter.sprite,
                alpha: 0.25,
                duration: 260,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private stopCharacterPositionHighlight() {
        if (!this.highlightedCharacterType) {
            return;
        }

        for (const placedCharacter of this.pieceVisuals.values()) {
            if (placedCharacter.type !== this.highlightedCharacterType) {
                continue;
            }

            this.tweens.killTweensOf(placedCharacter.sprite);
            placedCharacter.sprite.setAlpha(1);
        }

        this.highlightedCharacterType = undefined;
    }

    private cancelCardHoldHighlight() {
        this.cardHoldTimer?.remove(false);
        this.cardHoldTimer = undefined;
        this.stopCharacterPositionHighlight();
    }

    private startCardDrag(character: CharacterType, x: number, y: number) {
        if (this.playerState.isDefeated()) {
            return;
        }

        this.dragHighlight?.setVisible(false);
        this.cardDragText?.destroy();
        this.cardDragText = this.add.text(x, y, `${character.symbol}  ${character.name}`, {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    private updateCardDragShadow(x: number, y: number) {
        const cell = this.getCellAtPosition(x, y);

        if (this.playerState.isDefeated() || !cell) {
            this.dragHighlight?.setVisible(false);
            return;
        }

        this.dragHighlight?.setPosition(cell.x, cell.y).setFillStyle(0x1e293b, 0.18).setVisible(true);
    }

    private finishCardDrag(character: CharacterType, x: number, y: number) {
        const cell = this.getCellAtPosition(x, y);
        this.dragHighlight?.setVisible(false);
        this.cardDragText?.destroy();
        this.cardDragText = undefined;
        if (!cell) {
            return;
        }

        if (!this.tryPlaceCharacter(character, cell.cellIndex, cell.row, cell.column, cell.x, cell.y)) {
            this.showInvalidCell(cell.x, cell.y);
        }
    }

    private startPieceDrag(piece: PlacedCharacter) {
        if (this.playerState.isDefeated()) {
            return;
        }

        const sourceCell = this.findPieceCell(piece);

        if (sourceCell !== undefined && this.playerState.hasRepositionCredit()) {
            this.draggedPiece = { piece, sourceCell };
        }
    }

    private updatePieceDrag(piece: PlacedCharacter, x: number, y: number) {
        if (this.playerState.isDefeated()) {
            return;
        }

        const drag = this.draggedPiece;

        if (!drag || drag.piece !== piece) {
            const sourceCell = this.findPieceCell(piece);
            if (sourceCell !== undefined) {
                this.movePieceVisual(piece, this.getCellCenter(Math.floor(sourceCell / GRID_SIZE), sourceCell % GRID_SIZE));
            }
            return;
        }

        this.movePieceVisual(piece, { x, y });
        const cell = this.getCellAtPosition(x, y);

        if (!cell) {
            this.dragHighlight?.setVisible(false);
            return;
        }

        const isValid = this.canAttemptReposition(drag.sourceCell, cell.cellIndex);
        this.dragHighlight?.setPosition(cell.x, cell.y).setFillStyle(isValid ? 0x63d69b : COLORS.invalid).setVisible(true);
    }

    private finishPieceDrag(piece: PlacedCharacter, x: number, y: number) {
        if (this.playerState.isDefeated()) {
            return;
        }

        const drag = this.draggedPiece;
        this.dragHighlight?.setVisible(false);

        if (!drag || drag.piece !== piece) {
            return;
        }

        this.draggedPiece = undefined;
        const cell = this.getCellAtPosition(x, y);
        const sourcePosition = this.getCellCenter(Math.floor(drag.sourceCell / GRID_SIZE), drag.sourceCell % GRID_SIZE);

        if (!cell || !this.tryReposition(drag.sourceCell, cell.cellIndex, cell.row, cell.column, cell.x, cell.y)) {
            this.movePieceVisual(piece, sourcePosition);
            if (cell) {
                this.showInvalidCell(cell.x, cell.y);
            }
        }
    }

    private findPieceCell(piece: PlacedCharacter): number | undefined {
        for (const [cellIndex, placedCharacter] of this.pieceVisuals) {
            if (placedCharacter === piece) {
                return cellIndex;
            }
        }

        return undefined;
    }

    private canAttemptReposition(sourceCell: number, targetCell: number): boolean {
        return !this.playerState.isDefeated()
            && this.playerState.hasRepositionCredit()
            && canMoveOrSwap(this.boardState.getCells(), sourceCell, targetCell);
    }

    private handleRepositionRequest() {
        if (this.playerState.isDefeated()) {
            return;
        }

        if (this.isRepositionMode) {
            this.isRepositionMode = false;
            this.repositionSourceCell = undefined;
        } else if (this.playerState.hasRepositionCredit()) {
            this.isRepositionMode = true;
            this.repositionSourceCell = undefined;
        }

        this.updateRepositionInterface();
    }

    private updateRepositionInterface() {
        this.gameUI.updateRepositionCredits(this.playerState.getRepositionCredits(), this.isRepositionMode);
    }

    private increaseDragonFury() {
        if (this.playerState.isDefeated()) {
            return;
        }

        const result = this.combatManager.increaseDragonFury();
        this.updateFuryInterface(result.furyAfterIncrease);
        this.playFuryGainEffect(result.furyAfterIncrease);

        if (result.heroDamage > 0) {
            this.performDragonAttack(result.heroDamage);
        }
    }

    private performDragonAttack(damage: number) {
        if (this.playerState.isDefeated()) {
            return;
        }

        this.damageHero(damage);
        this.updateFuryInterface();
        this.playDragonAttackEffect(damage);
    }

    private damageHero(amount: number) {
        this.playerState.damage(amount);
        this.updateHeroInterface();
        this.playHeroDamageEffect();
        this.checkDefeat();
    }

    private checkDefeat() {
        if (!this.playerState.isDefeated()) {
            return;
        }

        this.isRepositionMode = false;
        this.repositionSourceCell = undefined;
        this.draggedPiece = undefined;
        this.dragHighlight?.setVisible(false);
        this.cardDragText?.destroy();
        this.cardDragText = undefined;
        this.updateRepositionInterface();
        this.time.delayedCall(650, () => this.gameUI.showDefeat(() => this.scene.restart()));
    }

    private updateHeroInterface() {
        const currentHp = this.playerState.getCurrentHp();
        const maxHp = this.playerState.getMaxHp();
        this.gameUI.updateHeroHp(currentHp, maxHp);
    }

    private updateFuryInterface(displayedFury = this.combatManager.getDragonFury()) {
        const maximumFury = this.combatManager.getDragonMaxFury();
        this.gameUI.updateFury(displayedFury, maximumFury);
    }

    private playFuryGainEffect(furyAfterIncrease: number) {
        const furyText = this.gameUI.getFuryText();

        if (!furyText) {
            return;
        }

        const isMaximum = furyAfterIncrease === this.combatManager.getDragonMaxFury();
        this.tweens.add({
            targets: furyText,
            scaleX: isMaximum ? 1.35 : 1.12,
            scaleY: isMaximum ? 1.35 : 1.12,
            duration: isMaximum ? 140 : 90,
            yoyo: true
        });

        if (isMaximum) {
            const warning = this.add.text(this.scale.width / 2, 104, 'FÚRIA MÁXIMA!', {
                fontFamily: 'Arial Black', fontSize: 30, color: '#ff6b4a', stroke: '#17191f', strokeThickness: 5
            }).setOrigin(0.5).setDepth(100);
            this.tweens.add({ targets: warning, y: 88, alpha: 0, duration: 600, onComplete: () => warning.destroy() });
        }
    }

    private playDragonAttackEffect(amount: number) {
        const dragonAvatar = this.gameUI.getDragonAvatar();
        if (dragonAvatar) {
            this.tweens.add({
                targets: dragonAvatar,
                scaleX: dragonAvatar.scaleX * 1.3,
                scaleY: dragonAvatar.scaleY * 1.3,
                angle: 6,
                duration: 70,
                yoyo: true,
                repeat: 2
            });
        }

        const attackText = this.add.text(this.scale.width / 2, this.scale.height / 2, `ATAQUE DO DRAGÃO\n-${amount} HP`, {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ff6b4a', align: 'center', stroke: '#17191f', strokeThickness: 6
        }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: attackText, y: attackText.y - 24, alpha: 0, duration: 700, onComplete: () => attackText.destroy() });
    }

    private playHeroDamageEffect() {
        const heroPanel = this.gameUI.getHeroPanel();
        if (!heroPanel) {
            return;
        }

        this.tweens.add({ targets: heroPanel, x: heroPanel.x + 5, duration: 55, yoyo: true, repeat: 3 });
        this.tweens.add({ targets: this.gameUI.getHeroHpVisuals(), alpha: 0.25, duration: 80, yoyo: true, repeat: 1 });
    }

    private handleRegionAttack(regionRow: number, regionColumn: number) {
        if (this.playerState.isDefeated()) {
            return;
        }

        // O ataque combina o dano-base da região com bônus das sinergias ativas.
        const formedSynergies = getFormedSynergiesInRegion(this.boardState.getCells(), regionRow, regionColumn);
        const activeSynergies = formedSynergies.map((formedSynergy) => formedSynergy.definition);
        const synergyBonus = activeSynergies.reduce((total, synergy) => total + synergy.bonusDamage, 0);
        const damage = this.combatManager.attackDragonFromRegion(synergyBonus);

        this.recordBossDamage(damage);
        this.updateBossInterface();
        this.showBossDamageFeedback(damage);
        this.playBossHitEffect();
        this.applySynergyRewards(activeSynergies);
        formedSynergies.forEach((formedSynergy, index) => this.playSynergyActivation(formedSynergy, index * 160));
    }

    private applySynergyRewards(synergies: SynergyDefinition[]) {
        const repositionmentsEarned = synergies.reduce((total, synergy) => total + synergy.repositionments, 0);
        const healingEarned = synergies.reduce((total, synergy) => total + synergy.healing, 0);

        if (repositionmentsEarned > 0) {
            this.playerState.addRepositionCredits(repositionmentsEarned);
            this.updateRepositionInterface();
        }

        if (healingEarned > 0) {
            this.healHero(healingEarned);
        }
    }

    private healHero(amount: number) {
        const hpBeforeHealing = this.playerState.getCurrentHp();
        this.playerState.heal(amount);
        const healedAmount = this.playerState.getCurrentHp() - hpBeforeHealing;
        this.updateHeroInterface();

        if (healedAmount > 0) {
            this.recordCombatEvent({ type: 'healing', amount: healedAmount });
        }
    }

    private recordBossDamage(amount: number) {
        this.recordCombatEvent({ type: 'damage', amount });
    }

    private recordCombatEvent(event: CombatHistoryEvent) {
        this.combatHistory.push(event);
        this.gameUI.updateCombatHistory(this.combatHistory);
    }

    private updateBossInterface() {
        const currentHp = this.combatManager.getDragonCurrentHp();
        const maxHp = this.combatManager.getDragonMaxHp();
        this.gameUI.updateDragonHp(currentHp, maxHp);
    }

    private showBossDamageFeedback(amount: number) {
        const dragonAvatar = this.gameUI.getDragonAvatar();
        if (!dragonAvatar) {
            return;
        }

        const flash = this.add.circle(dragonAvatar.x, dragonAvatar.y, 18, 0xffd25f, 0.8);
        const damageText = this.add.text(dragonAvatar.x + 255, dragonAvatar.y - 10, `-${amount}`, {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffd25f'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: flash,
            scaleX: 2.4,
            scaleY: 2.4,
            alpha: 0,
            duration: 280,
            onComplete: () => flash.destroy()
        });
        this.tweens.add({
            targets: damageText,
            y: dragonAvatar.y - 32,
            alpha: 0,
            duration: 550,
            onComplete: () => damageText.destroy()
        });
    }

    private playBossHitEffect() {
        const dragonAvatar = this.gameUI.getDragonAvatar();
        if (!dragonAvatar) {
            return;
        }

        const originalX = dragonAvatar.x;

        // Impacto curto para dar peso ao golpe.
        this.tweens.killTweensOf(dragonAvatar);
        this.tweens.add({
            targets: dragonAvatar,
            x: originalX + 5,
            duration: 70,
            yoyo: true,
            repeat: 2,
            onComplete: () => dragonAvatar.setX(originalX)
        });

        // Pisca por aproximadamente 2 segundos após receber dano.
        // O alpha nunca chega a zero para o dragão continuar legível durante o efeito.
        this.tweens.add({
            targets: dragonAvatar,
            alpha: 0.28,
            duration: 125,
            yoyo: true,
            repeat: 7,
            ease: 'Sine.easeInOut',
            onComplete: () => dragonAvatar.setAlpha(1)
        });
    }

    private playSynergyActivation(formedSynergy: FormedSynergy, delay: number) {
        this.time.delayedCall(delay, () => {
            const { definition: synergy, pair } = formedSynergy;

            if (synergy.id === 'arcane-arrow') {
                this.playArcaneArrowEffect(pair);
            } else if (synergy.id === 'tactical-maneuver') {
                this.playTacticalManeuverEffect(pair);
            } else {
                this.playNaturesBlessingEffect(pair);
            }

            this.showSynergyFeedback(synergy);
        });
    }

    private playArcaneArrowEffect(pair: readonly [number, number]) {
        const mage = this.pieceVisuals.get(pair[0]);
        const archer = this.pieceVisuals.get(pair[1]);

        if (!mage || !archer) {
            return;
        }

        this.tweens.add({ targets: mage.sprite, scaleX: 2.7, scaleY: 2.7, duration: 120, yoyo: true });
        this.tweens.add({ targets: archer.sprite, scaleX: 2.5, scaleY: 2.5, duration: 120, delay: 150, yoyo: true });

        const effect = this.add.graphics();
        effect.lineStyle(4, 0x9d81ff, 0.95);
        effect.lineBetween(mage.sprite.x, mage.sprite.y, archer.sprite.x, archer.sprite.y);
        effect.lineStyle(3, 0xbca8ff, 0.9);
        const dragonAvatar = this.gameUI.getDragonAvatar();
        if (dragonAvatar) {
            effect.lineBetween(archer.sprite.x, archer.sprite.y, dragonAvatar.x, dragonAvatar.y);
        }
        this.fadeAndDestroy(effect, 520);
    }

    private playTacticalManeuverEffect(pair: readonly [number, number]) {
        const paladin = this.pieceVisuals.get(pair[0]);
        const barbarian = this.pieceVisuals.get(pair[1]);

        if (!paladin || !barbarian) {
            return;
        }

        this.tweens.add({ targets: [paladin.sprite, barbarian.sprite], scaleX: 2.5, scaleY: 2.5, duration: 150, yoyo: true });
        const effect = this.add.graphics();
        effect.lineStyle(4, 0xf0b429, 0.9);
        effect.lineBetween(paladin.sprite.x, paladin.sprite.y, barbarian.sprite.x, barbarian.sprite.y);
        effect.strokeCircle(paladin.sprite.x, paladin.sprite.y, 29);
        effect.strokeCircle(barbarian.sprite.x, barbarian.sprite.y, 29);
        this.fadeAndDestroy(effect, 480);
        this.playResourceGainEffect();
    }

    private playNaturesBlessingEffect(pair: readonly [number, number]) {
        const cleric = this.pieceVisuals.get(pair[0]);
        const druid = this.pieceVisuals.get(pair[1]);

        if (!cleric || !druid) {
            return;
        }

        this.tweens.add({ targets: cleric.sprite, scaleX: 2.6, scaleY: 2.6, duration: 120, yoyo: true });
        this.tweens.add({ targets: druid.sprite, scaleX: 2.6, scaleY: 2.6, duration: 120, delay: 120, yoyo: true });
        const effect = this.add.graphics();
        effect.lineStyle(5, 0x63d69b, 0.95);
        effect.lineBetween(cleric.sprite.x, cleric.sprite.y, druid.sprite.x, druid.sprite.y);
        effect.strokeCircle(cleric.sprite.x, cleric.sprite.y, 29);
        effect.strokeCircle(druid.sprite.x, druid.sprite.y, 29);
        this.fadeAndDestroy(effect, 520);

        const heroPanel = this.gameUI.getHeroPanel();
        if (heroPanel) {
            this.tweens.add({ targets: [heroPanel, ...this.gameUI.getHeroHpVisuals()], alpha: 0.55, duration: 110, yoyo: true, repeat: 1 });
        }
    }

    private playResourceGainEffect() {
        const repositionText = this.gameUI.getRepositionText();
        if (!repositionText) {
            return;
        }

        this.tweens.add({
            targets: repositionText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 130,
            yoyo: true
        });
    }

    private fadeAndDestroy(effect: Phaser.GameObjects.Graphics, duration: number) {
        this.tweens.add({
            targets: effect,
            alpha: 0,
            duration,
            onComplete: () => effect.destroy()
        });
    }

    private showSynergyFeedback(synergy: SynergyDefinition) {
        const dragonAvatar = this.gameUI.getDragonAvatar();
        const heroPanel = this.gameUI.getHeroPanel();
        const isNatureBlessing = synergy.id === 'natures-blessing';
        const feedbackColor = isNatureBlessing ? 0x63d69b : 0x8f71ff;
        const feedbackTextColor = isNatureBlessing ? '#63d69b' : '#bca8ff';
        const feedbackX = isNatureBlessing ? heroPanel?.x ?? 0 : dragonAvatar?.x ?? 0;
        const feedbackY = isNatureBlessing ? heroPanel?.y ?? 0 : dragonAvatar?.y ?? 0;
        const arcanePulse = this.add.circle(feedbackX, feedbackY, 20, feedbackColor, 0.7);
        const synergyText = this.add.text(feedbackX + 200, feedbackY, `${synergy.name.toUpperCase()}\n${synergy.feedbackText}`, {
            fontFamily: 'Arial Black',
            fontSize: 16,
            color: feedbackTextColor,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: arcanePulse,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 420,
            onComplete: () => arcanePulse.destroy()
        });
        this.tweens.add({
            targets: synergyText,
            y: feedbackY - 22,
            alpha: 0,
            duration: 750,
            onComplete: () => synergyText.destroy()
        });
    }

    private refreshSynergyIndicators() {
        // Recria as conexões depois de cada movimento para que nenhuma linha visual
        // continue apontando para a posição antiga de uma peça.
        this.synergyConnectionGraphics.forEach((graphics) => {
            this.tweens.killTweensOf(graphics);
            graphics.destroy();
        });
        this.synergyConnectionGraphics = [];

        getAllFormedSynergies(this.boardState.getCells()).forEach((formedSynergy) => {
            this.showSynergyConnection(formedSynergy.definition, formedSynergy.pair);
        });
    }

    private showSynergyConnection(synergy: SynergyDefinition, pair: readonly [number, number]) {
        const firstCharacter = this.pieceVisuals.get(pair[0]);
        const secondCharacter = this.pieceVisuals.get(pair[1]);

        if (!firstCharacter || !secondCharacter) {
            return;
        }

        const graphics = this.add.graphics().setDepth(20);
        const color = synergy.id === 'arcane-arrow'
            ? 0x9d81ff
            : synergy.id === 'natures-blessing' ? 0x63d69b : 0xf0b429;
        const lineWidth = synergy.id === 'arcane-arrow' ? 2 : 3;

        // Realça discretamente o chão das duas células envolvidas na sinergia.
        // O preenchimento fica atrás das unidades e usa a mesma cor da conexão.
        const cellHighlight = this.add.graphics().setDepth(5);
        const highlightInset = 4;
        cellHighlight.fillStyle(color, 0.12);
        [firstCharacter, secondCharacter].forEach((character) => {
            cellHighlight.fillRoundedRect(
                character.sprite.x - CELL_SIZE / 2 + highlightInset,
                character.sprite.y - CELL_SIZE / 2 + highlightInset,
                CELL_SIZE - highlightInset * 2,
                CELL_SIZE - highlightInset * 2,
                8
            );
        });
        this.synergyConnectionGraphics.push(cellHighlight);

        graphics.lineStyle(lineWidth, color, 0.6);
        graphics.lineBetween(firstCharacter.sprite.x, firstCharacter.sprite.y, secondCharacter.sprite.x, secondCharacter.sprite.y);
        graphics.lineStyle(2, color, 0.5);
        graphics.strokeCircle(firstCharacter.sprite.x, firstCharacter.sprite.y, 26);
        graphics.strokeCircle(secondCharacter.sprite.x, secondCharacter.sprite.y, 26);
        this.synergyConnectionGraphics.push(graphics);

        this.tweens.add({
            targets: cellHighlight,
            alpha: { from: 0.55, to: 0.85 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({ targets: graphics, alpha: 0.45, duration: 260, yoyo: true });
    }

    private updateRegionState(row: number, column: number, boardX: number, boardY: number) {
        const regionRow = Math.floor(row / REGION_SIZE);
        const regionColumn = Math.floor(column / REGION_SIZE);
        const regionIndex = getRegionIndex(row, column);
        const regionIsComplete = isRegionComplete(
            this.boardState.getCells(),
            regionRow,
            regionColumn
        );
        this.boardState.setRegionComplete(regionIndex, regionIsComplete);
        const regionState = this.boardState.getRegionState(regionIndex);

        // Uma região ataca apenas uma vez, mesmo se for desfeita e completada novamente.
        if (regionState.isCurrentlyComplete && !regionState.hasAttacked) {
            this.boardState.markRegionAttacked(regionIndex);
            this.handleRegionCompleted(regionRow, regionColumn, boardX, boardY);
        }
    }

    private handleRegionCompleted(regionRow: number, regionColumn: number, boardX: number, boardY: number) {
        const regionSize = REGION_SIZE * CELL_SIZE;
        const regionX = boardX + regionColumn * regionSize + regionSize / 2;
        const regionY = boardY + regionRow * regionSize + regionSize / 2;
        const completedHighlight = this.add.rectangle(regionX, regionY, regionSize - 6, regionSize - 6, COLORS.attackedRegionOverlay, 0.18)
            .setStrokeStyle(3, COLORS.completedRegion, 0.9);

        this.tweens.add({
            targets: completedHighlight,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 180,
            yoyo: true,
            repeat: 1
        });

        this.events.emit('region-completed', regionRow, regionColumn);
    }

}
