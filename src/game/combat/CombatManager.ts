const DRAGON_MAX_HP = 500;
const DRAGON_MAX_FURY = 5;
const DRAGON_NORMAL_ATTACK_DAMAGE = 10;
const REGION_BASE_DAMAGE = 50;

export type FuryIncreaseResult = {
    furyAfterIncrease: number;
    heroDamage: number;
};

export class CombatManager {
    private dragonCurrentHp = DRAGON_MAX_HP;
    private dragonFury = 0;

    getDragonCurrentHp(): number {
        return this.dragonCurrentHp;
    }

    getDragonMaxHp(): number {
        return DRAGON_MAX_HP;
    }

    isDragonDefeated(): boolean {
        return this.dragonCurrentHp <= 0;
    }

    damageDragon(amount: number): void {
        this.dragonCurrentHp = Math.max(0, this.dragonCurrentHp - amount);
    }

    getDragonFury(): number {
        return this.dragonFury;
    }

    getDragonMaxFury(): number {
        return DRAGON_MAX_FURY;
    }

    increaseDragonFury(): FuryIncreaseResult {
        this.dragonFury = Math.min(DRAGON_MAX_FURY, this.dragonFury + 1);
        const furyAfterIncrease = this.dragonFury;
        const heroDamage = furyAfterIncrease === DRAGON_MAX_FURY ? DRAGON_NORMAL_ATTACK_DAMAGE : 0;

        if (heroDamage > 0) {
            this.dragonFury = 0;
        }

        return { furyAfterIncrease, heroDamage };
    }

    calculateRegionDamage(synergyDamageBonus: number): number {
        return REGION_BASE_DAMAGE + synergyDamageBonus;
    }

    attackDragonFromRegion(synergyDamageBonus: number): number {
        const damage = this.calculateRegionDamage(synergyDamageBonus);
        this.damageDragon(damage);
        return damage;
    }

    reset(): void {
        this.dragonCurrentHp = DRAGON_MAX_HP;
        this.dragonFury = 0;
    }
}
