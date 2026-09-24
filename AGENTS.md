# Project Overview

Este repositório contém um MVP de Sudoku RPG feito com TypeScript, Phaser e Vite. O tabuleiro 9x9 usa nove classes de unidades no lugar dos números. O jogador posiciona e reposiciona unidades respeitando as regras de Sudoku, completa regiões 3x3 para atacar um Dragão e ativa sinergias por adjacência.

## Current Architecture

### `src/game/units/UnitConfig.ts`

Responsável por:

- IDs tipados das nove classes;
- nome, símbolo e cor de cada unidade;
- associação de cada classe à chave do sprite Phaser;
- tipos `UnitType` e `CharacterType`.

Não é responsável por regras de colocação, estado do tabuleiro, sinergias ou objetos Phaser.

### `src/game/board/BoardState.ts`

Responsável por:

- fonte de verdade das unidades nas células;
- movimento e troca lógica de unidades;
- consulta das células de uma região;
- estados `isCurrentlyComplete` e `hasAttacked` das nove regiões;
- reset lógico do tabuleiro e das regiões;
- dimensões estruturais 9x9 e 3x3.

Não é responsável por validar Sudoku, aplicar combate ou renderizar o tabuleiro.

### `src/game/board/BoardValidator.ts`

Responsável por:

- validar célula ocupada e repetição por linha e coluna;
- validar colocação;
- validar o estado final de movimento ou swap, ignorando origem e destino durante a simulação;
- verificar se uma região está completa e válida;
- calcular o índice estrutural de uma região.

Não é responsável por alterar `BoardState`, consumir reposicionamentos ou apresentar feedback.

### `src/game/synergies/SynergyManager.ts`

Responsável por:

- definições e valores das três sinergias atuais;
- regra comum de adjacência ortogonal;
- detecção das sinergias formadas em uma região ou no tabuleiro;
- retorno do par de células que forma cada sinergia.

Não é responsável por `hasAttacked`, aplicar dano, cura, reposicionamentos ou efeitos Phaser.

### `src/game/player/PlayerState.ts`

Responsável por:

- fonte de verdade do HP do Herói;
- dano, cura, limite de HP e derrota lógica;
- fonte de verdade dos créditos de reposicionamento;
- adição, consulta, consumo e reset desses créditos.

Não é responsável por decidir quando uma recompensa ou ataque acontece, nem por UI.

### `src/game/combat/CombatManager.ts`

Responsável por:

- fonte de verdade do HP e da Fúria do Dragão;
- dano e reset do Dragão;
- aumento da Fúria e resolução lógica do ataque normal;
- dano-base de região e soma do bônus recebido do sistema de sinergias.

Não é responsável pelo HP do Herói, pela detecção das sinergias, por `hasAttacked`, HUD ou animações.

### `src/game/ui/GameUI.ts`

Responsável por:

- criar e atualizar o HUD do Dragão, Herói, Fúria e reposicionamentos;
- apresentar o histórico de combate;
- apresentar a derrota e o botão de reinício;
- expor referências visuais necessárias aos efeitos que ainda vivem na cena.

Não é fonte de verdade de nenhum valor lógico e não decide derrota, dano, cura, Fúria ou reset.

### `src/game/scenes/Game.ts`

É o orquestrador da única cena atual. Ele instancia e coordena os módulos acima e atualmente ainda é responsável por:

- criar e renderizar tabuleiro, células, cartas e peças;
- entrada por clique, seleção, drag-and-drop, movimento e swap;
- manter o mapa de objetos visuais das peças (não o estado lógico delas);
- coordenar conclusão e primeiro ataque das regiões;
- aplicar ao `PlayerState` recompensas detectadas pelo `SynergyManager`;
- manter a lista de eventos usada pelo histórico de combate;
- todos os efeitos temporários, pulsos, flashes, shakes, conexões e animações;
- sincronizar as fontes de verdade com `GameUI`;
- coordenar derrota e reinício da cena.

Não adicione automaticamente novas regras de gameplay em `Game.ts`. Primeiro identifique o módulo dono da regra ou do estado. Quando já existir um módulo adequado, implemente a regra nele e deixe `Game.ts` coordenar o fluxo.

### Bootstrap

- `src/main.ts` aguarda o DOM e inicia o jogo.
- `src/game/main.ts` configura Phaser em 1920x1080, escala `FIT`, centralização e a cena `Game`.

## Current Mechanics

- Tabuleiro 9x9 dividido em regiões 3x3.
- Nove classes substituem os números: Mago, Arqueiro, Paladino, Ladino, Clérigo, Bárbaro, Druida, Feiticeiro Sombrio e Invocador.
- Uma classe não pode se repetir na mesma linha ou coluna, mas pode se repetir dentro da mesma região 3x3.
- Colocação válida de uma nova peça concede `+1` Fúria; movimento, swap e tentativa inválida não concedem Fúria.
- Herói: `100` HP máximo e inicial. Dragão: `500` HP máximo e inicial.
- Fúria do Dragão: `0/5`; ao chegar a `5`, causa `10` de dano ao Herói e volta para `0`.
- Região completa causa `50` de dano-base e só realiza seu ataque uma vez. `hasAttacked` persiste mesmo se a região ficar incompleta.
- Reposicionamento válido ou swap consome exatamente um crédito. Tentativa inválida ou cancelamento não consome.
- O jogo aceita colocação e reposicionamento por clique e drag-and-drop.
- HP do Dragão é limitado a zero, mas atualmente não existe fluxo de vitória.

## Current Synergies

As sinergias exigem que o par esteja ortogonalmente adjacente dentro da mesma região 3x3. Diagonal não conta. A detecção pode continuar ativa após o ataque da região, inclusive para indicadores visuais, mas recompensas só são aplicadas durante o primeiro ataque da região.

Uma mesma sinergia pode ser formada diversas vezes na região, desde que cada ocorrência use um par distinto. Quando houver mais de um parceiro ortogonal adjacente elegível, o pareamento é escolhido aleatoriamente.

- **Flecha Arcana:** Mago + Arqueiro; `+10` de dano por par. Duas ocorrências adicionam `+20`, e o ataque total da região passa de `50` para `70`.
- **Manobra Tática:** Paladino + Bárbaro; `+1` crédito de reposicionamento.
- **Bênção da Natureza:** Clérigo + Druida; cura `10` HP, limitada ao máximo de `100`.

As três podem coexistir e são avaliadas independentemente.

## Rules for AI Agents

1. Inspecione o código existente antes de alterar arquitetura ou comportamento.
2. Não duplique estado lógico. Deve existir uma única fonte de verdade para cada valor.
3. Não duplique validações de Sudoku fora de `BoardValidator`.
4. Mantenha regras puras independentes de Phaser sempre que possível.
5. UI apresenta valores; não decide regras de gameplay.
6. Animações e game feel representam resultados; não decidem resultados.
7. Não adicione lógica diretamente em `Game.ts` quando existir módulo responsável.
8. Antes de criar um módulo, verifique se a responsabilidade cabe em um módulo existente.
9. Evite dependências circulares, sobretudo entre módulos de domínio.
10. Não altere mecânicas não relacionadas à tarefa solicitada.
11. Durante refatorações, preserve ordem, valores e comportamento observável dos fluxos.
12. Não use o mapa visual de peças em `Game.ts` como fonte de verdade lógica; consulte `BoardState`.
13. `hasAttacked` pertence a `BoardState`, não a combate ou sinergias.
14. Após alterações relevantes, execute `npx.cmd tsc --noEmit` no Windows e `npm.cmd run build` (ou equivalentes na plataforma).
15. Ao criar uma mecânica, separe, quando necessário, regra/estado, apresentação e efeitos temporários.
16. Não implemente vitória apenas porque o HP do Dragão pode chegar a zero; ela ainda não existe.
17. Preserve alterações não relacionadas já presentes na árvore de trabalho.

## Documentation Maintenance

Quando uma alteração criar ou remover módulos, mover uma fonte de verdade, mudar responsabilidades ou alterar um fluxo arquitetural importante, verifique se `docs/ARCHITECTURE.md` precisa ser atualizado.

Altere `AGENTS.md` somente quando mudarem as instruções, a estrutura ou as convenções relevantes para agentes. Não atualize documentação por mudanças triviais.
