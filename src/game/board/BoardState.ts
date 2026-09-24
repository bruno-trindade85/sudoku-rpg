import type { UnitType } from '../units/UnitConfig';

export const GRID_SIZE = 9;
export const REGION_SIZE = 3;

export type BoardUnit = {
    type: UnitType;
};

export type RegionState = {
    isCurrentlyComplete: boolean;
    hasAttacked: boolean;
};

export type RegionCell = {
    cellIndex: number;
    row: number;
    column: number;
    unit: BoardUnit | undefined;
};

export class BoardState {
    private readonly cells = new Map<number, BoardUnit>();
    private readonly regions = new Map<number, RegionState>();

    constructor() {
        this.reset();
    }

    getCells(): ReadonlyMap<number, BoardUnit> {
        return this.cells;
    }

    getCell(cellIndex: number): BoardUnit | undefined {
        return this.cells.get(cellIndex);
    }

    setCell(cellIndex: number, unit: BoardUnit): void {
        this.cells.set(cellIndex, unit);
    }

    removeCell(cellIndex: number): void {
        this.cells.delete(cellIndex);
    }

    moveOrSwap(sourceCell: number, targetCell: number): void {
        const movingUnit = this.cells.get(sourceCell);
        const targetUnit = this.cells.get(targetCell);

        if (!movingUnit || sourceCell === targetCell) {
            return;
        }

        this.cells.set(targetCell, movingUnit);

        if (targetUnit) {
            this.cells.set(sourceCell, targetUnit);
        } else {
            this.cells.delete(sourceCell);
        }
    }

    getRegion(regionRow: number, regionColumn: number): RegionCell[] {
        const cells: RegionCell[] = [];
        const firstRow = regionRow * REGION_SIZE;
        const firstColumn = regionColumn * REGION_SIZE;

        for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
            for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
                const cellIndex = row * GRID_SIZE + column;
                cells.push({ cellIndex, row, column, unit: this.cells.get(cellIndex) });
            }
        }

        return cells;
    }

    getRegionState(regionIndex: number): Readonly<RegionState> {
        const regionState = this.regions.get(regionIndex);

        if (!regionState) {
            throw new Error(`Invalid region index: ${regionIndex}`);
        }

        return regionState;
    }

    setRegionComplete(regionIndex: number, isCurrentlyComplete: boolean): void {
        const regionState = this.regions.get(regionIndex);

        if (regionState) {
            regionState.isCurrentlyComplete = isCurrentlyComplete;
        }
    }

    markRegionAttacked(regionIndex: number): void {
        const regionState = this.regions.get(regionIndex);

        if (regionState) {
            regionState.hasAttacked = true;
        }
    }

    reset(): void {
        this.cells.clear();
        this.regions.clear();

        for (let regionIndex = 0; regionIndex < REGION_SIZE * REGION_SIZE; regionIndex++) {
            this.regions.set(regionIndex, { isCurrentlyComplete: false, hasAttacked: false });
        }
    }
}
