'use strict';

// Selecting elements
const player0El = document.querySelector('.player--0');
const player1El = document.querySelector('.player--1');
const score0El = document.querySelector('#score--0');
const score1El = document.getElementById('score--1');
const current0El = document.getElementById('current--0');
const current1El = document.getElementById('current--1');
const diceEl = document.querySelector('.dice');
const btnNew = document.querySelector('.btn--new');
const btnRoll = document.querySelector('.btn--roll');
const btnHold = document.querySelector('.btn--hold');
const gameSetupDiv = document.getElementById('game-setup');
const mainGame = document.querySelector('main');
const statusMessageEl = document.getElementById('status-message');

// This function updates the entire UI based on the state from the server
function updateUI(gameState, diceValue, myPlayerNumber) {
  statusMessageEl.textContent = ''; // Clear status message during gameplay
  score0El.textContent = gameState.scores[0];
  score1El.textContent = gameState.scores[1];
  current0El.textContent = 0;
  current1El.textContent = 0;
  document.getElementById(`current--${gameState.activePlayer}`).textContent =
    gameState.currentScore;

  if (diceValue) {
    diceEl.classList.remove('hidden');
    diceEl.src = `dice-${diceValue}.png`;
  } else {
    diceEl.classList.add('hidden');
  }

  player0El.classList.remove('player--active');
  player1El.classList.remove('player--active');
  document
    .querySelector(`.player--${gameState.activePlayer}`)
    .classList.add('player--active');

  // CRITICAL LOGIC: Enable buttons only if it's your turn
  const isMyTurn = gameState.activePlayer === myPlayerNumber;
  btnRoll.disabled = !gameState.playing || !isMyTurn;
  btnHold.disabled = !gameState.playing || !isMyTurn;

  player0El.classList.remove('player--winner');
  player1El.classList.remove('player--winner');
}

function showWinner(winnerPlayer) {
  document
    .querySelector(`.player--${winnerPlayer}`)
    .classList.add('player--winner');
  diceEl.classList.add('hidden');
}

function showGame() {
  gameSetupDiv.classList.add('hidden');
  mainGame.classList.remove('hidden');
}

function hideGame() {
  gameSetupDiv.classList.remove('hidden');
  mainGame.classList.add('hidden');
  document.getElementById('game-code-input').value = '';
}