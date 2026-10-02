import { Game as MainGame } from '../scenes/Game';
import { UNIT_IDS, type CharacterType, type UnitType } from '../units/UnitConfig';

const HIT_SPARK_TEXTURES = [
    'rogue-hit-spark-0',
    'rogue-hit-spark-1',
    'rogue-hit-spark-2',
    'rogue-hit-spark-3'
] as const;

const HIT_SPARK_PATHS = [
    'assets/vfx/hit_spark/hit_spark_0.png',
    'assets/vfx/hit_spark/hit_spark_1.png',
    'assets/vfx/hit_spark/hit_spark_2.png',
    'assets/vfx/hit_spark/hit_spark_3.png'
] as const;

const HIT_SPARK_FRAME_MS = 120;
const HIT_SPARK_SIZE = 84;
const HIT_SPARK_Y_OFFSET = 0;
const HIT_SPARK_DEPTH = 9;

type BoardPiece = {
    type: UnitType;
    sprite: Phaser.GameObjects.Image;
};

type RogueHitSparkEffect = {
    sprite: Phaser.GameObjects.Image;
    timer: Phaser.Time.TimerEvent;
};

type MainGamePrototype = {
    preload: (this: MainGame) => void;
    placeCharacter: (this: MainGame, character: CharacterType, x: number, y: number) => BoardPiece;
};

const rogueHitSparkEffects = new WeakMap<Phaser.GameObjects.Image, RogueHitSparkEffect>();

const destroyRogueHitSparkEffect = (effect?: RogueHitSparkEffect) => {
    if (!effect) {
        return;
    }

    effect.timer.remove(false);
    effect.sprite.destroy();
};

export const installRogueHitSparkVfx = () => {
    const prototype = MainGame.prototype as unknown as MainGamePrototype;
    const originalPreload = prototype.preload;
    const originalPlaceCharacter = prototype.placeCharacter;

    prototype.preload = function (this: MainGame) {
        originalPreload.call(this);

        HIT_SPARK_TEXTURES.forEach((texture, index) => {
            this.load.image(texture, HIT_SPARK_PATHS[index]);
        });
    };

    prototype.placeCharacter = function (
        this: MainGame,
        character: CharacterType,
        x: number,
        y: number
    ): BoardPiece {
        const piece = originalPlaceCharacter.call(this, character, x, y);

        if (character.id !== UNIT_IDS.rogue) {
            return piece;
        }

        let frameIndex = 0;
        const sprite = this.add.image(
            piece.sprite.x,
            piece.sprite.y + HIT_SPARK_Y_OFFSET,
            HIT_SPARK_TEXTURES[frameIndex]
        )
            .setDisplaySize(HIT_SPARK_SIZE, HIT_SPARK_SIZE)
            .setDepth(HIT_SPARK_DEPTH);

        const timer = this.time.addEvent({
            delay: HIT_SPARK_FRAME_MS,
            loop: true,
            callback: () => {
                if (!sprite.active || !piece.sprite.active) {
                    timer.remove(false);
                    sprite.destroy();
                    return;
                }

                frameIndex = (frameIndex + 1) % HIT_SPARK_TEXTURES.length;
                sprite
                    .setPosition(piece.sprite.x, piece.sprite.y + HIT_SPARK_Y_OFFSET)
                    .setTexture(HIT_SPARK_TEXTURES[frameIndex])
                    .setDisplaySize(HIT_SPARK_SIZE, HIT_SPARK_SIZE);
            }
        });

        rogueHitSparkEffects.set(piece.sprite, { sprite, timer });

        piece.sprite.once('destroy', () => {
            destroyRogueHitSparkEffect(rogueHitSparkEffects.get(piece.sprite));
            rogueHitSparkEffects.delete(piece.sprite);
        });

        return piece;
    };
};
