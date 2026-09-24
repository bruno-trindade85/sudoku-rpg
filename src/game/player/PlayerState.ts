const MAX_HERO_HP = 100;

export class PlayerState {
    private currentHeroHp = MAX_HERO_HP;
    private repositionCredits = 0;

    getCurrentHp(): number {
        return this.currentHeroHp;
    }

    getMaxHp(): number {
        return MAX_HERO_HP;
    }

    damage(amount: number): void {
        this.currentHeroHp = Math.max(0, this.currentHeroHp - amount);
    }

    heal(amount: number): void {
        this.currentHeroHp = Math.min(MAX_HERO_HP, this.currentHeroHp + amount);
    }

    isDefeated(): boolean {
        return this.currentHeroHp <= 0;
    }

    getRepositionCredits(): number {
        return this.repositionCredits;
    }

    addRepositionCredits(amount: number): void {
        this.repositionCredits += amount;
    }

    hasRepositionCredit(): boolean {
        return this.repositionCredits > 0;
    }

    consumeRepositionCredit(): boolean {
        if (!this.hasRepositionCredit()) {
            return false;
        }

        this.repositionCredits--;
        return true;
    }

    reset(): void {
        this.currentHeroHp = MAX_HERO_HP;
        this.repositionCredits = 0;
    }
}
