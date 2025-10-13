'use strict';

const socket = io();
let roomCode = null;

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

socket.on('gameCreated', (code) => {
    roomCode = code;
    gameCodeDisplay.textContent = `Waiting for another player... Share this code: ${roomCode}`;
});

socket.on('startGame', (gameState) => {
    roomCode = gameCodeInput.value || roomCode;
    showGame();
    updateUI(gameState, null); //Initial UI Setup
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
    hideGame();
    gameCodeDisplay.textContent = '';
});

socket.on('error', (message) => {
    alert(message);
});