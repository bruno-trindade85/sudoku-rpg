# Sudoku RPG — Game Design Document (GDD)

> **Status:** MVP em desenvolvimento  
> **Gênero:** Puzzle / RPG / Estratégia / Roguelite  
> **Plataforma inicial:** Web  
> **Tecnologias:** Phaser + TypeScript

---

# 1. Visão Geral

**Sudoku RPG** é um jogo que combina a lógica do Sudoku com combate RPG e elementos estratégicos.

O campo de batalha utiliza uma grade **9×9**, seguindo as regras fundamentais de um Sudoku tradicional:

- Cada linha deve conter os 9 símbolos/classes sem repetição.
- Cada coluna deve conter os 9 símbolos/classes sem repetição.
- Cada bloco 3×3 deve conter os 9 símbolos/classes sem repetição.

Entretanto, no lugar dos números tradicionais de `1 a 9`, o jogador utiliza **personagens/classes de RPG**.

Assim, resolver o Sudoku também representa posicionar unidades no campo de batalha.

---

# 2. Conceito Central

Internamente, o jogo continua utilizando os valores:

```text
1 2 3 4 5 6 7 8 9
```

Porém, esses números não precisam ser apresentados ao jogador.

Cada número representa uma das nove classes/personagens disponíveis naquela partida.

Exemplo:

```text
1 → Guerreiro
2 → Arqueiro
3 → Mago
4 → Clérigo
5 → Ladino
6 → Paladino
7 → Druida
8 → Bárbaro
9 → Necromante
```

Essa associação é interna.

Visualmente, o jogador interage com os personagens e não com os números.

---

# 3. Aleatoriedade das Classes

## 3.1 MVP

Durante o MVP serão utilizadas sempre as mesmas **9 classes/personagens**.

Entretanto, a associação entre classe e número interno será embaralhada a cada nova partida.

### Partida A

```text
1 → Guerreiro
2 → Arqueiro
3 → Mago
...
```

### Partida B

```text
1 → Mago
2 → Guerreiro
3 → Arqueiro
...
```

Portanto, nenhuma classe possui permanentemente um número específico.

O número existe apenas como representação lógica interna do Sudoku.

---

# 4. Sistema de Sudoku

Cada batalha utiliza um Sudoku válido com:

- grade 9×9;
- solução válida;
- solução única;
- dificuldade previamente determinada;
- pistas iniciais;
- posições vazias que serão preenchidas durante a batalha.

O Sudoku funciona simultaneamente como:

- puzzle;
- campo de batalha;
- sistema de posicionamento das unidades;
- base para ataques;
- base para combos e sinergias.

---

# 5. Geração dos Tabuleiros

O jogo não precisa gerar e analisar completamente um novo Sudoku durante uma batalha.

A estratégia planejada é trabalhar com **Sudokus-base previamente validados**.

Fluxo:

```text
Sudoku-base
    ↓
Solução única previamente validada
    ↓
Dificuldade previamente classificada
    ↓
Transformações válidas
    ↓
Embaralhamento das classes
    ↓
Tabuleiro da batalha
```

Isso evita processamento desnecessário durante o gameplay e garante que o tabuleiro utilizado possui a dificuldade esperada.

---

# 6. Variações de um Sudoku

Um Sudoku-base pode gerar diversas variações sem alterar sua estrutura lógica fundamental.

Entre as transformações possíveis estão:

- troca global dos símbolos;
- troca válida de linhas;
- troca válida de colunas;
- troca de grupos de linhas;
- troca de grupos de colunas;
- rotação;
- espelhamento.

Essas operações permitem gerar uma quantidade muito grande de apresentações diferentes a partir de um conjunto relativamente pequeno de Sudokus-base.

---

# 7. Sistema de Dificuldade do Sudoku

O jogo possuirá cinco níveis principais:

```text
Fácil
  ↓
Normal
  ↓
Difícil
  ↓
Elite
  ↓
Boss
```

A dificuldade não será determinada exclusivamente pela quantidade de pistas existentes no tabuleiro.

O principal critério será a **complexidade lógica necessária para resolver o Sudoku**.

---

# 8. Técnicas de Sudoku por Dificuldade

## 8.1 Fácil

Técnicas:

- Naked Single;
- Hidden Single.

### Naked Single

Uma determinada casa possui apenas uma possibilidade válida.

### Hidden Single

Uma classe possui apenas uma posição possível dentro de determinada linha, coluna ou bloco 3×3.

### Objetivo

Introduzir o jogador ao sistema e permitir resolução relativamente rápida.

---

# 9. Normal

> **Dificuldade padrão do MVP.**

Técnicas:

- Naked Single;
- Hidden Single;
- Locked Candidates;
- Naked Pair.

### Locked Candidates

Quando determinado candidato dentro de um bloco 3×3 está restrito a uma mesma linha ou coluna, permitindo eliminar esse candidato de outras posições relacionadas.

### Naked Pair

Duas casas de uma mesma unidade possuem exatamente os mesmos dois candidatos.

Exemplo:

```text
Casa A → Guerreiro / Mago
Casa B → Guerreiro / Mago
```

Isso significa que essas duas classes obrigatoriamente ocuparão essas duas posições, permitindo eliminar esses candidatos das outras casas da mesma unidade.

### Objetivo

Ser a dificuldade padrão das batalhas durante o MVP.

O jogador deverá observar o tabuleiro e realizar pequenas deduções, mas não será necessário utilizar técnicas avançadas de Sudoku.

---

# 10. Difícil

Inclui todas as técnicas anteriores e adiciona:

- Hidden Pair;
- Naked Triple;
- Hidden Triple;
- Box/Line Reduction.

### Objetivo

Exigir planejamento maior e análise de múltiplas casas simultaneamente.

---

# 11. Elite

Inclui todas as técnicas anteriores e adiciona:

- X-Wing;
- XY-Wing;
- Swordfish;
- Coloring.

### Objetivo

Criar encontros que exijam domínio significativo da lógica do Sudoku.

Esses tabuleiros poderão ser utilizados principalmente contra inimigos especiais ou encontros de maior dificuldade.

---

# 12. Boss

Inclui todas as técnicas anteriores e pode exigir:

- Chains;
- AIC — Alternating Inference Chains;
- Forcing Chains;
- combinação de múltiplas técnicas avançadas.

O nível Boss não precisa possuir uma técnica exclusiva.

Sua característica principal é exigir sequências de raciocínio mais complexas e combinações de técnicas.

Exemplo:

```text
Naked Pair
    ↓
Locked Candidate
    ↓
X-Wing
    ↓
Hidden Single
    ↓
XY-Wing
    ↓
Chain
```

---

# 13. Regra de Classificação

A dificuldade de um Sudoku não será definida apenas pela quantidade de pistas.

Um tabuleiro será classificado principalmente pela **técnica mais avançada necessária para resolvê-lo completamente**.

Classificação planejada:

| Dificuldade | Técnicas máximas necessárias |
|---|---|
| **Fácil** | Naked Single / Hidden Single |
| **Normal** | Locked Candidates / Naked Pair |
| **Difícil** | Hidden Pair / Naked Triple / Hidden Triple / Box-Line Reduction |
| **Elite** | X-Wing / XY-Wing / Swordfish / Coloring |
| **Boss** | Chains / AIC / Forcing Chains / combinações avançadas |

Os limites poderão ser ajustados após testes de gameplay.

---

# 14. Quantidade de Pistas

A quantidade de pistas funciona como um parâmetro auxiliar, e não como definição absoluta da dificuldade.

Faixas iniciais para testes:

| Dificuldade | Pistas aproximadas |
|---|---:|
| Fácil | 40–46 |
| Normal | 34–39 |
| Difícil | 29–33 |
| Elite | 25–28 |
| Boss | aproximadamente 22–26 |

Esses valores não são regras definitivas.

Dois Sudokus com a mesma quantidade de pistas podem possuir dificuldades completamente diferentes.

---

# 15. Dificuldade do Sudoku × Dificuldade do Combate

A dificuldade lógica do Sudoku deve permanecer separada da dificuldade provocada pelo inimigo.

Conceitualmente:

```text
Dificuldade da batalha
        =
Dificuldade do Sudoku
        +
Características do inimigo
        +
Modificadores da batalha
```

Isso permitirá futuramente que dois inimigos utilizem Sudokus da mesma dificuldade, mas produzam batalhas completamente diferentes.

Exemplo:

```text
Sudoku Normal
+
Inimigo simples
=
Batalha relativamente tranquila
```

Enquanto:

```text
Sudoku Normal
+
Inimigo com habilidades especiais
=
Batalha mais complexa
```

---

# 16. Habilidades dos Inimigos

Futuramente, inimigos poderão interferir diretamente no tabuleiro.

Possibilidades:

- bloquear temporariamente casas;
- ocultar pistas;
- afetar linhas;
- afetar colunas;
- afetar blocos 3×3;
- aplicar penalidades;
- modificar condições de combate;
- criar objetivos temporários;
- reagir ao posicionamento de determinadas classes.

Essas habilidades não alteram necessariamente a classificação lógica original do Sudoku.

Elas pertencem à camada de **combate**.

---

# 17. Bosses

Bosses poderão combinar:

```text
Sudoku mais complexo
+
Habilidades exclusivas
+
Mudanças de fase
+
Interferências no tabuleiro
```

Um Boss poderá possuir diferentes fases conforme sua vida diminui.

Exemplo conceitual:

```text
100% HP
↓
Fase 1

70% HP
↓
Nova habilidade

40% HP
↓
Nova interferência no tabuleiro

15% HP
↓
Fase final
```

Isso permite que Bosses alterem a dinâmica da batalha sem depender exclusivamente de aumentos de HP ou dano.

---

# 18. Configuração do MVP

Para a primeira versão jogável:

```text
Dificuldade: NORMAL

Sudoku:
✓ 9×9
✓ solução única
✓ previamente validado
✓ Sudoku-base aleatório
✓ transformações válidas
✓ aproximadamente 34–39 pistas
✓ Naked Single
✓ Hidden Single
✓ Locked Candidates
✓ Naked Pair

Classes:
✓ mesmas 9 classes
✓ associação aleatória a cada partida

Combate:
✓ sistema atual de unidades
✓ posicionamento no tabuleiro
✓ ataques
✓ sinergias
```

---

# 19. Fluxo de uma Nova Partida no MVP

```text
NOVA PARTIDA
      ↓
Selecionar Sudoku-base NORMAL
      ↓
Aplicar transformação válida aleatória
      ↓
Sortear associação das 9 classes
      ↓
Carregar pistas iniciais
      ↓
Montar tabuleiro
      ↓
Iniciar batalha
```

Cada nova execução deverá produzir uma configuração visualmente diferente, mantendo a mesma faixa de dificuldade lógica.

---

# 20. Princípios de Design

O sistema deverá seguir alguns princípios:

**1. Sudoku primeiro**

Toda configuração precisa continuar sendo um Sudoku válido.

**2. Solução única**

O jogador nunca deverá encontrar um tabuleiro ambíguo.

**3. Dificuldade controlável**

O jogo precisa saber previamente qual dificuldade está sendo apresentada.

**4. Aleatoriedade controlada**

Aleatoriedade não pode quebrar as regras do Sudoku.

**5. Separação entre puzzle e RPG**

A dificuldade lógica do Sudoku e a dificuldade do combate devem ser sistemas independentes que podem trabalhar em conjunto.

**6. Variedade**

Mesmo utilizando a mesma dificuldade, diferentes partidas devem apresentar tabuleiros e disposições de personagens diferentes.

---

# 21. Estado Atual da Decisão de Design

Para o MVP, está definido:

> **Todas as partidas utilizarão inicialmente Sudokus de dificuldade NORMAL.**

Cada nova partida deverá selecionar uma configuração diferente do Sudoku e realizar uma nova associação entre os nove símbolos internos e as nove classes existentes.

As dificuldades:

```text
Fácil → Normal → Difícil → Elite → Boss
```

ficarão previstas na arquitetura desde o início, mesmo que somente **Normal** esteja ativo na primeira versão.

---

# 22. Pontos a Definir

Os seguintes sistemas ainda serão detalhados durante o desenvolvimento:

- lista definitiva das 9 classes;
- habilidades individuais das classes;
- sistema definitivo de sinergias;
- cálculo de dano;
- relação entre combos de Sudoku e ataques;
- progressão do jogador;
- progressão dos inimigos;
- habilidades dos inimigos;
- sistema de Elite;
- mecânicas específicas de Boss;
- geração/classificação automática dos Sudokus;
- quantidade final de Sudokus-base por dificuldade;
- interface para candidatos possíveis;
- feedback visual para jogadas válidas e inválidas;
- sistema de recompensa;
- progressão roguelite;
- condições de vitória e derrota.

---

# 23. Medidas Oficiais do Tabuleiro

As artes personalizadas do tabuleiro devem seguir as medidas atualmente utilizadas pela cena principal do jogo.

| Elemento | Medida |
|---|---:|
| Canvas do jogo | **1920 × 1080 px** |
| Grade lógica | **9 × 9** |
| Tabuleiro completo | **828 × 828 px** |
| Cada célula | **92 × 92 px** |
| Cada região 3×3 | **276 × 276 px** |
| Linhas internas das células | **2 px** |
| Linhas principais das regiões 3×3 | **5 px** |

### Coordenadas das divisões

Para criar uma arte que se encaixe exatamente no grid, as divisões verticais e horizontais devem ocorrer em:

```text
0
92
184
276
368
460
552
644
736
828
```

As divisões principais dos blocos 3×3 ficam em:

```text
0
276
552
828
```

### Posição do tabuleiro no canvas 1920×1080

O tabuleiro é centralizado horizontalmente e deslocado 45 px para cima em relação ao centro vertical.

```text
X inicial: 546 px
Y inicial: 81 px
X final: 1374 px
Y final: 909 px
```

### Padrão para criação de novos tabuleiros

Ao criar somente a arte do tabuleiro, utilizar preferencialmente:

```text
Tamanho: 828 × 828 px
Grade: 9 × 9
Célula: 92 × 92 px
Região 3×3: 276 × 276 px
```

Esse padrão deve ser mantido nos backgrounds/tabuleiros personalizados para garantir alinhamento com as zonas interativas e com as unidades posicionadas pelo Phaser.

---

> **Nota de desenvolvimento:** Este documento representa o estado atual do design e deverá ser atualizado conforme as mecânicas forem testadas e validadas durante o desenvolvimento do MVP.
