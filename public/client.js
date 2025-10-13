'use strict';

const socket = io();
let roomCode = null;
let myPlayerNumber = null;

const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const gameCodeInput = document.getElementById('game-code-input');
const gameCodeDisplay = document.getElementById('game-code-display');


//Event Emitters 

createGameBtn.addEventListener('click', () => {
    socket.emit('createGame');
});

joinGameBtn.addEventListener('click', () => {
    const code = gameCodeInput.value;
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

//Event listeners

const statusMessageEl = document.getElementById('status-message');

socket.on('gameCreated', (code) => {
    roomCode = code;
    showGame(); // Hide setup, show game board
    
    // Display a waiting message and the code
    statusMessageEl.textContent = `Waiting for opponent... Share Code: ${code}`;
    
    // Disable buttons until the game starts
    btnRoll.disabled = true;
    btnHold.disabled = true;
});

socket.on('startGame', (gameState) => {
    roomCode = gameCodeInput.value || roomCode;
    showGame(); // Ensures game is visible for Player 2
    updateUI(gameState, null); // Updates scores and enables buttons for the active player
});

socket.on('updateGameState', ({ game, dice }) => {
    updateUI(game, dice);
});

socket.on('gameOver', ({ game, winner }) => {
    updateUI(game, null);
    showWinner(winner);
});

socket.on('playerLeft', (message) => {
    alert(message);
    hideGame(); // Show the setup screen again
});

socket.on('error', (message) => {
    alert(message);
});