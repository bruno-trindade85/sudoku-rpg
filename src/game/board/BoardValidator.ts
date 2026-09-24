import { GRID_SIZE, REGION_SIZE, type BoardUnit } from './BoardState';

export type Board = ReadonlyMap<number, BoardUnit>;

export function getRegionIndex(row: number, column: number): number {
    return Math.floor(row / REGION_SIZE) * REGION_SIZE + Math.floor(column / REGION_SIZE);
}

export function canPlace(
    board: Board,
    unitType: string,
    row: number,
    column: number,
    ignoredCellIndices: ReadonlySet<number> = new Set<number>()
): boolean {
    const targetCell = row * GRID_SIZE + column;

    if (board.has(targetCell) && !ignoredCellIndices.has(targetCell)) {
        return false;
    }

    const targetRegion = getRegionIndex(row, column);

    for (const [cellIndex, unit] of board) {
        if (ignoredCellIndices.has(cellIndex) || unit.type !== unitType) {
            continue;
        }

        const placedRow = Math.floor(cellIndex / GRID_SIZE);
        const placedColumn = cellIndex % GRID_SIZE;
        const placedRegion = getRegionIndex(placedRow, placedColumn);

        if (placedRow === row || placedColumn === column || placedRegion === targetRegion) {
            return false;
        }
    }

    return true;
}

export function canMoveOrSwap(board: Board, sourceCell: number, targetCell: number): boolean {
    const movingUnit = board.get(sourceCell);
    const targetUnit = board.get(targetCell);

    if (!movingUnit || sourceCell === targetCell) {
        return false;
    }

    // As posições de origem e destino são ignoradas para validar o estado final
    // do movimento ou da troca, evitando conflitos com as posições anteriores.
    const ignoredCells = new Set([sourceCell, targetCell]);
    const targetRow = Math.floor(targetCell / GRID_SIZE);
    const targetColumn = targetCell % GRID_SIZE;
    const sourceRow = Math.floor(sourceCell / GRID_SIZE);
    const sourceColumn = sourceCell % GRID_SIZE;

    return canPlace(board, movingUnit.type, targetRow, targetColumn, ignoredCells)
        && (!targetUnit || canPlace(board, targetUnit.type, sourceRow, sourceColumn, ignoredCells));
}

export function isRegionComplete(
    board: Board,
    regionRow: number,
    regionColumn: number,
    requiredUnitTypes: readonly string[]
): boolean {
    const unitTypesInRegion = new Set<string>();
    const firstRow = regionRow * REGION_SIZE;
    const firstColumn = regionColumn * REGION_SIZE;

    for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
        for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
            const unit = board.get(row * GRID_SIZE + column);

            if (!unit) {
                return false;
            }

            unitTypesInRegion.add(unit.type);
        }
    }

    return unitTypesInRegion.size === requiredUnitTypes.length
        && requiredUnitTypes.every((unitType) => unitTypesInRegion.has(unitType));
}
