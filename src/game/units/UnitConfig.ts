export const UNIT_IDS = {
    mage: 'mage',
    archer: 'archer',
    paladin: 'paladin',
    rogue: 'rogue',
    cleric: 'cleric',
    barbarian: 'barbarian',
    druid: 'druid',
    darkSorcerer: 'dark-sorcerer',
    summoner: 'summoner'
} as const;

export type UnitType = typeof UNIT_IDS[keyof typeof UNIT_IDS];

export const UNIT_TEXTURES: Readonly<Record<UnitType, string>> = {
    [UNIT_IDS.mage]: 'mage',
    [UNIT_IDS.archer]: 'archer',
    [UNIT_IDS.paladin]: 'paladin',
    [UNIT_IDS.rogue]: 'rogue',
    [UNIT_IDS.cleric]: 'cleric',
    [UNIT_IDS.barbarian]: 'barbarian',
    [UNIT_IDS.druid]: 'druid',
    [UNIT_IDS.darkSorcerer]: 'dark-sorcerer',
    [UNIT_IDS.summoner]: 'summoner'
};

export const UNIT_SPRITE_FLIP_X: Readonly<Record<UnitType, boolean>> = {
    [UNIT_IDS.mage]: true,
    [UNIT_IDS.archer]: true,
    [UNIT_IDS.paladin]: true,
    [UNIT_IDS.rogue]: false,
    [UNIT_IDS.cleric]: false,
    [UNIT_IDS.barbarian]: false,
    [UNIT_IDS.druid]: false,
    [UNIT_IDS.darkSorcerer]: true,
    [UNIT_IDS.summoner]: false
};

export type CharacterType = {
    id: UnitType;
    name: string;
    symbol: string;
    color: number;
};

export const CHARACTER_TYPES: CharacterType[] = [
    { id: UNIT_IDS.mage, name: 'Mago', symbol: 'M', color: 0x7b5cff },
    { id: UNIT_IDS.archer, name: 'Arqueiro', symbol: 'A', color: 0x4caf50 },
    { id: UNIT_IDS.paladin, name: 'Paladino', symbol: 'P', color: 0xe5b94d },
    { id: UNIT_IDS.rogue, name: 'Ladino', symbol: 'L', color: 0x65718a },
    { id: UNIT_IDS.cleric, name: 'Clérigo', symbol: 'C', color: 0x2563eb },
    { id: UNIT_IDS.barbarian, name: 'Bárbaro', symbol: 'B', color: 0xcf5c4c },
    { id: UNIT_IDS.druid, name: 'Druida', symbol: 'D', color: 0x749b49 },
    { id: UNIT_IDS.darkSorcerer, name: 'Feiticeiro Sombrio', symbol: 'F', color: 0x663b83 },
    { id: UNIT_IDS.summoner, name: 'Invocador', symbol: 'I', color: 0x3aa8b8 }
];
