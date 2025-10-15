'use strict';

// Selecting elements
const player0El = document.querySelector('.player--0');
const player1El = document.querySelector('.player--1');
const score0El = document.querySelector('#score--0');
const score1El = document.getElementById('score--1');
const current0El = document.getElementById('current--0');
const current1El = document.getElementById('current--1');
const diceEl = document.querySelector('.dice');
const gameSetupDiv = document.getElementById('game-setup');
const mainGame = document.querySelector('main');

// This function updates the entire UI based on the state from the server
function updateUI(gameState, diceValue, myPlayerNumber) {
  console.log('Updating UI:', gameState, 'dice:', diceValue);
  
  // Update scores
  score0El.textContent = gameState.scores[0];
  score1El.textContent = gameState.scores[1];
  
  // Reset current scores to 0
  current0El.textContent = 0;
  current1El.textContent = 0;
  
  // Set active player's current score
  if (gameState.currentScore > 0) {
    document.getElementById(`current--${gameState.activePlayer}`).textContent = gameState.currentScore;
  }

  // Show/hide dice
  if (diceValue && diceValue > 0) {
    diceEl.classList.remove('hidden');
    diceEl.src = `dice-${diceValue}.png`;
    console.log('Showing dice:', diceValue);
  } else {
    diceEl.classList.add('hidden');
  }

  // Update active player styling
  player0El.classList.remove('player--active');
  player1El.classList.remove('player--active');
  document.querySelector(`.player--${gameState.activePlayer}`).classList.add('player--active');

  // Enable/disable buttons based on turn and game state
  const btnRoll = document.querySelector('.btn--roll');
  const btnHold = document.querySelector('.btn--hold');
  const isMyTurn = gameState.activePlayer === myPlayerNumber;
  
  console.log('Is my turn?', isMyTurn, 'Playing?', gameState.playing);
  
  btnRoll.disabled = !gameState.playing || !isMyTurn;
  btnHold.disabled = !gameState.playing || !isMyTurn;

  // Remove winner class (in case of new game)
  player0El.classList.remove('player--winner');
  player1El.classList.remove('player--winner');
}

function showWinner(winnerPlayer) {
  console.log('Showing winner:', winnerPlayer);
  document.querySelector(`.player--${winnerPlayer}`).classList.add('player--winner');
  diceEl.classList.add('hidden');
  
  // Disable game buttons
  const btnRoll = document.querySelector('.btn--roll');
  const btnHold = document.querySelector('.btn--hold');
  btnRoll.disabled = true;
  btnHold.disabled = true;
}

function showGame() {
  console.log('Showing game board');
  gameSetupDiv.style.display = 'none';
  mainGame.classList.remove('hidden');
}

function hideGame() {
  console.log('Hiding game board');
  gameSetupDiv.style.display = 'flex';
  mainGame.classList.add('hidden');
  document.getElementById('game-code-input').value = '';
  
  // Reset game display
  score0El.textContent = 0;
  score1El.textContent = 0;
  current0El.textContent = 0;
  current1El.textContent = 0;
  diceEl.classList.add('hidden');
  player0El.classList.remove('player--winner', 'player--active');
  player1El.classList.remove('player--winner', 'player--active');
  player0El.classList.add('player--active');
  
  const statusMessageEl = document.getElementById('status-message');
  statusMessageEl.textContent = '';
  statusMessageEl.style.display = 'none';
}