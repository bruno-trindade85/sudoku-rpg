import type { Scene } from 'phaser';

const COLORS = {
    bossHp: 0xd94d54,
    hpBackground: 0x17191f,
    heroPanel: 0x171b22,
    heroHp: 0x63d69b,
    repositionPanel: 0x171b22,
    repositionActive: 0x7057bf,
    panel: 0x171b22,
    button: 0x3a4050,
    buttonActive: 0x5b4ec7
};

const HUD_LAYOUT = {
    panelX: 118,
    panelY: 168,
    panelWidth: 204,
    panelHeight: 318,
    repositionPanelX: 118,
    repositionPanelY: 112,
    damageHistoryX: 118,
    damageHistoryY: 222,
    heroPanelX: 118,
    heroPanelY: 52,
    dragonOffsetFromBoard: 145
};

export type CombatHistoryEvent =
    | { type: 'damage'; amount: number }
    | { type: 'healing'; amount: number }
    | { type: 'reposition' };

export class GameUI {
    private dragonHpText?: Phaser.GameObjects.Text;
    private dragonHpBar?: Phaser.GameObjects.Rectangle;
    private dragonAvatar?: Phaser.GameObjects.Image;
    private heroHpText?: Phaser.GameObjects.Text;
    private heroHpBar?: Phaser.GameObjects.Rectangle;
    private heroPanel?: Phaser.GameObjects.Rectangle;
    private furyText?: Phaser.GameObjects.Text;
    private combatHistoryTexts: Phaser.GameObjects.Text[] = [];
    private repositionText?: Phaser.GameObjects.Text;
    private repositionButton?: Phaser.GameObjects.Rectangle;
    private repositionButtonText?: Phaser.GameObjects.Text;

    constructor(private readonly scene: Scene) {}

    createHud(boardX: number, boardY: number, boardSize: number, onRepositionRequest: () => void): void {
        const dragonPanelX = boardX + boardSize + HUD_LAYOUT.dragonOffsetFromBoard;
        const dragonPanelY = boardY + boardSize / 2;

        this.createDragonInterface(dragonPanelX, dragonPanelY);
        this.createLeftHudPanel();
        this.createHeroInterface(HUD_LAYOUT.heroPanelX, HUD_LAYOUT.heroPanelY);
        this.createDamageHistory(HUD_LAYOUT.damageHistoryX, HUD_LAYOUT.damageHistoryY);
        this.createRepositionInterface(onRepositionRequest);
    }

    updateDragonHp(currentHp: number, maxHp: number): void {
        const hpPercentage = currentHp / maxHp;
        this.dragonHpText?.setText(`HP: ${currentHp} / ${maxHp}`);
        this.dragonHpBar?.setDisplaySize(190 * hpPercentage, 10);
    }

    updateHeroHp(currentHp: number, maxHp: number): void {
        const hpPercentage = currentHp / maxHp;
        this.heroHpText?.setText(`${currentHp} / ${maxHp} HP`);
        this.heroHpBar?.setDisplaySize(156 * hpPercentage, 10);
    }

    updateFury(currentFury: number, maximumFury: number): void {
        const isDanger = currentFury >= maximumFury - 1;
        this.furyText?.setText(`FÚRIA ${currentFury} / ${maximumFury}`);
        this.furyText?.setColor(isDanger ? '#ff6b4a' : '#f0b429');
    }

    updateRepositionCredits(amount: number, isRepositionMode: boolean): void {
        this.repositionText?.setText(`Reposicionamentos: ${amount}`);
        this.repositionButton?.setFillStyle(isRepositionMode ? COLORS.repositionActive : COLORS.button);
        this.repositionButtonText?.setText(isRepositionMode ? 'Cancelar reposicionamento' : 'Reposicionar');
    }

    updateCombatHistory(combatHistory: readonly CombatHistoryEvent[]): void {
        this.combatHistoryTexts.forEach((text) => text.destroy());
        this.combatHistoryTexts = [];

        const recentEvents = combatHistory.slice(-5);
        if (recentEvents.length === 0) {
            this.combatHistoryTexts.push(this.scene.add.text(HUD_LAYOUT.damageHistoryX - 78, HUD_LAYOUT.damageHistoryY - 50, 'Nenhum evento.', {
                fontFamily: 'Arial', fontSize: 17, color: '#ffffff'
            }));
            return;
        }

        recentEvents.forEach((event, index) => {
            const presentation = getCombatEventPresentation(event);
            this.combatHistoryTexts.push(this.scene.add.text(HUD_LAYOUT.damageHistoryX - 78, HUD_LAYOUT.damageHistoryY - 50 + index * 28, presentation.text, {
                fontFamily: 'Arial', fontSize: 17, color: presentation.color
            }));
        });
    }

    showDefeat(onRestart: () => void): void {
        this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height, 0x101218, 0.82)
            .setDepth(200);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2 - 60, 'DERROTA', {
            fontFamily: 'Arial Black', fontSize: 50, color: '#ff6b4a'
        }).setOrigin(0.5).setDepth(201);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2, 'O Dragão venceu!', {
            fontFamily: 'Arial', fontSize: 26, color: '#ffffff'
        }).setOrigin(0.5).setDepth(201);
        const button = this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2 + 70, 180, 46, COLORS.buttonActive)
            .setInteractive({ useHandCursor: true }).setDepth(201);
        this.scene.add.text(button.x, button.y, 'REINICIAR', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff'
        }).setOrigin(0.5).setDepth(202);
        button.on('pointerdown', onRestart);
    }

    getDragonAvatar(): Phaser.GameObjects.Image | undefined {
        return this.dragonAvatar;
    }

    getFuryText(): Phaser.GameObjects.Text | undefined {
        return this.furyText;
    }

    getHeroPanel(): Phaser.GameObjects.Rectangle | undefined {
        return this.heroPanel;
    }

    getHeroHpVisuals(): Phaser.GameObjects.GameObject[] {
        const targets: Phaser.GameObjects.GameObject[] = [];

        if (this.heroHpText) {
            targets.push(this.heroHpText);
        }
        if (this.heroHpBar) {
            targets.push(this.heroHpBar);
        }

        return targets;
    }

    getRepositionText(): Phaser.GameObjects.Text | undefined {
        return this.repositionText;
    }

    private createDragonInterface(panelX: number, panelY: number): void {
        const hpBarX = panelX - 95;
        const hpBarY = panelY + 126;

        this.dragonAvatar = this.scene.add.image(panelX, panelY, 'dragon')
            .setScale(2)
            .setFlipX(true);
        this.furyText = this.scene.add.text(panelX, panelY - 88, '', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#f0b429', stroke: '#17191f', strokeThickness: 3
        }).setOrigin(0.5);
        this.scene.add.text(panelX, panelY + 76, 'Dragão', {
            fontFamily: 'Arial Black', fontSize: 23, color: '#ffffff', stroke: '#17191f', strokeThickness: 3
        }).setOrigin(0.5);
        this.dragonHpText = this.scene.add.text(panelX, panelY + 100, '', {
            fontFamily: 'Arial', fontSize: 19, color: '#ffffff', stroke: '#17191f', strokeThickness: 3
        }).setOrigin(0.5);
        this.scene.add.rectangle(hpBarX, hpBarY, 190, 10, COLORS.hpBackground).setOrigin(0, 0.5);
        this.dragonHpBar = this.scene.add.rectangle(hpBarX, hpBarY, 190, 10, COLORS.bossHp).setOrigin(0, 0.5);
    }

    private createLeftHudPanel(): void {
        this.scene.add.rectangle(
            HUD_LAYOUT.panelX,
            HUD_LAYOUT.panelY,
            HUD_LAYOUT.panelWidth,
            HUD_LAYOUT.panelHeight,
            COLORS.panel,
            0.82
        ).setStrokeStyle(1, 0x667080, 0.38);
    }

    private createHeroInterface(panelX: number, panelY: number): void {
        const hpBarX = panelX - 78;
        const hpBarY = panelY + 19;

        // Referência invisível mantida para os efeitos que usam a posição do painel do herói.
        this.heroPanel = this.scene.add.rectangle(panelX, panelY, 1, 1, COLORS.heroPanel, 0);
        this.scene.add.text(panelX - 78, panelY - 23, 'HERÓI', {
            fontFamily: 'Arial Black', fontSize: 17, color: '#ffffff'
        });
        this.heroHpText = this.scene.add.text(panelX + 78, panelY - 21, '', {
            fontFamily: 'Arial', fontSize: 15, color: '#dfe6ee'
        }).setOrigin(1, 0);
        this.scene.add.rectangle(hpBarX, hpBarY, 156, 8, COLORS.hpBackground).setOrigin(0, 0.5);
        this.heroHpBar = this.scene.add.rectangle(hpBarX, hpBarY, 156, 8, COLORS.heroHp).setOrigin(0, 0.5);
    }

    private createDamageHistory(panelX: number, panelY: number): void {
        this.scene.add.rectangle(panelX, panelY - 82, 164, 1, 0x667080, 0.35);
        this.scene.add.text(panelX - 78, panelY - 72, 'HISTÓRICO DE COMBATE', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
        });
    }

    private createRepositionInterface(onRepositionRequest: () => void): void {
        const panelX = HUD_LAYOUT.repositionPanelX;
        const panelY = HUD_LAYOUT.repositionPanelY;

        this.repositionText = this.scene.add.text(panelX - 78, panelY - 17, '', {
            fontFamily: 'Arial', fontSize: 14, color: '#dfe6ee'
        });
        this.repositionButton = this.scene.add.rectangle(panelX, panelY + 16, 158, 27, COLORS.button)
            .setInteractive({ useHandCursor: true });
        this.repositionButtonText = this.scene.add.text(panelX, panelY + 16, '', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
        }).setOrigin(0.5);
        this.repositionButton.on('pointerdown', onRepositionRequest);
    }
}

function getCombatEventPresentation(event: CombatHistoryEvent): { text: string; color: string } {
    if (event.type === 'damage') {
        return { text: `-${event.amount} HP`, color: '#ff6b6b' };
    }

    if (event.type === 'healing') {
        return { text: `+${event.amount} HP`, color: '#63d69b' };
    }

    return { text: 'Reposicionamento usado', color: '#8fd3ff' };
}
