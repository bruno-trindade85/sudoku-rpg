import { GRID_SIZE, REGION_SIZE, type BoardUnit } from './BoardState';
import type { UnitType } from '../units/UnitConfig';

export type Board = ReadonlyMap<number, BoardUnit>;

export type InitialBoardClue = {
    cellIndex: number;
    unit: BoardUnit;
};

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

    for (const [cellIndex, unit] of board) {
        if (ignoredCellIndices.has(cellIndex) || unit.type !== unitType) {
            continue;
        }

        const placedRow = Math.floor(cellIndex / GRID_SIZE);
        const placedColumn = cellIndex % GRID_SIZE;
        if (placedRow === row || placedColumn === column) {
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
    regionColumn: number
): boolean {
    const firstRow = regionRow * REGION_SIZE;
    const firstColumn = regionColumn * REGION_SIZE;

    for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
        for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
            const unit = board.get(row * GRID_SIZE + column);

            if (!unit) {
                return false;
            }
        }
    }

    return true;
}

export function generateInitialBoardClues(
    unitTypes: readonly UnitType[],
    clueCount: number
): InitialBoardClue[] {
    if (unitTypes.length !== GRID_SIZE) {
        throw new Error(`Expected ${GRID_SIZE} unit types to generate board clues.`);
    }

    const solvedBoard = new Map<number, BoardUnit>();
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let column = 0; column < GRID_SIZE; column++) {
            const unitTypeIndex = (row * REGION_SIZE + Math.floor(row / REGION_SIZE) + column) % GRID_SIZE;
            solvedBoard.set(row * GRID_SIZE + column, { type: unitTypes[unitTypeIndex] });
        }
    }

    const clueBoard = new Map<number, BoardUnit>();
    const cluesPerRegion = new Map<number, number>();
    for (const cellIndex of shuffle([...solvedBoard.keys()])) {
        if (clueBoard.size === clueCount) {
            break;
        }

        const unit = solvedBoard.get(cellIndex);
        if (!unit) {
            continue;
        }

        const row = Math.floor(cellIndex / GRID_SIZE);
        const column = cellIndex % GRID_SIZE;
        const regionIndex = getRegionIndex(row, column);

        // Pistas não devem completar uma região antes da primeira jogada do jogador.
        if ((cluesPerRegion.get(regionIndex) ?? 0) >= 4) {
            continue;
        }

        if (canPlace(clueBoard, unit.type, row, column)) {
            clueBoard.set(cellIndex, unit);
            cluesPerRegion.set(regionIndex, (cluesPerRegion.get(regionIndex) ?? 0) + 1);
        }
    }

    if (clueBoard.size !== clueCount) {
        throw new Error(`Unable to generate ${clueCount} valid board clues.`);
    }

    return [...clueBoard.entries()].map(([cellIndex, unit]) => ({ cellIndex, unit }));
}

function shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}
