'use strict';

const socket = io();
let roomCode = null;
let myPlayerNumber = null;

// Select all necessary elements
const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const gameCodeInput = document.getElementById('game-code-input');
const statusMessageEl = document.getElementById('status-message');
const btnRoll = document.querySelector('.btn--roll');
const btnHold = document.querySelector('.btn--hold');
const btnNew = document.querySelector('.btn--new');

// --- Event Emitters (Client -> Server) ---

createGameBtn.addEventListener('click', () => {
  console.log('Creating game...');
  socket.emit('createGame');
});

joinGameBtn.addEventListener('click', () => {
  const code = gameCodeInput.value.trim().toUpperCase();
  if (!code) {
    alert('Please enter a game code');
    return;
  }
  console.log('Joining game:', code);
  socket.emit('joinGame', code);
});

btnRoll.addEventListener('click', () => {
  if (roomCode) {
    socket.emit('rollDice', roomCode);
  }
});

btnHold.addEventListener('click', () => {
  if (roomCode) {
    socket.emit('holdScore', roomCode);
  }
});

btnNew.addEventListener('click', () => {
  if (roomCode) {
    socket.emit('newGame', roomCode);
  }
});

// --- Event Listeners (Server -> Client) ---

socket.on('gameCreated', code => {
  console.log('Game created with code:', code);
  roomCode = code;
  showGame();
  statusMessageEl.textContent = `Waiting for opponent... Code: ${code}`;
  btnRoll.disabled = true;
  btnHold.disabled = true;
});

socket.on('startGame', ({ gameState, playerNumber }) => {
  console.log('Game starting! You are player', playerNumber);
  myPlayerNumber = playerNumber;
  
  // If we don't have roomCode yet (joining player), find it
  if (!roomCode) {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        roomCode = room;
        break;
      }
    }
  }
  
  showGame();
  updateUI(gameState, null, myPlayerNumber);
  statusMessageEl.textContent = 'Game started!';
  
  // Enable buttons if it's your turn
  const isMyTurn = gameState.activePlayer === myPlayerNumber;
  btnRoll.disabled = !isMyTurn;
  btnHold.disabled = !isMyTurn;
});

socket.on('updateGameState', ({ game, dice }) => {
  console.log('Game state updated');
  updateUI(game, dice, myPlayerNumber);
});

socket.on('gameOver', ({ game, winner }) => {
  console.log('Game over! Winner:', winner);
  updateUI(game, null, myPlayerNumber);
  showWinner(winner);
  
  const winnerText = winner === myPlayerNumber ? 'You won! 🎉' : 'You lost! 😢';
  statusMessageEl.textContent = winnerText;
});

socket.on('playerLeft', message => {
  alert(message);
  hideGame();
  roomCode = null;
  myPlayerNumber = null;
});

socket.on('error', message => {
  alert(message);
  console.error('Server error:', message);
});

// Debug: Log when socket connects
socket.on('connect', () => {
  console.log('Connected to server with socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});