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
  if (roomCode && !btnRoll.disabled) {
    console.log('Rolling dice...');
    socket.emit('rollDice', roomCode);
  }
});

btnHold.addEventListener('click', () => {
  if (roomCode && !btnHold.disabled) {
    console.log('Holding score...');
    socket.emit('holdScore', roomCode);
  }
});

btnNew.addEventListener('click', () => {
  if (roomCode) {
    console.log('Starting new game...');
    socket.emit('newGame', roomCode);
  }
});

// --- Event Listeners (Server -> Client) ---

socket.on('gameCreated', code => {
  console.log('Game created with code:', code);
  roomCode = code;
  myPlayerNumber = 0; // Creator is always player 0
  showGame();
  statusMessageEl.textContent = `Waiting for opponent... Share code: ${code}`;
  statusMessageEl.style.display = 'block';
  btnRoll.disabled = true;
  btnHold.disabled = true;
});

socket.on('startGame', ({ gameState, playerNumber, roomCode: receivedRoomCode }) => {
  console.log('Game starting! You are player', playerNumber);
  console.log('Received game state:', gameState);
  
  myPlayerNumber = playerNumber;
  
  // Set roomCode from server (important for joining player)
  if (receivedRoomCode) {
    roomCode = receivedRoomCode;
  }
  
  showGame();
  updateUI(gameState, null, myPlayerNumber);
  
  // Show whose turn it is
  const isMyTurn = gameState.activePlayer === myPlayerNumber;
  if (isMyTurn) {
    statusMessageEl.textContent = "It's YOUR turn! 🎲";
  } else {
    statusMessageEl.textContent = "Opponent's turn...";
  }
  statusMessageEl.style.display = 'block';
  
  // Enable buttons if it's your turn
  btnRoll.disabled = !isMyTurn;
  btnHold.disabled = !isMyTurn;
});

socket.on('updateGameState', ({ gameState, dice }) => {
  console.log('Game state updated');
  console.log('  Game state:', gameState);
  console.log('  Dice:', dice);
  
  updateUI(gameState, dice, myPlayerNumber);
  
  // Update status message
  const isMyTurn = gameState.activePlayer === myPlayerNumber;
  if (isMyTurn) {
    statusMessageEl.textContent = "It's YOUR turn! 🎲";
  } else {
    statusMessageEl.textContent = "Opponent's turn...";
  }
  statusMessageEl.style.display = 'block';
});

socket.on('gameOver', ({ gameState, winner }) => {
  console.log('Game over! Winner:', winner);
  console.log('Final game state:', gameState);
  
  updateUI(gameState, null, myPlayerNumber);
  showWinner(winner);
  
  const winnerText = winner === myPlayerNumber ? '🎉 You WON! 🎉' : '😢 You lost!';
  statusMessageEl.textContent = winnerText;
  statusMessageEl.style.display = 'block';
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