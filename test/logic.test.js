/**
 * Comprehensive Node.js Unit Tests for ZenSolitaire Logic Engine
 */

const assert = require('assert');
const Solitaire = require('../src/solitaire.js');

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
    failed++;
  }
}

console.log('\nRunning ZenSolitaire Logic Tests...\n');

it('Creates full 52-card standard deck', () => {
  const deck = Solitaire.createDeck();
  assert.strictEqual(deck.length, 52);

  const suits = new Set(deck.map(c => c.suit));
  assert.strictEqual(suits.size, 4);

  for (const suit of ['S', 'H', 'D', 'C']) {
    const suitCards = deck.filter(c => c.suit === suit);
    assert.strictEqual(suitCards.length, 13);
    for (let r = 1; r <= 13; r++) {
      assert.ok(suitCards.some(c => c.rank === r));
    }
  }
});

it('Initializes game with correct Klondike deal layout', () => {
  const game = Solitaire.createGame();
  assert.strictEqual(game.tableau.length, 7);
  assert.strictEqual(game.foundations.length, 4);
  assert.strictEqual(game.waste.length, 0);
  assert.strictEqual(game.stock.length, 24);
  assert.strictEqual(game.score, 0);
  assert.strictEqual(game.moves, 0);

  // Check columns: col 0 has 1 card, col 1 has 2, ..., col 6 has 7
  let totalTableau = 0;
  for (let c = 0; c < 7; c++) {
    const col = game.tableau[c];
    assert.strictEqual(col.length, c + 1);
    totalTableau += col.length;

    // Only top card should be face-up
    for (let r = 0; r < col.length; r++) {
      if (r === col.length - 1) {
        assert.strictEqual(col[r].faceUp, true, `Top card of column ${c} should be face-up`);
      } else {
        assert.strictEqual(col[r].faceUp, false, `Card ${r} of column ${c} should be face-down`);
      }
    }
  }
  assert.strictEqual(totalTableau, 28);
  assert.strictEqual(totalTableau + game.stock.length, 52);
});

it('Handles Draw 1 and Draw 3 modes', () => {
  const g1 = Solitaire.createGame({ drawMode: 1 });
  assert.strictEqual(g1.stock.length, 24);
  const res1 = Solitaire.draw(g1);
  assert.strictEqual(res1.action, 'draw');
  assert.strictEqual(res1.count, 1);
  assert.strictEqual(g1.stock.length, 23);
  assert.strictEqual(g1.waste.length, 1);
  assert.strictEqual(g1.waste[0].faceUp, true);

  const g3 = Solitaire.createGame({ drawMode: 3 });
  const res3 = Solitaire.draw(g3);
  assert.strictEqual(res3.action, 'draw');
  assert.strictEqual(res3.count, 3);
  assert.strictEqual(g3.stock.length, 21);
  assert.strictEqual(g3.waste.length, 3);
});

it('Recycles waste back into stock when stock is exhausted', () => {
  const game = Solitaire.createGame({ drawMode: 1 });
  // Draw all 24 cards
  for (let i = 0; i < 24; i++) {
    Solitaire.draw(game);
  }
  assert.strictEqual(game.stock.length, 0);
  assert.strictEqual(game.waste.length, 24);

  // Set score to test recycle penalty
  game.score = 50;
  const recycleRes = Solitaire.draw(game);
  assert.strictEqual(recycleRes.action, 'recycle');
  assert.strictEqual(game.stock.length, 24);
  assert.strictEqual(game.waste.length, 0);
  assert.strictEqual(game.stock[game.stock.length - 1].faceUp, false);
  assert.strictEqual(game.score, 30); // 50 - 20
});

it('Validates foundation moves correctly', () => {
  const foundation = [];
  const aceSpades = Solitaire.createCard('S', 1, true);
  const twoSpades = Solitaire.createCard('S', 2, true);
  const twoHearts = Solitaire.createCard('H', 2, true);
  const threeSpades = Solitaire.createCard('S', 3, true);

  // Empty foundation accepts only Ace
  assert.strictEqual(Solitaire.canMoveToFoundation(aceSpades, foundation), true);
  assert.strictEqual(Solitaire.canMoveToFoundation(twoSpades, foundation), false);

  foundation.push(aceSpades);
  // Accepts only 2 of Spades next
  assert.strictEqual(Solitaire.canMoveToFoundation(twoSpades, foundation), true);
  assert.strictEqual(Solitaire.canMoveToFoundation(twoHearts, foundation), false);
  assert.strictEqual(Solitaire.canMoveToFoundation(threeSpades, foundation), false);

  foundation.push(twoSpades);
  assert.strictEqual(Solitaire.canMoveToFoundation(threeSpades, foundation), true);
});

it('Validates tableau moves correctly (alternating color descending rank)', () => {
  const emptyCol = [];
  const king = Solitaire.createCard('S', 13, true); // Black King
  const queenRed = Solitaire.createCard('H', 12, true); // Red Queen
  const queenBlack = Solitaire.createCard('C', 12, true); // Black Queen
  const jackBlack = Solitaire.createCard('S', 11, true); // Black Jack

  // Empty column accepts only King
  assert.strictEqual(Solitaire.canMoveToTableau(king, emptyCol), true);
  assert.strictEqual(Solitaire.canMoveToTableau(queenRed, emptyCol), false);

  const column = [king];
  // Under Black King, can place Red Queen but not Black Queen or Black Jack
  assert.strictEqual(Solitaire.canMoveToTableau(queenRed, column), true);
  assert.strictEqual(Solitaire.canMoveToTableau(queenBlack, column), false);
  assert.strictEqual(Solitaire.canMoveToTableau(jackBlack, column), false);

  column.push(queenRed);
  // Under Red Queen, can place Black Jack
  assert.strictEqual(Solitaire.canMoveToTableau(jackBlack, column), true);
});

it('Moves cards between waste, tableau, and foundations', () => {
  const game = Solitaire.createGame();

  // Setup predictable waste: Ace of Spades
  game.waste = [Solitaire.createCard('S', 1, true)];
  const moveWasteToF = Solitaire.moveWasteToFoundation(game, 0); // Foundation 0 = Spades
  assert.strictEqual(moveWasteToF, true);
  assert.strictEqual(game.foundations[0].length, 1);
  assert.strictEqual(game.waste.length, 0);
  assert.strictEqual(game.score, 10);

  // Setup tableau column 0 with a King of Hearts
  game.tableau[0] = [];
  game.waste = [Solitaire.createCard('H', 13, true)];
  const moveWasteToT = Solitaire.moveWasteToTableau(game, 0);
  assert.strictEqual(moveWasteToT, true);
  assert.strictEqual(game.tableau[0].length, 1);
  assert.strictEqual(game.tableau[0][0].rank, 13);
  assert.strictEqual(game.score, 15); // 10 + 5
});

it('Supports moving multi-card sequences in tableau', () => {
  const game = Solitaire.createGame();
  // Column 0: King of Spades
  game.tableau[0] = [Solitaire.createCard('S', 13, true)];

  // Column 1: Face-down card + Red Queen + Black Jack
  const hiddenCard = Solitaire.createCard('D', 5, false);
  const queen = Solitaire.createCard('H', 12, true);
  const jack = Solitaire.createCard('C', 11, true);
  game.tableau[1] = [hiddenCard, queen, jack];

  // Move [queen, jack] from col 1 (index 1) to col 0
  const moved = Solitaire.moveTableauToTableau(game, 1, 1, 0);
  assert.strictEqual(moved, true);
  assert.strictEqual(game.tableau[0].length, 3);
  assert.strictEqual(game.tableau[0][1].rank, 12);
  assert.strictEqual(game.tableau[0][2].rank, 11);

  // Column 1 should now have hiddenCard revealed face-up!
  assert.strictEqual(game.tableau[1].length, 1);
  assert.strictEqual(game.tableau[1][0].faceUp, true);
});

it('Moves card from foundation back to tableau with score penalty', () => {
  const game = Solitaire.createGame();
  game.score = 50;
  // Foundation 1 (Hearts) has Ace and 2
  game.foundations[1] = [
    Solitaire.createCard('H', 1, true),
    Solitaire.createCard('H', 2, true)
  ];
  // Column 0 has 3 of Spades (black 3)
  game.tableau[0] = [Solitaire.createCard('S', 3, true)];

  // Move 2 of Hearts (red 2) from foundation to Column 0
  const moved = Solitaire.moveFoundationToTableau(game, 1, 0);
  assert.strictEqual(moved, true);
  assert.strictEqual(game.foundations[1].length, 1);
  assert.strictEqual(game.tableau[0].length, 2);
  assert.strictEqual(game.score, 35); // 50 - 15
});

it('Detects Auto-Finish readiness and completes the game', () => {
  const game = Solitaire.createGame();
  game.stock = [];
  game.waste = [];

  // All cards face-up in tableau
  game.tableau = [
    [Solitaire.createCard('S', 1, true)],
    [],
    [],
    [],
    [],
    [],
    []
  ];

  assert.strictEqual(Solitaire.isAutoFinishReady(game), true);

  const step = Solitaire.performAutoFinishStep(game);
  assert.strictEqual(step, true);
  assert.strictEqual(game.foundations[0].length, 1);
  assert.strictEqual(game.foundations[0][0].rank, 1);
});

it('Accurately detects winning condition (all 4 foundations filled)', () => {
  const game = Solitaire.createGame();
  assert.strictEqual(Solitaire.isWon(game), false);

  // Fill all 4 foundations with 13 cards each
  for (let f = 0; f < 4; f++) {
    const suit = Solitaire.SUITS[f];
    for (let r = 1; r <= 13; r++) {
      game.foundations[f].push(Solitaire.createCard(suit, r, true));
    }
  }

  assert.strictEqual(Solitaire.isWon(game), true);
});

it('Provides helpful hints when playable moves exist', () => {
  const game = Solitaire.createGame();
  game.waste = [Solitaire.createCard('S', 1, true)]; // Ace of Spades in waste

  const hint = Solitaire.getHint(game);
  assert.ok(hint);
  assert.strictEqual(hint.to.type, 'foundation');
  assert.strictEqual(hint.to.index, 0);
});

it('Undo restores complete previous state', () => {
  const game = Solitaire.createGame();
  const initialStockCount = game.stock.length;
  const initialWasteCount = game.waste.length;

  Solitaire.draw(game);
  assert.strictEqual(game.waste.length, 1);

  const undone = Solitaire.undo(game);
  assert.strictEqual(undone, true);
  assert.strictEqual(game.stock.length, initialStockCount);
  assert.strictEqual(game.waste.length, initialWasteCount);
  assert.strictEqual(game.moves, 0);

  // Secondary undo on empty history returns false
  assert.strictEqual(Solitaire.undo(game), false);
});

it('Serializes and deserializes game state accurately', () => {
  const game = Solitaire.createGame({ drawMode: 3 });
  game.score = 240;
  game.moves = 35;
  game.foundations[0].push(Solitaire.createCard('S', 1, true));

  const json = Solitaire.serialize(game);
  const restored = Solitaire.deserialize(json);

  assert.strictEqual(restored.drawMode, 3);
  assert.strictEqual(restored.score, 240);
  assert.strictEqual(restored.moves, 35);
  assert.strictEqual(restored.foundations[0].length, 1);
  assert.strictEqual(restored.foundations[0][0].id, 'S-1');
});

console.log(`\nResults: ${passed}/${passed + failed} tests passed.\n`);
if (failed > 0) {
  process.exit(1);
}
