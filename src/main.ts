import StartGame from './game/main';
import { installThickerSynergyLines } from './game/synergies/SynergyLineStyle';
import { installHealSynergyVfx } from './game/vfx/HealSynergyVfx';
import { installPoisonCloudSynergyVfx } from './game/vfx/PoisonCloudSynergyVfx';

installThickerSynergyLines();
installHealSynergyVfx();
installPoisonCloudSynergyVfx();

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda o contêiner existir no DOM antes de o Phaser criar e anexar o canvas.
    StartGame('game-container');

});
