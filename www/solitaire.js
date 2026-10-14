/**
 * ZenSolitaire Logic Engine
 * Pure JavaScript Solitaire (Klondike) mechanics without DOM dependencies.
 * Compatible with Node.js and browser environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SolitaireLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
  const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const SUIT_COLORS = { S: 'black', H: 'red', D: 'red', C: 'black' };
  const RANK_LABELS = {
    1: 'A',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: 'J',
    12: 'Q',
    13: 'K'
  };

  function createCard(suit, rank, faceUp = false) {
    return {
      id: `${suit}-${rank}`,
      suit: suit,
      rank: rank,
      color: SUIT_COLORS[suit],
      symbol: SUIT_SYMBOLS[suit],
      label: RANK_LABELS[rank],
      faceUp: !!faceUp
    };
  }

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push(createCard(suit, rank, false));
      }
    }
    return deck;
  }

  function shuffle(array, rng = Math.random) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function cloneCard(card) {
    if (!card) return null;
    return {
      id: card.id,
      suit: card.suit,
      rank: card.rank,
      color: card.color,
      symbol: card.symbol,
      label: card.label,
      faceUp: card.faceUp
    };
  }

  function clonePile(pile) {
    return pile.map(cloneCard);
  }

  function createGame(options = {}) {
    const drawMode = options.drawMode === 3 ? 3 : 1;
    let deck = createDeck();

    if (options.deck) {
      deck = options.deck.map(cloneCard);
    } else {
      deck = shuffle(deck, options.rng || Math.random);
    }

    const tableau = [[], [], [], [], [], [], []];
    let deckIndex = 0;

    // Deal standard Klondike tableau:
    // col 0: 1 card, col 1: 2 cards, ..., col 6: 7 cards
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[deckIndex++];
        card.faceUp = row === col; // Only top card is face-up
        tableau[col].push(card);
      }
    }

    // Remaining 24 cards form the stock
    const stock = [];
    while (deckIndex < deck.length) {
      const card = deck[deckIndex++];
      card.faceUp = false;
      stock.push(card);
    }

    return {
      drawMode: drawMode,
      stock: stock,
      waste: [],
      foundations: [[], [], [], []], // 0: Spades, 1: Hearts, 2: Diamonds, 3: Clubs
      tableau: tableau,
      score: 0,
      moves: 0,
      history: []
    };
  }

  function recordSnapshot(game) {
    const snapshot = {
      stock: clonePile(game.stock),
      waste: clonePile(game.waste),
      foundations: game.foundations.map(clonePile),
      tableau: game.tableau.map(clonePile),
      score: game.score,
      moves: game.moves
    };
    game.history.push(snapshot);
    if (game.history.length > 100) {
      game.history.shift();
    }
  }

  function undo(game) {
    if (!game.history || game.history.length === 0) {
      return false;
    }
    const previous = game.history.pop();
    game.stock = previous.stock;
    game.waste = previous.waste;
    game.foundations = previous.foundations;
    game.tableau = previous.tableau;
    game.score = previous.score;
    game.moves = previous.moves;
    return true;
  }

  function draw(game) {
    recordSnapshot(game);
    game.moves++;

    if (game.stock.length > 0) {
      const count = Math.min(game.drawMode, game.stock.length);
      for (let i = 0; i < count; i++) {
        const card = game.stock.pop();
        card.faceUp = true;
        game.waste.push(card);
      }
      return { action: 'draw', count: count };
    } else if (game.waste.length > 0) {
      // Recycle waste to stock
      while (game.waste.length > 0) {
        const card = game.waste.pop();
        card.faceUp = false;
        game.stock.push(card);
      }
      game.score = Math.max(0, game.score - 20); // Standard penalty for deck recycling
      return { action: 'recycle' };
    }

    return { action: 'none' };
  }

  function getFoundationSuit(fIndex) {
    return SUITS[fIndex];
  }

  function getFoundationIndexForSuit(suit) {
    return SUITS.indexOf(suit);
  }

  function canMoveToFoundation(card, foundation) {
    if (!card || !card.faceUp) return false;
    if (foundation.length === 0) {
      return card.rank === 1; // Must be Ace
    }
    const top = foundation[foundation.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  }

  function canMoveToTableau(card, column) {
    if (!card || !card.faceUp) return false;
    if (column.length === 0) {
      return card.rank === 13; // Only Kings on empty columns
    }
    const top = column[column.length - 1];
    if (!top.faceUp) return false;
    return card.color !== top.color && card.rank === top.rank - 1;
  }

  function moveWasteToFoundation(game, fIndex) {
    if (game.waste.length === 0) return false;
    if (fIndex < 0 || fIndex >= 4) return false;

    const card = game.waste[game.waste.length - 1];
    const foundation = game.foundations[fIndex];

    if (!canMoveToFoundation(card, foundation)) {
      return false;
    }

    recordSnapshot(game);
    game.waste.pop();
    foundation.push(card);
    game.score += 10;
    game.moves++;
    return true;
  }

  function moveWasteToTableau(game, colIndex) {
    if (game.waste.length === 0) return false;
    if (colIndex < 0 || colIndex >= 7) return false;

    const card = game.waste[game.waste.length - 1];
    const column = game.tableau[colIndex];

    if (!canMoveToTableau(card, column)) {
      return false;
    }

    recordSnapshot(game);
    game.waste.pop();
    column.push(card);
    game.score += 5;
    game.moves++;
    return true;
  }

  function moveTableauToFoundation(game, fromCol, fIndex) {
    if (fromCol < 0 || fromCol >= 7) return false;
    const col = game.tableau[fromCol];
    if (col.length === 0) return false;

    const card = col[col.length - 1];
    const foundation = game.foundations[fIndex];

    if (!canMoveToFoundation(card, foundation)) {
      return false;
    }

    recordSnapshot(game);
    col.pop();
    foundation.push(card);

    // If new top card is face-down, flip it face up and award points
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      game.score += 5;
    }

    game.score += 10;
    game.moves++;
    return true;
  }

  function moveTableauToTableau(game, fromCol, cardIndex, toCol) {
    if (fromCol < 0 || fromCol >= 7 || toCol < 0 || toCol >= 7 || fromCol === toCol) {
      return false;
    }
    const sourceCol = game.tableau[fromCol];
    const targetCol = game.tableau[toCol];

    if (cardIndex < 0 || cardIndex >= sourceCol.length) return false;
    const movingCard = sourceCol[cardIndex];
    if (!movingCard.faceUp) return false;

    if (!canMoveToTableau(movingCard, targetCol)) {
      return false;
    }

    recordSnapshot(game);
    const movingCards = sourceCol.splice(cardIndex);
    for (const c of movingCards) {
      targetCol.push(c);
    }

    // Flip new top card in source column
    if (sourceCol.length > 0 && !sourceCol[sourceCol.length - 1].faceUp) {
      sourceCol[sourceCol.length - 1].faceUp = true;
      game.score += 5;
    }

    game.moves++;
    return true;
  }

  function moveFoundationToTableau(game, fIndex, toCol) {
    if (fIndex < 0 || fIndex >= 4 || toCol < 0 || toCol >= 7) return false;
    const foundation = game.foundations[fIndex];
    if (foundation.length === 0) return false;

    const card = foundation[foundation.length - 1];
    const targetCol = game.tableau[toCol];

    if (!canMoveToTableau(card, targetCol)) {
      return false;
    }

    recordSnapshot(game);
    foundation.pop();
    targetCol.push(card);
    game.score = Math.max(0, game.score - 15);
    game.moves++;
    return true;
  }

  function findBestMoveForCard(game, card, sourceInfo) {
    if (!card || !card.faceUp) return null;

    // 1. Try foundation first (only single top cards can go to foundation)
    const isTopCard =
      sourceInfo.type === 'waste' ||
      (sourceInfo.type === 'tableau' &&
        sourceInfo.cardIndex === game.tableau[sourceInfo.colIndex].length - 1);

    if (isTopCard) {
      for (let f = 0; f < 4; f++) {
        if (canMoveToFoundation(card, game.foundations[f])) {
          return {
            targetType: 'foundation',
            targetIndex: f
          };
        }
      }
    }

    // 2. Try tableau columns
    // Prioritize moving to non-empty columns first, then empty column
    const candidates = [];
    for (let c = 0; c < 7; c++) {
      if (sourceInfo.type === 'tableau' && sourceInfo.colIndex === c) continue;
      const targetCol = game.tableau[c];
      if (canMoveToTableau(card, targetCol)) {
        candidates.push({
          targetType: 'tableau',
          targetIndex: c,
          isEmpty: targetCol.length === 0
        });
      }
    }

    if (candidates.length > 0) {
      // Sort non-empty first
      candidates.sort((a, b) => (a.isEmpty === b.isEmpty ? 0 : a.isEmpty ? 1 : -1));
      return {
        targetType: 'tableau',
        targetIndex: candidates[0].targetIndex
      };
    }

    return null;
  }

  function autoMove(game, sourceInfo) {
    if (sourceInfo.type === 'waste') {
      if (game.waste.length === 0) return false;
      const card = game.waste[game.waste.length - 1];
      const best = findBestMoveForCard(game, card, sourceInfo);
      if (!best) return false;

      if (best.targetType === 'foundation') {
        return moveWasteToFoundation(game, best.targetIndex);
      } else {
        return moveWasteToTableau(game, best.targetIndex);
      }
    } else if (sourceInfo.type === 'tableau') {
      const col = game.tableau[sourceInfo.colIndex];
      if (!col || sourceInfo.cardIndex < 0 || sourceInfo.cardIndex >= col.length) {
        return false;
      }
      const card = col[sourceInfo.cardIndex];
      const best = findBestMoveForCard(game, card, sourceInfo);
      if (!best) return false;

      if (best.targetType === 'foundation') {
        return moveTableauToFoundation(game, sourceInfo.colIndex, best.targetIndex);
      } else {
        return moveTableauToTableau(game, sourceInfo.colIndex, sourceInfo.cardIndex, best.targetIndex);
      }
    } else if (sourceInfo.type === 'foundation') {
      const foundation = game.foundations[sourceInfo.fIndex];
      if (!foundation || foundation.length === 0) return false;
      const card = foundation[foundation.length - 1];
      for (let c = 0; c < 7; c++) {
        if (canMoveToTableau(card, game.tableau[c])) {
          return moveFoundationToTableau(game, sourceInfo.fIndex, c);
        }
      }
    }
    return false;
  }

  function getHint(game) {
    // 1. Check waste top card to foundation
    if (game.waste.length > 0) {
      const card = game.waste[game.waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (canMoveToFoundation(card, game.foundations[f])) {
          return {
            from: { type: 'waste' },
            to: { type: 'foundation', index: f },
            description: `Move ${card.label}${card.symbol} from Waste to Foundation`
          };
        }
      }
    }

    // 2. Check tableau cards to foundation
    for (let c = 0; c < 7; c++) {
      const col = game.tableau[c];
      if (col.length > 0) {
        const card = col[col.length - 1];
        for (let f = 0; f < 4; f++) {
          if (canMoveToFoundation(card, game.foundations[f])) {
            return {
              from: { type: 'tableau', colIndex: c, cardIndex: col.length - 1 },
              to: { type: 'foundation', index: f },
              description: `Move ${card.label}${card.symbol} from Column ${c + 1} to Foundation`
            };
          }
        }
      }
    }

    // 3. Check waste to tableau
    if (game.waste.length > 0) {
      const card = game.waste[game.waste.length - 1];
      for (let c = 0; c < 7; c++) {
        if (canMoveToTableau(card, game.tableau[c])) {
          return {
            from: { type: 'waste' },
            to: { type: 'tableau', index: c },
            description: `Move ${card.label}${card.symbol} from Waste to Column ${c + 1}`
          };
        }
      }
    }

    // 4. Check tableau to tableau
    for (let fromC = 0; fromC < 7; fromC++) {
      const sourceCol = game.tableau[fromC];
      for (let i = 0; i < sourceCol.length; i++) {
        const card = sourceCol[i];
        if (!card.faceUp) continue;

        // Skip moving King from bottom of column to another empty column
        if (i === 0 && card.rank === 13) continue;

        for (let toC = 0; toC < 7; toC++) {
          if (fromC === toC) continue;
          if (canMoveToTableau(card, game.tableau[toC])) {
            return {
              from: { type: 'tableau', colIndex: fromC, cardIndex: i },
              to: { type: 'tableau', index: toC },
              description: `Move ${card.label}${card.symbol} from Column ${fromC + 1} to Column ${toC + 1}`
            };
          }
        }
      }
    }

    // 5. Stock draw hint
    if (game.stock.length > 0 || game.waste.length > 0) {
      return {
        from: { type: 'stock' },
        to: { type: 'waste' },
        description: 'Draw new card(s) from Stock'
      };
    }

    return null;
  }

  function isAutoFinishReady(game) {
    if (game.stock.length > 0 || game.waste.length > 0) {
      return false;
    }
    // All cards in tableau must be face-up
    for (let c = 0; c < 7; c++) {
      for (const card of game.tableau[c]) {
        if (!card.faceUp) return false;
      }
    }
    return true;
  }

  function performAutoFinishStep(game) {
    // Finds lowest rank card that can be placed on foundation
    let best = null;
    let minRank = 99;

    for (let c = 0; c < 7; c++) {
      const col = game.tableau[c];
      if (col.length > 0) {
        const card = col[col.length - 1];
        for (let f = 0; f < 4; f++) {
          if (canMoveToFoundation(card, game.foundations[f])) {
            if (card.rank < minRank) {
              minRank = card.rank;
              best = { colIndex: c, fIndex: f };
            }
          }
        }
      }
    }

    if (best) {
      return moveTableauToFoundation(game, best.colIndex, best.fIndex);
    }
    return false;
  }

  function isWon(game) {
    for (let f = 0; f < 4; f++) {
      if (game.foundations[f].length !== 13) {
        return false;
      }
    }
    return true;
  }

  function serialize(game) {
    return JSON.stringify({
      drawMode: game.drawMode,
      stock: game.stock,
      waste: game.waste,
      foundations: game.foundations,
      tableau: game.tableau,
      score: game.score,
      moves: game.moves
    });
  }

  function deserialize(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return {
      drawMode: data.drawMode || 1,
      stock: data.stock || [],
      waste: data.waste || [],
      foundations: data.foundations || [[], [], [], []],
      tableau: data.tableau || [[], [], [], [], [], [], []],
      score: data.score || 0,
      moves: data.moves || 0,
      history: []
    };
  }

  return {
    SUITS,
    SUIT_SYMBOLS,
    SUIT_COLORS,
    RANK_LABELS,
    createCard,
    createDeck,
    shuffle,
    createGame,
    draw,
    canMoveToFoundation,
    canMoveToTableau,
    moveWasteToFoundation,
    moveWasteToTableau,
    moveTableauToFoundation,
    moveTableauToTableau,
    moveFoundationToTableau,
    findBestMoveForCard,
    autoMove,
    getHint,
    isAutoFinishReady,
    performAutoFinishStep,
    isWon,
    undo,
    serialize,
    deserialize
  };
});
