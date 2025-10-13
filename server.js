const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve the 'public' folder
app.use(express.static('public'));

let gameRooms = {};

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  // Create a new game room
  socket.on('createGame', () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    socket.join(roomCode);
    gameRooms[roomCode] = {
      players: { [socket.id]: 0 }, // Player 1 (is player 0)
      scores: [0, 0],
      currentScore: 0,
      activePlayer: 0,
      playing: true,
    };
    // Tell the creator that the game is created and what the code is
    socket.emit('gameCreated', roomCode);
  });

  // Join an existing game room
  socket.on('joinGame', roomCode => {
    const room = gameRooms[roomCode];

    if (room && Object.keys(room.players).length === 1) {
      socket.join(roomCode);
      room.players[socket.id] = 1; // Player 2 (is player 1)

      const playerIds = Object.keys(room.players);
      const player0_ID = playerIds.find(id => room.players[id] === 0);
      const player1_ID = playerIds.find(id => room.players[id] === 1);

      // Tell each player the game is starting AND what their player number is
      io.to(player0_ID).emit('startGame', { gameState: room, playerNumber: 0 });
      io.to(player1_ID).emit('startGame', { gameState: room, playerNumber: 1 });
    } else {
      socket.emit('error', 'Invalid or full game code.');
    }
  });

  // Handle game actions
  socket.on('rollDice', roomCode => {
    const game = gameRooms[roomCode];
    if (!game || !game.playing) return;

    // SECURITY CHECK: Is it this player's turn?
    if (game.players[socket.id] !== game.activePlayer) {
      return; // If not, do nothing.
    }

    const dice = Math.trunc(Math.random() * 6) + 1;
    if (dice !== 1) {
      game.currentScore += dice;
    } else {
      game.currentScore = 0;
      game.activePlayer = game.activePlayer === 0 ? 1 : 0;
    }
    io.to(roomCode).emit('updateGameState', { game, dice });
  });

  socket.on('holdScore', roomCode => {
    const game = gameRooms[roomCode];
    if (!game || !game.playing) return;

    // SECURITY CHECK: Is it this player's turn?
    if (game.players[socket.id] !== game.activePlayer) {
      return; // If not, do nothing.
    }

    game.scores[game.activePlayer] += game.currentScore;
    game.currentScore = 0;

    if (game.scores[game.activePlayer] >= 100) {
      game.playing = false;
      io.to(roomCode).emit('gameOver', { game, winner: game.activePlayer });
    } else {
      game.activePlayer = game.activePlayer === 0 ? 1 : 0;
      io.to(roomCode).emit('updateGameState', { game, dice: null });
    }
  });

  socket.on('newGame', roomCode => {
    const game = gameRooms[roomCode];
    if (!game) return;

    game.scores = [0, 0];
    game.currentScore = 0;
    game.activePlayer = 0;
    game.playing = true;

    // We need to re-send the player numbers on a new game
    const playerIds = Object.keys(game.players);
    const player0_ID = playerIds.find(id => game.players[id] === 0);
    const player1_ID = playerIds.find(id => game.players[id] === 1);

    if (player0_ID) io.to(player0_ID).emit('startGame', { gameState: game, playerNumber: 0 });
    if (player1_ID) io.to(player1_ID).emit('startGame', { gameState: game, playerNumber: 1 });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomCode in gameRooms) {
      if (gameRooms[roomCode].players[socket.id] !== undefined) {
        io.to(roomCode).emit('playerLeft', 'The other player has disconnected.');
        delete gameRooms[roomCode];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});