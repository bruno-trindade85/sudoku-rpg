import normalPuzzleData from '../../data/sudoku/normal.json';
import type { UnitType } from '../units/UnitConfig';

export const SUDOKU_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type SudokuDigit = typeof SUDOKU_DIGITS[number];
export type SudokuCellValue = 0 | SudokuDigit;

export interface SudokuPuzzle {
    id: string;
    difficulty: 'normal';
    clues: number;
    puzzle: readonly SudokuCellValue[];
    solution: readonly SudokuDigit[];
}

export interface GameSudokuState {
    puzzleId: string;
    puzzle: readonly SudokuCellValue[];
    solution: readonly SudokuDigit[];
    digitToUnit: ReadonlyMap<SudokuDigit, UnitType>;
    unitToDigit: ReadonlyMap<UnitType, SudokuDigit>;
}

const EXPECTED_PUZZLE_COUNT = 100;
const CELL_COUNT = 81;
const PREVIOUS_PUZZLE_STORAGE_KEY = 'sudoku-rpg:last-normal-puzzle-id';
const NORMAL_PUZZLES = validateNormalPuzzles(normalPuzzleData);
let previousNormalPuzzleId = readPreviousPuzzleId();

export function getRandomNormalPuzzle(random: () => number = Math.random): SudokuPuzzle {
    const candidates = previousNormalPuzzleId === undefined
        ? NORMAL_PUZZLES
        : NORMAL_PUZZLES.filter((puzzle) => puzzle.id !== previousNormalPuzzleId);
    const selectedPuzzle = candidates[randomIndex(candidates.length, random)];

    previousNormalPuzzleId = selectedPuzzle.id;
    storePreviousPuzzleId(selectedPuzzle.id);
    return selectedPuzzle;
}

export function createNormalSudokuState(
    unitTypes: readonly UnitType[],
    random: () => number = Math.random
): GameSudokuState {
    const selectedPuzzle = getRandomNormalPuzzle(random);
    const shuffledUnits = shuffle(unitTypes, random);

    if (shuffledUnits.length !== SUDOKU_DIGITS.length || new Set(shuffledUnits).size !== SUDOKU_DIGITS.length) {
        throw new Error(`Normal Sudoku requires exactly ${SUDOKU_DIGITS.length} unique unit types.`);
    }

    const digitToUnit = new Map<SudokuDigit, UnitType>();
    const unitToDigit = new Map<UnitType, SudokuDigit>();

    SUDOKU_DIGITS.forEach((digit, index) => {
        const unitType = shuffledUnits[index];
        digitToUnit.set(digit, unitType);
        unitToDigit.set(unitType, digit);
    });

    if (digitToUnit.size !== SUDOKU_DIGITS.length || unitToDigit.size !== SUDOKU_DIGITS.length) {
        throw new Error('The Sudoku digit-to-unit mapping must be a one-to-one permutation.');
    }

    return {
        puzzleId: selectedPuzzle.id,
        puzzle: selectedPuzzle.puzzle,
        solution: selectedPuzzle.solution,
        digitToUnit,
        unitToDigit
    };
}

function validateNormalPuzzles(data: unknown): readonly SudokuPuzzle[] {
    if (!Array.isArray(data) || data.length !== EXPECTED_PUZZLE_COUNT) {
        throw new Error(`Expected exactly ${EXPECTED_PUZZLE_COUNT} Normal Sudoku puzzles.`);
    }

    const puzzleIds = new Set<string>();

    return data.map((rawPuzzle, puzzleIndex) => {
        if (!isRecord(rawPuzzle)) {
            throw new Error(`Invalid Normal Sudoku puzzle at index ${puzzleIndex}.`);
        }

        const { id, difficulty, clues, puzzle, solution } = rawPuzzle;

        if (typeof id !== 'string' || id.length === 0 || puzzleIds.has(id)) {
            throw new Error(`Invalid or duplicated Normal Sudoku id at index ${puzzleIndex}.`);
        }
        if (difficulty !== 'normal') {
            throw new Error(`Puzzle ${id} must use the Normal difficulty.`);
        }
        if (!Number.isInteger(clues)) {
            throw new Error(`Puzzle ${id} has an invalid clue count.`);
        }
        if (!isNumberArray(puzzle) || puzzle.length !== CELL_COUNT || puzzle.some((value) => value < 0 || value > 9)) {
            throw new Error(`Puzzle ${id} must contain exactly ${CELL_COUNT} values from 0 to 9.`);
        }
        if (!isNumberArray(solution) || solution.length !== CELL_COUNT || solution.some((value) => value < 1 || value > 9)) {
            throw new Error(`Solution ${id} must contain exactly ${CELL_COUNT} values from 1 to 9.`);
        }
        if (puzzle.filter((value) => value !== 0).length !== clues) {
            throw new Error(`Puzzle ${id} clue count does not match its filled cells.`);
        }
        if (puzzle.some((value, cellIndex) => value !== 0 && value !== solution[cellIndex])) {
            throw new Error(`Puzzle ${id} contains a clue that differs from its solution.`);
        }

        validateSolvedGrid(id, solution);
        puzzleIds.add(id);

        return Object.freeze({
            id,
            difficulty,
            clues,
            puzzle: Object.freeze([...puzzle]) as readonly SudokuCellValue[],
            solution: Object.freeze([...solution]) as readonly SudokuDigit[]
        });
    });
}

function validateSolvedGrid(puzzleId: string, solution: readonly number[]): void {
    for (let index = 0; index < 9; index++) {
        const row = solution.slice(index * 9, index * 9 + 9);
        const column = Array.from({ length: 9 }, (_, rowIndex) => solution[rowIndex * 9 + index]);
        const regionStartRow = Math.floor(index / 3) * 3;
        const regionStartColumn = (index % 3) * 3;
        const region = Array.from({ length: 9 }, (_, regionIndex) => {
            const rowOffset = Math.floor(regionIndex / 3);
            const columnOffset = regionIndex % 3;
            return solution[(regionStartRow + rowOffset) * 9 + regionStartColumn + columnOffset];
        });

        if (!containsEveryDigit(row) || !containsEveryDigit(column) || !containsEveryDigit(region)) {
            throw new Error(`Puzzle ${puzzleId} has an invalid Sudoku solution.`);
        }
    }
}

function containsEveryDigit(values: readonly number[]): boolean {
    return values.length === SUDOKU_DIGITS.length
        && SUDOKU_DIGITS.every((digit) => values.includes(digit));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => Number.isInteger(item));
}

function readPreviousPuzzleId(): string | undefined {
    try {
        return globalThis.sessionStorage?.getItem(PREVIOUS_PUZZLE_STORAGE_KEY) ?? undefined;
    } catch {
        return undefined;
    }
}

function storePreviousPuzzleId(puzzleId: string): void {
    try {
        globalThis.sessionStorage?.setItem(PREVIOUS_PUZZLE_STORAGE_KEY, puzzleId);
    } catch {
        // A seleção continua funcionando quando o armazenamento do navegador está indisponível.
    }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const selectedIndex = randomIndex(index + 1, random);
        [shuffled[index], shuffled[selectedIndex]] = [shuffled[selectedIndex], shuffled[index]];
    }

    return shuffled;
}

function randomIndex(length: number, random: () => number): number {
    const value = random();

    if (length <= 0 || value < 0 || value >= 1) {
        throw new Error('Random selection requires a value greater than or equal to 0 and less than 1.');
    }

    return Math.floor(value * length);
}
