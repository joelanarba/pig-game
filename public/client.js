'use strict';

const socket = io();
let roomCode = null;
let myPlayerNumber = null; // This will store if you are Player 0 or 1

const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const gameCodeInput = document.getElementById('game-code-input');
const statusMessageEl = document.getElementById('status-message');

// --- Event Emitters (Client -> Server) ---

createGameBtn.addEventListener('click', () => {
  socket.emit('createGame');
});

joinGameBtn.addEventListener('click', () => {
  const code = gameCodeInput.value.toUpperCase();
  socket.emit('joinGame', code);
});

btnRoll.addEventListener('click', () => {
  socket.emit('rollDice', roomCode);
});

btnHold.addEventListener('click', () => {
  socket.emit('holdScore', roomCode);
});

btnNew.addEventListener('click', () => {
  socket.emit('newGame', roomCode);
});

// --- Event Listeners (Server -> Client) ---

socket.on('gameCreated', code => {
  roomCode = code;
  showGame(); // Hide setup form, show game board
  statusMessageEl.textContent = `Waiting for opponent... Code: ${code}`;
  // Disable buttons while waiting
  btnRoll.disabled = true;
  btnHold.disabled = true;
});

socket.on('startGame', ({ gameState, playerNumber }) => {
  myPlayerNumber = playerNumber; // IMPORTANT: Store your player number
  
  // Find the roomCode from the connection details
  for (const room of socket.rooms) {
    if (room !== socket.id) {
        roomCode = room;
        break;
    }
  }
  
  showGame();
  updateUI(gameState, null, myPlayerNumber); // Pass your number to the UI
});

socket.on('updateGameState', ({ game, dice }) => {
  updateUI(game, dice, myPlayerNumber); // Pass your number on every update
});

socket.on('gameOver', ({ game, winner }) => {
  updateUI(game, null, myPlayerNumber);
  showWinner(winner);
});

socket.on('playerLeft', message => {
  alert(message);
  hideGame();
});

socket.on('error', message => {
  alert(message);
});