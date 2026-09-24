import { GRID_SIZE, REGION_SIZE, type BoardUnit } from '../board/BoardState';
import { UNIT_IDS, type UnitType } from '../units/UnitConfig';

export type SynergyId = 'arcane-arrow' | 'tactical-maneuver' | 'natures-blessing';

export type SynergyDefinition = {
    id: SynergyId;
    name: string;
    unitTypes: readonly [UnitType, UnitType];
    bonusDamage: number;
    repositionments: number;
    healing: number;
    feedbackText: string;
};

export type FormedSynergy = {
    definition: SynergyDefinition;
    pair: readonly [number, number];
    regionRow: number;
    regionColumn: number;
};

const SYNERGY_DEFINITIONS: readonly SynergyDefinition[] = [
    {
        id: 'arcane-arrow',
        name: 'Flecha Arcana',
        unitTypes: [UNIT_IDS.mage, UNIT_IDS.archer],
        bonusDamage: 10,
        repositionments: 0,
        healing: 0,
        feedbackText: '+10 DANO'
    },
    {
        id: 'tactical-maneuver',
        name: 'Manobra Tática',
        unitTypes: [UNIT_IDS.paladin, UNIT_IDS.barbarian],
        bonusDamage: 0,
        repositionments: 1,
        healing: 0,
        feedbackText: '+1 REPOSICIONAMENTO'
    },
    {
        id: 'natures-blessing',
        name: 'Bênção da Natureza',
        unitTypes: [UNIT_IDS.cleric, UNIT_IDS.druid],
        bonusDamage: 0,
        repositionments: 0,
        healing: 10,
        feedbackText: '+10 HP'
    }
];

type LocatedUnit = {
    cellIndex: number;
    row: number;
    column: number;
    unit: BoardUnit;
};

export function areOrthogonallyAdjacent(first: LocatedUnit, second: LocatedUnit): boolean {
    return Math.abs(first.row - second.row) + Math.abs(first.column - second.column) === 1;
}

export function getFormedSynergiesInRegion(
    board: ReadonlyMap<number, BoardUnit>,
    regionRow: number,
    regionColumn: number
): FormedSynergy[] {
    const units = getRegionUnits(board, regionRow, regionColumn);
    const formedSynergies: FormedSynergy[] = [];

    for (const definition of SYNERGY_DEFINITIONS) {
        const pairs = getAdjacentPairs(units, definition.unitTypes);

        for (const [first, second] of pairs) {
            formedSynergies.push({
                definition,
                pair: [first.cellIndex, second.cellIndex],
                regionRow,
                regionColumn
            });
        }
    }

    return formedSynergies;
}

function getAdjacentPairs(
    units: readonly LocatedUnit[],
    unitTypes: readonly [UnitType, UnitType]
): Array<readonly [LocatedUnit, LocatedUnit]> {
    const firstUnits = shuffle(units.filter((entry) => entry.unit.type === unitTypes[0]));
    const matchedFirstBySecond = new Map<number, LocatedUnit>();

    for (const first of firstUnits) {
        const visitedSecondCells = new Set<number>();
        findAugmentingPair(first, units, unitTypes[1], matchedFirstBySecond, visitedSecondCells);
    }

    return [...matchedFirstBySecond.entries()].map(([secondCellIndex, first]) => {
        const second = units.find((entry) => entry.cellIndex === secondCellIndex);

        if (!second) {
            throw new Error('Matched synergy unit was not found in its region.');
        }

        return [first, second];
    });
}

function findAugmentingPair(
    first: LocatedUnit,
    units: readonly LocatedUnit[],
    secondUnitType: UnitType,
    matchedFirstBySecond: Map<number, LocatedUnit>,
    visitedSecondCells: Set<number>
): boolean {
    const adjacentSeconds = shuffle(units.filter((candidate) =>
        candidate.unit.type === secondUnitType && areOrthogonallyAdjacent(first, candidate)
    ));

    for (const second of adjacentSeconds) {
        if (visitedSecondCells.has(second.cellIndex)) {
            continue;
        }

        visitedSecondCells.add(second.cellIndex);
        const matchedFirst = matchedFirstBySecond.get(second.cellIndex);

        if (!matchedFirst || findAugmentingPair(matchedFirst, units, secondUnitType, matchedFirstBySecond, visitedSecondCells)) {
            matchedFirstBySecond.set(second.cellIndex, first);
            return true;
        }
    }

    return false;
}

function shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}

export function getAllFormedSynergies(board: ReadonlyMap<number, BoardUnit>): FormedSynergy[] {
    const formedSynergies: FormedSynergy[] = [];

    for (let regionRow = 0; regionRow < REGION_SIZE; regionRow++) {
        for (let regionColumn = 0; regionColumn < REGION_SIZE; regionColumn++) {
            formedSynergies.push(...getFormedSynergiesInRegion(board, regionRow, regionColumn));
        }
    }

    return formedSynergies;
}

function getRegionUnits(
    board: ReadonlyMap<number, BoardUnit>,
    regionRow: number,
    regionColumn: number
): LocatedUnit[] {
    const units: LocatedUnit[] = [];
    const firstRow = regionRow * REGION_SIZE;
    const firstColumn = regionColumn * REGION_SIZE;

    for (let row = firstRow; row < firstRow + REGION_SIZE; row++) {
        for (let column = firstColumn; column < firstColumn + REGION_SIZE; column++) {
            const cellIndex = row * GRID_SIZE + column;
            const unit = board.get(cellIndex);

            if (unit) {
                units.push({ cellIndex, row, column, unit });
            }
        }
    }

    return units;
}
