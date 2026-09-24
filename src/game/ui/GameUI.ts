import type { Scene } from 'phaser';

const COLORS = {
    bossPanel: 0x302a32,
    bossHp: 0xd94d54,
    hpBackground: 0x17191f,
    heroPanel: 0x263847,
    heroHp: 0x63d69b,
    repositionPanel: 0x2d3748,
    repositionActive: 0x7057bf,
    panel: 0x242833,
    button: 0x3a4050,
    buttonActive: 0x5b4ec7
};

export class GameUI {
    private dragonHpText?: Phaser.GameObjects.Text;
    private dragonHpBar?: Phaser.GameObjects.Rectangle;
    private dragonAvatar?: Phaser.GameObjects.Arc;
    private heroHpText?: Phaser.GameObjects.Text;
    private heroHpBar?: Phaser.GameObjects.Rectangle;
    private heroPanel?: Phaser.GameObjects.Rectangle;
    private furyText?: Phaser.GameObjects.Text;
    private damageHistoryText?: Phaser.GameObjects.Text;
    private repositionText?: Phaser.GameObjects.Text;
    private repositionButton?: Phaser.GameObjects.Rectangle;
    private repositionButtonText?: Phaser.GameObjects.Text;

    constructor(private readonly scene: Scene) {}

    createHud(boardX: number, boardY: number, boardSize: number, onRepositionRequest: () => void): void {
        this.createDragonInterface();
        this.createHeroInterface();
        this.createDamageHistory(boardX, boardY, boardSize);
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

    updateDamageHistory(damageHistory: readonly number[]): void {
        const history = damageHistory.length === 0
            ? 'Nenhum dano causado.'
            : damageHistory.map((damage, index) => `${index + 1}. -${damage} dano`).join('\n');
        this.damageHistoryText?.setText(history);
    }

    showDefeat(onRestart: () => void): void {
        this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height, 0x101218, 0.82)
            .setDepth(200);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2 - 60, 'DERROTA', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ff6b4a'
        }).setOrigin(0.5).setDepth(201);
        this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2, 'O Dragão venceu!', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5).setDepth(201);
        const button = this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2 + 70, 180, 46, COLORS.buttonActive)
            .setInteractive({ useHandCursor: true }).setDepth(201);
        this.scene.add.text(button.x, button.y, 'REINICIAR', {
            fontFamily: 'Arial Black', fontSize: 18, color: '#ffffff'
        }).setOrigin(0.5).setDepth(202);
        button.on('pointerdown', onRestart);
    }

    getDragonAvatar(): Phaser.GameObjects.Arc | undefined {
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

    private createDragonInterface(): void {
        const panelX = this.scene.scale.width / 2;
        const panelY = 46;
        const hpBarX = panelX - 28;
        const hpBarY = panelY + 22;

        this.scene.add.rectangle(panelX, panelY, 360, 74, COLORS.bossPanel);
        this.dragonAvatar = this.scene.add.circle(panelX - 140, panelY, 22, COLORS.bossHp);
        this.scene.add.text(panelX - 140, panelY, 'D', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff'
        }).setOrigin(0.5);
        this.scene.add.text(panelX - 105, panelY - 17, 'Dragão', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff'
        });
        this.dragonHpText = this.scene.add.text(panelX - 105, panelY + 5, '', {
            fontFamily: 'Arial', fontSize: 16, color: '#ffffff'
        });
        this.scene.add.rectangle(hpBarX, hpBarY, 190, 10, COLORS.hpBackground).setOrigin(0, 0.5);
        this.dragonHpBar = this.scene.add.rectangle(hpBarX, hpBarY, 190, 10, COLORS.bossHp).setOrigin(0, 0.5);
        this.furyText = this.scene.add.text(panelX + 72, panelY - 17, '', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#f0b429'
        });
    }

    private createHeroInterface(): void {
        const panelX = this.scene.scale.width - 118;
        const panelY = 46;
        const hpBarX = panelX - 78;
        const hpBarY = panelY + 22;

        this.heroPanel = this.scene.add.rectangle(panelX, panelY, 204, 74, COLORS.heroPanel);
        this.scene.add.text(panelX - 78, panelY - 25, 'HERÓI', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
        });
        this.heroHpText = this.scene.add.text(panelX - 78, panelY - 5, '', {
            fontFamily: 'Arial', fontSize: 15, color: '#ffffff'
        });
        this.scene.add.rectangle(hpBarX, hpBarY, 156, 10, COLORS.hpBackground).setOrigin(0, 0.5);
        this.heroHpBar = this.scene.add.rectangle(hpBarX, hpBarY, 156, 10, COLORS.heroHp).setOrigin(0, 0.5);
    }

    private createDamageHistory(boardX: number, boardY: number, boardSize: number): void {
        const panelX = boardX + boardSize + 104;
        const panelY = boardY + boardSize / 2;

        this.scene.add.rectangle(panelX, panelY, 192, 220, COLORS.panel);
        this.scene.add.text(panelX, panelY - 88, 'Histórico de dano', {
            fontFamily: 'Arial Black', fontSize: 15, color: '#ffffff'
        }).setOrigin(0.5);
        this.damageHistoryText = this.scene.add.text(panelX - 78, panelY - 62, 'Nenhum dano causado.', {
            fontFamily: 'Arial', fontSize: 14, color: '#ffffff', lineSpacing: 6
        });
    }

    private createRepositionInterface(onRepositionRequest: () => void): void {
        const panelX = 118;
        const panelY = 46;

        this.scene.add.rectangle(panelX, panelY, 204, 74, COLORS.repositionPanel);
        this.repositionText = this.scene.add.text(panelX, panelY - 17, '', {
            fontFamily: 'Arial', fontSize: 15, color: '#ffffff'
        }).setOrigin(0.5);
        this.repositionButton = this.scene.add.rectangle(panelX, panelY + 16, 158, 25, COLORS.button)
            .setInteractive({ useHandCursor: true });
        this.repositionButtonText = this.scene.add.text(panelX, panelY + 16, '', {
            fontFamily: 'Arial Black', fontSize: 13, color: '#ffffff'
        }).setOrigin(0.5);
        this.repositionButton.on('pointerdown', onRepositionRequest);
    }
}
