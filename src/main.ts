import StartGame from './game/main';
import { installThickerSynergyLines } from './game/synergies/SynergyLineStyle';

installThickerSynergyLines();

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda o contêiner existir no DOM antes de o Phaser criar e anexar o canvas.
    StartGame('game-container');

});
