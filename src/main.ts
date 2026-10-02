import StartGame from './game/main';
import { installThickerSynergyLines } from './game/synergies/SynergyLineStyle';
import { installHealSynergyVfx } from './game/vfx/HealSynergyVfx';
import { installPoisonCloudSynergyVfx } from './game/vfx/PoisonCloudSynergyVfx';
import { installSlashSynergyVfx } from './game/vfx/SlashSynergyVfx';
import { installRogueHitSparkVfx } from './game/vfx/RogueHitSparkVfx';

installThickerSynergyLines();
installHealSynergyVfx();
installPoisonCloudSynergyVfx();
installSlashSynergyVfx();
installRogueHitSparkVfx();

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda o contêiner existir no DOM antes de o Phaser criar e anexar o canvas.
    StartGame('game-container');

});
