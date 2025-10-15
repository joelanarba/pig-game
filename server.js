const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let gameRooms = {};

io.on('connection', socket => {
  console.log('✅ User connected:', socket.id);

  socket.on('createGame', () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    socket.join(roomCode);
    
    gameRooms[roomCode] = {
      players: { [socket.id]: 0 },
      scores: [0, 0],
      currentScore: 0,
      activePlayer: 0,
      playing: false, // NOT playing until second player joins
    };
    
    console.log(`🎮 Game created: ${roomCode} by ${socket.id}`);
    socket.emit('gameCreated', roomCode);
  });

  socket.on('joinGame', roomCode => {
    const room = gameRooms[roomCode];

    if (!room) {
      socket.emit('error', 'Game code does not exist.');
      return;
    }

    if (Object.keys(room.players).length >= 2) {
      socket.emit('error', 'Game is already full.');
      return;
    }

    socket.join(roomCode);
    room.players[socket.id] = 1;
    room.playing = true; // NOW the game can start

    const playerIds = Object.keys(room.players);
    const player0_ID = playerIds.find(id => room.players[id] === 0);
    const player1_ID = playerIds.find(id => room.players[id] === 1);

    console.log(`🎮 Player joined ${roomCode}. Starting game!`);
    console.log(`   Player 0 (${player0_ID}): ${room.players[player0_ID]}`);
    console.log(`   Player 1 (${player1_ID}): ${room.players[player1_ID]}`);
    console.log(`   Active player: ${room.activePlayer}`);

    // Send game state to BOTH players
    io.to(player0_ID).emit('startGame', { 
      gameState: room, 
      playerNumber: 0 
    });
    io.to(player1_ID).emit('startGame', { 
      gameState: room, 
      playerNumber: 1 
    });
  });

  socket.on('rollDice', roomCode => {
    const game = gameRooms[roomCode];
    if (!game || !game.playing) {
      console.log('❌ Cannot roll - game not playing');
      return;
    }

    const playerNumber = game.players[socket.id];
    if (playerNumber !== game.activePlayer) {
      console.log(`❌ ${socket.id} tried to roll but it's not their turn (player ${playerNumber}, active ${game.activePlayer})`);
      return;
    }

    const dice = Math.trunc(Math.random() * 6) + 1;
    console.log(`🎲 Player ${playerNumber} rolled ${dice}`);

    if (dice !== 1) {
      game.currentScore += dice;
      console.log(`   Current score: ${game.currentScore}`);
    } else {
      console.log(`   💥 Rolled 1! Switching turns`);
      game.currentScore = 0;
      game.activePlayer = game.activePlayer === 0 ? 1 : 0;
    }

    io.to(roomCode).emit('updateGameState', { game, dice });
  });

  socket.on('holdScore', roomCode => {
    const game = gameRooms[roomCode];
    if (!game || !game.playing) {
      console.log('❌ Cannot hold - game not playing');
      return;
    }

    const playerNumber = game.players[socket.id];
    if (playerNumber !== game.activePlayer) {
      console.log(`❌ ${socket.id} tried to hold but it's not their turn`);
      return;
    }

    game.scores[game.activePlayer] += game.currentScore;
    console.log(`📥 Player ${game.activePlayer} held score: ${game.currentScore}`);
    console.log(`   Total scores: [${game.scores[0]}, ${game.scores[1]}]`);
    
    game.currentScore = 0;

    if (game.scores[game.activePlayer] >= 100) {
      game.playing = false;
      console.log(`🎉 Player ${game.activePlayer} WINS!`);
      io.to(roomCode).emit('gameOver', { game, winner: game.activePlayer });
    } else {
      game.activePlayer = game.activePlayer === 0 ? 1 : 0;
      console.log(`   Switching to player ${game.activePlayer}`);
      io.to(roomCode).emit('updateGameState', { game, dice: null });
    }
  });

  socket.on('newGame', roomCode => {
    const game = gameRooms[roomCode];
    if (!game) return;

    console.log(`🔄 New game starting in ${roomCode}`);
    
    game.scores = [0, 0];
    game.currentScore = 0;
    game.activePlayer = 0;
    game.playing = true;

    const playerIds = Object.keys(game.players);
    const player0_ID = playerIds.find(id => game.players[id] === 0);
    const player1_ID = playerIds.find(id => game.players[id] === 1);

    if (player0_ID) {
      io.to(player0_ID).emit('startGame', { gameState: game, playerNumber: 0 });
    }
    if (player1_ID) {
      io.to(player1_ID).emit('startGame', { gameState: game, playerNumber: 1 });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    for (const roomCode in gameRooms) {
      if (gameRooms[roomCode].players[socket.id] !== undefined) {
        console.log(`   Notifying room ${roomCode}`);
        io.to(roomCode).emit('playerLeft', 'The other player has disconnected.');
        delete gameRooms[roomCode];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});