import { Scene } from 'phaser';

const GRID_SIZE = 9;
const REGION_SIZE = 3;
const CELL_SIZE = 64;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
const REGION_COMPLETION_DAMAGE = 50;

type CharacterType = {
    id: string;
    name: string;
    symbol: string;
    color: number;
};

type Boss = {
    name: string;
    maxHp: number;
    currentHp: number;
};

type RegionCharacter = {
    type: string;
    row: number;
    column: number;
};

type RegionSynergy = {
    id: string;
    name: string;
    characterTypes: [string, string];
    bonusDamage: number;
    repositionments: number;
    feedbackText: string;
    isActive: (characters: RegionCharacter[]) => boolean;
};

type PlacedCharacter = {
    type: string;
    circle: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
};

type RegionState = {
    isCurrentlyComplete: boolean;
    hasAttacked: boolean;
};

const CHARACTER_TYPES: CharacterType[] = [
    { id: 'mage', name: 'Mago', symbol: 'M', color: 0x7b5cff },
    { id: 'archer', name: 'Arqueiro', symbol: 'A', color: 0x4caf50 },
    { id: 'paladin', name: 'Paladino', symbol: 'P', color: 0xe5b94d },
    { id: 'rogue', name: 'Ladino', symbol: 'L', color: 0x65718a },
    { id: 'cleric', name: 'Clérigo', symbol: 'C', color: 0xf3f0d9 },
    { id: 'barbarian', name: 'Bárbaro', symbol: 'B', color: 0xcf5c4c },
    { id: 'druid', name: 'Druida', symbol: 'D', color: 0x749b49 },
    { id: 'dark-sorcerer', name: 'Feiticeiro Sombrio', symbol: 'F', color: 0x663b83 },
    { id: 'summoner', name: 'Invocador', symbol: 'I', color: 0x3aa8b8 }
];

const REGION_SYNERGIES: RegionSynergy[] = [
    {
        id: 'arcane-arrow',
        name: 'Flecha Arcana',
        characterTypes: ['mage', 'archer'],
        bonusDamage: 10,
        repositionments: 0,
        feedbackText: '+10 DANO',
        isActive: (characters) => {
            const mage = characters.find((character) => character.type === 'mage');
            const archer = characters.find((character) => character.type === 'archer');

            return Boolean(mage && archer
                && Math.abs(mage.row - archer.row) + Math.abs(mage.column - archer.column) === 1);
        }
    },
    {
        id: 'tactical-maneuver',
        name: 'Manobra Tática',
        characterTypes: ['paladin', 'barbarian'],
        bonusDamage: 0,
        repositionments: 1,
        feedbackText: '+1 REPOSICIONAMENTO',
        isActive: (characters) => {
            const paladin = characters.find((character) => character.type === 'paladin');
            const barbarian = characters.find((character) => character.type === 'barbarian');

            return Boolean(paladin && barbarian
                && Math.abs(paladin.row - barbarian.row) + Math.abs(paladin.column - barbarian.column) === 1);
        }
    }
];

const COLORS = {
    board: 0xf6f1e7,
    cellLine: 0x77736c,
    regionLine: 0x24221f,
    hover: 0xf0b429,
    selection: 0x4c8dff,
    invalid: 0xe05252,
    completedRegion: 0x63d69b,
    attackedRegionOverlay: 0x6b7280,
    bossPanel: 0x302a32,
    bossHp: 0xd94d54,
    bossHpBackground: 0x17191f,
    repositionPanel: 0x2d3748,
    repositionActive: 0x7057bf,
    unitArea: 0x242833,
    unitCard: 0x3a4050,
    unitCardSelected: 0x5b4ec7,
    unitText: 0xffffff
};

export class Game extends Scene {
    private placedCharacters = new Map<number, PlacedCharacter>();
    private regionStates = new Map<number, RegionState>();
    private boss: Boss = { name: 'Dragão', maxHp: 500, currentHp: 500 };
    private bossHpText?: Phaser.GameObjects.Text;
    private bossHpBar?: Phaser.GameObjects.Rectangle;
    private bossAvatar?: Phaser.GameObjects.Arc;
    private damageHistory: number[] = [];
    private damageHistoryText?: Phaser.GameObjects.Text;
    private repositionments = 0;
    private isRepositionMode = false;
    private repositionSourceCell?: number;
    private repositionText?: Phaser.GameObjects.Text;
    private repositionButton?: Phaser.GameObjects.Rectangle;
    private repositionButtonText?: Phaser.GameObjects.Text;
    private boardX = 0;
    private boardY = 0;
    private dragHighlight?: Phaser.GameObjects.Rectangle;
    private cardDragText?: Phaser.GameObjects.Text;
    private invalidHighlight?: Phaser.GameObjects.Rectangle;
    private invalidHighlightVersion = 0;
    private draggedPiece?: { piece: PlacedCharacter; sourceCell: number };
    private synergyConnectionGraphics: Phaser.GameObjects.Graphics[] = [];

    constructor() {
        super('Game');
    }

    create() {
        const boardX = (this.scale.width - BOARD_SIZE) / 2;
        const boardY = (this.scale.height - BOARD_SIZE) / 2;
        this.boardX = boardX;
        this.boardY = boardY;
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
        const characterCards = new Map<string, Phaser.GameObjects.Rectangle>();
        const showInvalidCell = (x: number, y: number) => {
            this.showInvalidCell(x, y);
        };

        this.placedCharacters.clear();
        this.regionStates.clear();
        this.boss.currentHp = this.boss.maxHp;
        this.damageHistory = [];
        this.repositionments = 0;
        this.isRepositionMode = false;
        this.repositionSourceCell = undefined;
        this.events.off('region-completed', this.handleRegionAttack, this);
        this.events.on('region-completed', this.handleRegionAttack, this);

        this.createBossInterface();
        this.createDamageHistory(boardX, boardY);
        this.createRepositionInterface();
        this.refreshSynergyIndicators();

        graphics.fillStyle(COLORS.board);
        graphics.fillRect(boardX, boardY, BOARD_SIZE, BOARD_SIZE);

        for (let index = 0; index <= GRID_SIZE; index++) {
            const isRegionBoundary = index % REGION_SIZE === 0;
            const lineWidth = isRegionBoundary ? 5 : 2;
            const lineColor = isRegionBoundary ? COLORS.regionLine : COLORS.cellLine;
            const offset = index * CELL_SIZE;

            graphics.lineStyle(lineWidth, lineColor);
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
                    selectedCell = cellIndex;
                    hoverHighlight.setVisible(false);
                    selectionHighlight.setPosition(cellX, cellY).setVisible(true);

                    if (this.isRepositionMode) {
                        const characterAtCell = this.placedCharacters.get(cellIndex);

                        if (this.repositionSourceCell === undefined) {
                            if (characterAtCell) {
                                this.repositionSourceCell = cellIndex;
                            } else {
                                showInvalidCell(cellX, cellY);
                            }
                            return;
                        }

                        const sourceCell = this.repositionSourceCell;
                        const characterToMove = this.placedCharacters.get(sourceCell);
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

        const unitAreaY = boardY + BOARD_SIZE + (this.scale.height - boardY - BOARD_SIZE) / 2;
        const cardWidth = 142;
        const cardHeight = 20;
        const cardGap = 10;
        const cardColumns = 3;
        const cardStartX = this.scale.width / 2 - cardWidth - cardGap;
        const cardStartY = unitAreaY - 17;

        this.add.rectangle(this.scale.width / 2, unitAreaY, 500, 86, COLORS.unitArea);
        this.add.text(282, unitAreaY - 34, 'Unidades', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff'
        }).setOrigin(0.5);

        CHARACTER_TYPES.forEach((character, index) => {
            const row = Math.floor(index / cardColumns);
            const column = index % cardColumns;
            const cardX = cardStartX + column * (cardWidth + cardGap);
            const cardY = cardStartY + row * (cardHeight + 3);
            const card = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, COLORS.unitCard)
                .setStrokeStyle(1, COLORS.unitCard)
                .setInteractive({ useHandCursor: true });
            this.input.setDraggable(card);

            characterCards.set(character.id, card);
            this.add.circle(cardX - cardWidth / 2 + 13, cardY, 7, character.color);
            this.add.text(cardX - cardWidth / 2 + 26, cardY, `${character.symbol}  ${character.name}`, {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff'
            }).setOrigin(0, 0.5);

            card.on('pointerdown', () => {
                selectedCharacter = character;
                updateCharacterCardSelection();
            });
            card.on('dragstart', () => this.startCardDrag(character, cardX, cardY));
            card.on('drag', (pointer: Phaser.Input.Pointer) => {
                card.setPosition(pointer.worldX, pointer.worldY);
                this.cardDragText?.setPosition(pointer.worldX, pointer.worldY);
                this.updateCardDragShadow(pointer.worldX, pointer.worldY);
            });
            card.on('dragend', (pointer: Phaser.Input.Pointer) => {
                card.setPosition(cardX, cardY);
                this.finishCardDrag(character, pointer.worldX, pointer.worldY);
            });
        });

        const updateCharacterCardSelection = () => {
            for (const [characterId, card] of characterCards) {
                const isSelected = characterId === selectedCharacter?.id;
                card.setFillStyle(isSelected ? COLORS.unitCardSelected : COLORS.unitCard);
                card.setStrokeStyle(isSelected ? 2 : 1, isSelected ? selectedCharacter?.color ?? COLORS.unitCard : COLORS.unitCard);
            }
        };
    }

    private tryPlaceCharacter(character: CharacterType, cellIndex: number, row: number, column: number, x: number, y: number): boolean {
        if (this.placedCharacters.has(cellIndex) || !this.canPlaceCharacter(character.id, row, column)) {
            return false;
        }

        const placedCharacter = this.placeCharacter(character, x, y);
        this.placedCharacters.set(cellIndex, placedCharacter);
        this.updateRegionState(row, column, this.boardX, this.boardY);
        this.refreshSynergyIndicators();
        this.playPlacementAnimation(placedCharacter);
        return true;
    }

    private tryReposition(sourceCell: number, targetCell: number, targetRow: number, targetColumn: number, targetX: number, targetY: number): boolean {
        const movingCharacter = this.placedCharacters.get(sourceCell);
        const targetCharacter = this.placedCharacters.get(targetCell);

        if (!movingCharacter || sourceCell === targetCell || this.repositionments <= 0) {
            return false;
        }
        const targetRowAtSource = Math.floor(sourceCell / GRID_SIZE);
        const targetColumnAtSource = sourceCell % GRID_SIZE;

        if (!this.canReposition(sourceCell, targetCell, targetRow, targetColumn)) {
            return false;
        }

        this.placedCharacters.set(targetCell, movingCharacter);

        if (targetCharacter) {
            this.placedCharacters.set(sourceCell, targetCharacter);
            this.movePieceVisual(targetCharacter, this.getCellCenter(targetRowAtSource, targetColumnAtSource));
        } else {
            this.placedCharacters.delete(sourceCell);
        }

        this.movePieceVisual(movingCharacter, { x: targetX, y: targetY });
        this.repositionments--;
        this.updateRepositionInterface();
        this.updateRegionState(targetRowAtSource, targetColumnAtSource, this.boardX, this.boardY);
        this.updateRegionState(targetRow, targetColumn, this.boardX, this.boardY);
        this.refreshSynergyIndicators();
        this.playPlacementAnimation(movingCharacter);

        return true;
    }

    private placeCharacter(character: CharacterType, x: number, y: number): PlacedCharacter {
        const circle = this.add.circle(x, y, 22, character.color);
        const label = this.add.text(x, y, character.symbol, {
            fontFamily: 'Arial Black',
            fontSize: 26,
            color: '#ffffff'
        }).setOrigin(0.5);

        const placedCharacter = { type: character.id, circle, label };

        circle.setInteractive({ useHandCursor: true });
        this.input.setDraggable(circle);
        circle.on('pointerdown', () => {
            if (this.isRepositionMode) {
                this.repositionSourceCell = this.findPieceCell(placedCharacter);
            }
        });
        circle.on('dragstart', () => this.startPieceDrag(placedCharacter));
        circle.on('drag', (pointer: Phaser.Input.Pointer) => this.updatePieceDrag(placedCharacter, pointer.worldX, pointer.worldY));
        circle.on('dragend', (pointer: Phaser.Input.Pointer) => this.finishPieceDrag(placedCharacter, pointer.worldX, pointer.worldY));

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
        piece.circle.setPosition(position.x, position.y);
        piece.label.setPosition(position.x, position.y);
    }

    private playPlacementAnimation(piece: PlacedCharacter) {
        this.tweens.add({
            targets: [piece.circle, piece.label],
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 100,
            yoyo: true
        });
    }

    private showInvalidCell(x: number, y: number) {
        const feedbackVersion = ++this.invalidHighlightVersion;
        this.invalidHighlight?.setPosition(x, y).setVisible(true);
        this.time.delayedCall(350, () => {
            if (feedbackVersion === this.invalidHighlightVersion) {
                this.invalidHighlight?.setVisible(false);
            }
        });
    }

    private startCardDrag(character: CharacterType, x: number, y: number) {
        this.dragHighlight?.setVisible(false);
        this.cardDragText?.destroy();
        this.cardDragText = this.add.text(x, y, `${character.symbol}  ${character.name}`, {
            fontFamily: 'Arial Black',
            fontSize: 12,
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    private updateCardDragShadow(x: number, y: number) {
        const cell = this.getCellAtPosition(x, y);

        if (!cell) {
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
        const sourceCell = this.findPieceCell(piece);

        if (sourceCell !== undefined && this.repositionments > 0) {
            this.draggedPiece = { piece, sourceCell };
        }
    }

    private updatePieceDrag(piece: PlacedCharacter, x: number, y: number) {
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

        const isValid = this.canReposition(drag.sourceCell, cell.cellIndex, cell.row, cell.column);
        this.dragHighlight?.setPosition(cell.x, cell.y).setFillStyle(isValid ? 0x63d69b : COLORS.invalid).setVisible(true);
    }

    private finishPieceDrag(piece: PlacedCharacter, x: number, y: number) {
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
        for (const [cellIndex, placedCharacter] of this.placedCharacters) {
            if (placedCharacter === piece) {
                return cellIndex;
            }
        }

        return undefined;
    }

    private canReposition(sourceCell: number, targetCell: number, targetRow: number, targetColumn: number): boolean {
        const movingCharacter = this.placedCharacters.get(sourceCell);
        const targetCharacter = this.placedCharacters.get(targetCell);

        if (!movingCharacter || sourceCell === targetCell || this.repositionments <= 0) {
            return false;
        }

        const ignoredCells = new Set([sourceCell, targetCell]);
        const movingCharacterCanMove = this.canPlaceCharacter(movingCharacter.type, targetRow, targetColumn, ignoredCells);
        const sourceRow = Math.floor(sourceCell / GRID_SIZE);
        const sourceColumn = sourceCell % GRID_SIZE;
        const targetCharacterCanMove = !targetCharacter
            || this.canPlaceCharacter(targetCharacter.type, sourceRow, sourceColumn, ignoredCells);

        return movingCharacterCanMove && targetCharacterCanMove;
    }

    private createRepositionInterface() {
        const panelX = 118;
        const panelY = 46;

        this.add.rectangle(panelX, panelY, 204, 74, COLORS.repositionPanel);
        this.repositionText = this.add.text(panelX, panelY - 17, '', {
            fontFamily: 'Arial',
            fontSize: 15,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.repositionButton = this.add.rectangle(panelX, panelY + 16, 158, 25, COLORS.unitCard)
            .setInteractive({ useHandCursor: true });
        this.repositionButtonText = this.add.text(panelX, panelY + 16, '', {
            fontFamily: 'Arial Black',
            fontSize: 13,
            color: '#ffffff'
        }).setOrigin(0.5);

        this.repositionButton.on('pointerdown', () => {
            if (this.isRepositionMode) {
                this.isRepositionMode = false;
                this.repositionSourceCell = undefined;
            } else if (this.repositionments > 0) {
                this.isRepositionMode = true;
                this.repositionSourceCell = undefined;
            }

            this.updateRepositionInterface();
        });

        this.updateRepositionInterface();
    }

    private updateRepositionInterface() {
        this.repositionText?.setText(`Reposicionamentos: ${this.repositionments}`);
        this.repositionButton?.setFillStyle(this.isRepositionMode ? COLORS.repositionActive : COLORS.unitCard);
        this.repositionButtonText?.setText(this.isRepositionMode ? 'Cancelar reposicionamento' : 'Reposicionar');
    }

    private createBossInterface() {
        const panelX = this.scale.width / 2;
        const panelY = 46;
        const hpBarX = panelX - 28;
        const hpBarY = panelY + 22;
        const hpBarWidth = 190;

        this.add.rectangle(panelX, panelY, 360, 74, COLORS.bossPanel);
        this.bossAvatar = this.add.circle(panelX - 140, panelY, 22, COLORS.bossHp);
        this.add.text(panelX - 140, panelY, 'D', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(panelX - 105, panelY - 17, this.boss.name, {
            fontFamily: 'Arial Black',
            fontSize: 20,
            color: '#ffffff'
        });
        this.bossHpText = this.add.text(panelX - 105, panelY + 5, '', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff'
        });
        this.add.rectangle(hpBarX, hpBarY, hpBarWidth, 10, COLORS.bossHpBackground).setOrigin(0, 0.5);
        this.bossHpBar = this.add.rectangle(hpBarX, hpBarY, hpBarWidth, 10, COLORS.bossHp).setOrigin(0, 0.5);

        this.updateBossInterface();
    }

    private handleRegionAttack(regionRow: number, regionColumn: number) {
        const activeSynergies = this.calculateRegionSynergies(regionRow, regionColumn);
        const synergyBonus = activeSynergies.reduce((total, synergy) => total + synergy.bonusDamage, 0);

        this.damageBoss(REGION_COMPLETION_DAMAGE + synergyBonus);
        this.applySynergyRewards(activeSynergies);
        activeSynergies.forEach((synergy, index) => this.playSynergyActivation(synergy, regionRow, regionColumn, index * 160));
    }

    private applySynergyRewards(synergies: RegionSynergy[]) {
        const repositionmentsEarned = synergies.reduce((total, synergy) => total + synergy.repositionments, 0);

        if (repositionmentsEarned > 0) {
            this.repositionments += repositionmentsEarned;
            this.updateRepositionInterface();
        }
    }

    private damageBoss(amount: number) {
        this.boss.currentHp = Math.max(0, this.boss.currentHp - amount);
        this.recordBossDamage(amount);
        this.updateBossInterface();
        this.showBossDamageFeedback(amount);
        this.playBossHitEffect();
    }

    private createDamageHistory(boardX: number, boardY: number) {
        const panelX = boardX + BOARD_SIZE + 104;
        const panelY = boardY + BOARD_SIZE / 2;

        this.add.rectangle(panelX, panelY, 192, 220, COLORS.unitArea);
        this.add.text(panelX, panelY - 88, 'Histórico de dano', {
            fontFamily: 'Arial Black',
            fontSize: 15,
            color: '#ffffff'
        }).setOrigin(0.5);
        this.damageHistoryText = this.add.text(panelX - 78, panelY - 62, 'Nenhum dano causado.', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff',
            lineSpacing: 6
        });
    }

    private recordBossDamage(amount: number) {
        this.damageHistory.push(amount);

        const history = this.damageHistory
            .map((damage, index) => `${index + 1}. -${damage} dano`)
            .join('\n');

        this.damageHistoryText?.setText(history);
    }

    private updateBossInterface() {
        const hpPercentage = this.boss.currentHp / this.boss.maxHp;

        this.bossHpText?.setText(`HP: ${this.boss.currentHp} / ${this.boss.maxHp}`);
        this.bossHpBar?.setDisplaySize(190 * hpPercentage, 10);
    }

    private showBossDamageFeedback(amount: number) {
        const panelX = this.scale.width / 2;
        const panelY = 46;
        const flash = this.add.circle(panelX - 140, panelY, 18, 0xffd25f, 0.8);
        const damageText = this.add.text(panelX + 115, panelY - 10, `-${amount}`, {
            fontFamily: 'Arial Black',
            fontSize: 24,
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
            y: panelY - 32,
            alpha: 0,
            duration: 550,
            onComplete: () => damageText.destroy()
        });
    }

    private playBossHitEffect() {
        if (!this.bossAvatar) {
            return;
        }

        this.tweens.add({
            targets: this.bossAvatar,
            x: this.bossAvatar.x + 5,
            duration: 70,
            yoyo: true,
            repeat: 2
        });
    }

    private playSynergyActivation(synergy: RegionSynergy, regionRow: number, regionColumn: number, delay: number) {
        this.time.delayedCall(delay, () => {
            const pair = this.findSynergyPairs(synergy, regionRow, regionColumn)[0];

            if (!pair) {
                return;
            }

            if (synergy.id === 'arcane-arrow') {
                this.playArcaneArrowEffect(pair);
            } else {
                this.playTacticalManeuverEffect(pair);
            }

            this.showSynergyFeedback(synergy);
        });
    }

    private playArcaneArrowEffect(pair: [number, number]) {
        const mage = this.placedCharacters.get(pair[0]);
        const archer = this.placedCharacters.get(pair[1]);

        if (!mage || !archer) {
            return;
        }

        this.tweens.add({ targets: mage.circle, scaleX: 1.35, scaleY: 1.35, duration: 120, yoyo: true });
        this.tweens.add({ targets: archer.circle, scaleX: 1.25, scaleY: 1.25, duration: 120, delay: 150, yoyo: true });

        const effect = this.add.graphics();
        effect.lineStyle(4, 0x9d81ff, 0.95);
        effect.lineBetween(mage.circle.x, mage.circle.y, archer.circle.x, archer.circle.y);
        effect.lineStyle(3, 0xbca8ff, 0.9);
        effect.lineBetween(archer.circle.x, archer.circle.y, this.scale.width / 2 - 140, 46);
        this.fadeAndDestroy(effect, 520);
    }

    private playTacticalManeuverEffect(pair: [number, number]) {
        const paladin = this.placedCharacters.get(pair[0]);
        const barbarian = this.placedCharacters.get(pair[1]);

        if (!paladin || !barbarian) {
            return;
        }

        this.tweens.add({ targets: [paladin.circle, barbarian.circle], scaleX: 1.25, scaleY: 1.25, duration: 150, yoyo: true });
        const effect = this.add.graphics();
        effect.lineStyle(4, 0xf0b429, 0.9);
        effect.lineBetween(paladin.circle.x, paladin.circle.y, barbarian.circle.x, barbarian.circle.y);
        effect.strokeCircle(paladin.circle.x, paladin.circle.y, 29);
        effect.strokeCircle(barbarian.circle.x, barbarian.circle.y, 29);
        this.fadeAndDestroy(effect, 480);
        this.playResourceGainEffect();
    }

    private playResourceGainEffect() {
        if (!this.repositionText) {
            return;
        }

        this.tweens.add({
            targets: this.repositionText,
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

    private showSynergyFeedback(synergy: RegionSynergy) {
        const panelX = this.scale.width / 2;
        const panelY = 46;
        const arcanePulse = this.add.circle(panelX - 140, panelY, 20, 0x8f71ff, 0.7);
        const synergyText = this.add.text(panelX + 200, panelY, `${synergy.name.toUpperCase()}\n${synergy.feedbackText}`, {
            fontFamily: 'Arial Black',
            fontSize: 14,
            color: '#bca8ff',
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
            y: panelY - 22,
            alpha: 0,
            duration: 750,
            onComplete: () => synergyText.destroy()
        });
    }

    private canPlaceCharacter(characterType: string, row: number, column: number, ignoredCellIndices = new Set<number>()): boolean {
        const targetRegion = this.getRegionIndex(row, column);

        for (const [cellIndex, placedCharacter] of this.placedCharacters) {
            if (ignoredCellIndices.has(cellIndex) || placedCharacter.type !== characterType) {
                continue;
            }

            const placedRow = Math.floor(cellIndex / GRID_SIZE);
            const placedColumn = cellIndex % GRID_SIZE;
            const placedRegion = this.getRegionIndex(placedRow, placedColumn);

            if (placedRow === row || placedColumn === column || placedRegion === targetRegion) {
                return false;
            }
        }

        return true;
    }

    private isRegionComplete(regionRow: number, regionColumn: number): boolean {
        const characterTypesInRegion = new Set<string>();
        const firstRow = regionRow * REGION_SIZE;
        const firstColumn = regionColumn * REGION_SIZE;

        for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
            for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
                const cellIndex = row * GRID_SIZE + column;
                const placedCharacter = this.placedCharacters.get(cellIndex);

                if (!placedCharacter) {
                    return false;
                }

                characterTypesInRegion.add(placedCharacter.type);
            }
        }

        return characterTypesInRegion.size === CHARACTER_TYPES.length
            && CHARACTER_TYPES.every((character) => characterTypesInRegion.has(character.id));
    }

    private refreshSynergyIndicators() {
        this.synergyConnectionGraphics.forEach((graphics) => {
            this.tweens.killTweensOf(graphics);
            graphics.destroy();
        });
        this.synergyConnectionGraphics = [];

        REGION_SYNERGIES.forEach((synergy) => {
            this.findSynergyPairs(synergy).forEach((pair) => this.showSynergyConnection(synergy, pair));
        });
    }

    private findSynergyPairs(synergy: RegionSynergy, regionRow?: number, regionColumn?: number): [number, number][] {
        const pairs: [number, number][] = [];
        const [firstType, secondType] = synergy.characterTypes;

        for (const [cellIndex, character] of this.placedCharacters) {
            const row = Math.floor(cellIndex / GRID_SIZE);
            const column = cellIndex % GRID_SIZE;

            if (character.type !== firstType
                || (regionRow !== undefined && (Math.floor(row / REGION_SIZE) !== regionRow || Math.floor(column / REGION_SIZE) !== regionColumn))) {
                continue;
            }

            const adjacentCells = [
                { row: row - 1, column },
                { row: row + 1, column },
                { row, column: column - 1 },
                { row, column: column + 1 }
            ];

            for (const adjacent of adjacentCells) {
                const adjacentCharacter = this.placedCharacters.get(adjacent.row * GRID_SIZE + adjacent.column);

                if (adjacent.row >= 0 && adjacent.row < GRID_SIZE && adjacent.column >= 0 && adjacent.column < GRID_SIZE
                    && adjacentCharacter?.type === secondType) {
                    pairs.push([cellIndex, adjacent.row * GRID_SIZE + adjacent.column]);
                }
            }
        }

        return pairs;
    }

    private showSynergyConnection(synergy: RegionSynergy, pair: [number, number]) {
        const firstCharacter = this.placedCharacters.get(pair[0]);
        const secondCharacter = this.placedCharacters.get(pair[1]);

        if (!firstCharacter || !secondCharacter) {
            return;
        }

        const graphics = this.add.graphics().setDepth(20);
        const color = synergy.id === 'arcane-arrow' ? 0x9d81ff : 0xf0b429;
        const lineWidth = synergy.id === 'arcane-arrow' ? 2 : 3;
        graphics.lineStyle(lineWidth, color, 0.6);
        graphics.lineBetween(firstCharacter.circle.x, firstCharacter.circle.y, secondCharacter.circle.x, secondCharacter.circle.y);
        graphics.lineStyle(2, color, 0.5);
        graphics.strokeCircle(firstCharacter.circle.x, firstCharacter.circle.y, 26);
        graphics.strokeCircle(secondCharacter.circle.x, secondCharacter.circle.y, 26);
        this.synergyConnectionGraphics.push(graphics);

        this.tweens.add({ targets: graphics, alpha: 0.45, duration: 260, yoyo: true });
    }

    private calculateRegionSynergies(regionRow: number, regionColumn: number): RegionSynergy[] {
        const characters: RegionCharacter[] = [];
        const firstRow = regionRow * REGION_SIZE;
        const firstColumn = regionColumn * REGION_SIZE;

        for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
            for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
                const placedCharacter = this.placedCharacters.get(row * GRID_SIZE + column);

                if (placedCharacter) {
                    characters.push({ type: placedCharacter.type, row, column });
                }
            }
        }

        return REGION_SYNERGIES.filter((synergy) => synergy.isActive(characters));
    }

    private updateRegionState(row: number, column: number, boardX: number, boardY: number) {
        const regionRow = Math.floor(row / REGION_SIZE);
        const regionColumn = Math.floor(column / REGION_SIZE);
        const regionIndex = this.getRegionIndex(row, column);
        const regionState = this.getRegionState(regionIndex);

        regionState.isCurrentlyComplete = this.isRegionComplete(regionRow, regionColumn);

        if (regionState.isCurrentlyComplete && !regionState.hasAttacked) {
            regionState.hasAttacked = true;
            this.handleRegionCompleted(regionRow, regionColumn, boardX, boardY);
        }
    }

    private getRegionState(regionIndex: number): RegionState {
        let regionState = this.regionStates.get(regionIndex);

        if (!regionState) {
            regionState = { isCurrentlyComplete: false, hasAttacked: false };
            this.regionStates.set(regionIndex, regionState);
        }

        return regionState;
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

    private getRegionIndex(row: number, column: number): number {
        return Math.floor(row / REGION_SIZE) * REGION_SIZE + Math.floor(column / REGION_SIZE);
    }
}
