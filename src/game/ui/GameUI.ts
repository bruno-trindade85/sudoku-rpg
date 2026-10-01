import type { Scene } from 'phaser';
import { SYNERGY_DEFINITIONS } from '../synergies/SynergyManager';
import { CHARACTER_TYPES, UNIT_IDS, UNIT_SPRITE_FLIP_X, UNIT_TEXTURES } from '../units/UnitConfig';

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
    panelX: 178,
    panelY: 259,
    panelWidth: 333,
    panelHeight: 504,
    repositionPanelX: 178,
    repositionPanelY: 167,
    synergyGuideX: 178,
    synergyGuideY: 490,
    heroPanelX: 178,
    heroPanelY: 74,
    dragonOffsetFromBoard: 185
};

export class GameUI {
    private dragonHpText?: Phaser.GameObjects.Text;
    private dragonHpBar?: Phaser.GameObjects.Rectangle;
    private dragonAvatar?: Phaser.GameObjects.Image;
    private heroHpText?: Phaser.GameObjects.Text;
    private heroHpBar?: Phaser.GameObjects.Rectangle;
    private heroPanel?: Phaser.GameObjects.Rectangle;
    private furyText?: Phaser.GameObjects.Text;
    private repositionText?: Phaser.GameObjects.Text;
    private repositionButton?: Phaser.GameObjects.Rectangle;
    private repositionButtonText?: Phaser.GameObjects.Text;
    private evasionText?: Phaser.GameObjects.Text;

    constructor(private readonly scene: Scene) {}

    createHud(boardX: number, boardY: number, boardSize: number, onRepositionRequest: () => void): void {
        const dragonPanelX = boardX + boardSize + HUD_LAYOUT.dragonOffsetFromBoard;
        const dragonPanelY = boardY + boardSize / 2;

        this.createDragonInterface(dragonPanelX, dragonPanelY);
        this.createLeftHudPanel();
        this.createHeroInterface(HUD_LAYOUT.heroPanelX, HUD_LAYOUT.heroPanelY);
        this.createSynergyGuide(HUD_LAYOUT.synergyGuideX, HUD_LAYOUT.synergyGuideY);
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
        this.heroHpBar?.setDisplaySize(263 * hpPercentage, 11);
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

    updateEvasionCharges(amount: number, maximumAmount: number): void {
        this.evasionText?.setText(`Evasão: ${amount} / ${maximumAmount}`);
    }

    showDefeat(onRestart: () => void): void {
        this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height, 0x101218, 0.82)
            .setDepth(200);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2 - 60, 'DERROTA', {
            fontFamily: 'Arial Black', fontSize: 50, color: '#ff6b4a'
        }).setOrigin(0.5).setDepth(201);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2, 'O Dragão venceu!', {
            fontFamily: 'Arial', fontSize: 18, color: '#ffffff'
        }).setOrigin(0.5).setDepth(201);
        const button = this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2 + 70, 180, 46, COLORS.buttonActive)
            .setInteractive({ useHandCursor: true }).setDepth(201);
        this.scene.add.text(button.x, button.y, 'REINICIAR', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff'
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
        const hpBarY = panelY + 210;

        this.dragonAvatar = this.scene.add.image(panelX, panelY, 'dragon')
            // A 3x3 board region is 3 × 92px = 276px on each side.
            .setDisplaySize(276, 276)
            .setFlipX(true);
        this.furyText = this.scene.add.text(panelX, panelY - 166, '', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#f0b429', stroke: '#17191f', strokeThickness: 3
        }).setOrigin(0.5);
        this.scene.add.text(panelX, panelY + 162, 'Dragão', {
            fontFamily: 'Arial Black', fontSize: 23, color: '#ffffff', stroke: '#17191f', strokeThickness: 3
        }).setOrigin(0.5);
        this.dragonHpText = this.scene.add.text(panelX, panelY + 186, '', {
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
        const hpBarX = panelX - 132;
        const hpBarY = panelY + 27;

        // Referência invisível mantida para os efeitos que usam a posição do painel do herói.
        this.heroPanel = this.scene.add.rectangle(panelX, panelY, 1, 1, COLORS.heroPanel, 0);
        this.scene.add.text(panelX - 132, panelY - 32, 'HERÓI', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff'
        });
        this.heroHpText = this.scene.add.text(panelX + 132, panelY - 29, '', {
            fontFamily: 'Arial', fontSize: 18, color: '#ffffff'
        }).setOrigin(1, 0);
        this.scene.add.rectangle(hpBarX, hpBarY, 263, 11, COLORS.hpBackground).setOrigin(0, 0.5);
        this.heroHpBar = this.scene.add.rectangle(hpBarX, hpBarY, 263, 11, COLORS.heroHp).setOrigin(0, 0.5);
        this.evasionText = this.scene.add.text(panelX - 132, panelY + 46, '', {
            fontFamily: 'Arial', fontSize: 18, color: '#c084fc'
        });
    }

    private createSynergyGuide(panelX: number, panelY: number): void {
        const guideWidth = 333;
        const guideHeight = 480;

        this.scene.add.rectangle(panelX, panelY, guideWidth, guideHeight, COLORS.panel, 0.92)
            .setStrokeStyle(1, 0x667080, 0.6);
        this.scene.add.text(panelX, panelY - 180, 'SINERGIAS', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        this.scene.add.text(panelX, panelY - 151, 'Pares adjacentes e bônus de região', {
            fontFamily: 'Arial', fontSize: 15, color: '#b9c2d0'
        }).setOrigin(0.5);

        SYNERGY_DEFINITIONS.forEach((synergy, index) => {
            const rowY = panelY - 105 + index * 78;
            const [firstUnit, secondUnit] = synergy.unitTypes;
            const firstName = CHARACTER_TYPES.find((unit) => unit.id === firstUnit)?.name ?? firstUnit;
            const secondName = CHARACTER_TYPES.find((unit) => unit.id === secondUnit)?.name ?? secondUnit;

            this.scene.add.rectangle(panelX, rowY, guideWidth - 28, 66, 0x252b37, 0.72)
                .setStrokeStyle(1, 0x667080, 0.28);
            this.scene.add.image(panelX - 126, rowY, UNIT_TEXTURES[firstUnit])
                .setDisplaySize(42, 42)
                .setFlipX(UNIT_SPRITE_FLIP_X[firstUnit]);
            this.scene.add.text(panelX - 98, rowY, '+', {
                fontFamily: 'Arial Black', fontSize: 20, color: '#f0b429'
            }).setOrigin(0.5);
            this.scene.add.image(panelX - 70, rowY, UNIT_TEXTURES[secondUnit])
                .setDisplaySize(42, 42)
                .setFlipX(UNIT_SPRITE_FLIP_X[secondUnit]);
            this.scene.add.text(panelX - 38, rowY - 17, `${firstName} + ${secondName}`, {
                fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
            });
            this.scene.add.text(panelX - 38, rowY + 8, synergy.feedbackText, {
                fontFamily: 'Arial Black', fontSize: 15, color: '#f0b429'
            });
        });

        const rogueRowY = panelY - 105 + SYNERGY_DEFINITIONS.length * 78;
        this.scene.add.rectangle(panelX, rogueRowY, guideWidth - 28, 66, 0x2b2637, 0.8)
            .setStrokeStyle(1, 0xc084fc, 0.45);
        this.scene.add.image(panelX - 98, rogueRowY, UNIT_TEXTURES[UNIT_IDS.rogue])
            .setDisplaySize(42, 42)
            .setFlipX(UNIT_SPRITE_FLIP_X[UNIT_IDS.rogue]);
        this.scene.add.text(panelX - 62, rogueRowY - 17, 'Ladino na região completa', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
        });
        this.scene.add.text(panelX - 62, rogueRowY + 8, 'EVASÃO: evita o próximo ataque', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#c084fc'
        });
    }

    private createRepositionInterface(onRepositionRequest: () => void): void {
        const panelX = HUD_LAYOUT.repositionPanelX;
        const panelY = HUD_LAYOUT.repositionPanelY;

        this.repositionText = this.scene.add.text(panelX - 132, panelY - 24, '', {
            fontFamily: 'Arial', fontSize: 18, color: '#ffffff'
        });
        this.repositionButton = this.scene.add.rectangle(panelX, panelY + 25, 263, 38, COLORS.button)
            .setInteractive({ useHandCursor: true });
        this.repositionButtonText = this.scene.add.text(panelX, panelY + 25, '', {
            fontFamily: 'Arial Black', fontSize: 17, color: '#ffffff'
        }).setOrigin(0.5);
        this.repositionButton.on('pointerdown', onRepositionRequest);
    }
}
