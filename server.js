//Main Backend code
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let gameRooms = {};

// Helper function to create a deep copy of game state for sending to clients
function getGameStateForClient(room) {
  return {
    scores: [...room.scores],
    currentScore: room.currentScore,
    activePlayer: room.activePlayer,
    playing: room.playing
  };
}

// Helper function to get the OTHER player's socket ID
function getOtherPlayerId(room, currentSocketId) {
  return Object.keys(room.players).find(id => id !== currentSocketId);
}

io.on('connection', socket => {
  console.log('✅ User connected:', socket.id);

  socket.on('createGame', () => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    socket.join(roomCode);
    
    gameRooms[roomCode] = {
      players: { [socket.id]: 0 }, // socketId -> playerNumber mapping
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
    console.log(`   Player 0 (${player0_ID})`);
    console.log(`   Player 1 (${player1_ID})`);
    console.log(`   Active player: ${room.activePlayer}`);

    // Send SEPARATE game state copies to each player with their room code
    const gameState = getGameStateForClient(room);
    
    io.to(player0_ID).emit('startGame', { 
      gameState, 
      playerNumber: 0,
      roomCode 
    });
    io.to(player1_ID).emit('startGame', { 
      gameState, 
      playerNumber: 1,
      roomCode 
    });
  });

  socket.on('rollDice', roomCode => {
    const room = gameRooms[roomCode];
    if (!room || !room.playing) {
      console.log('❌ Cannot roll - game not playing');
      return;
    }

    const playerNumber = room.players[socket.id];
    if (playerNumber === undefined) {
      console.log('❌ Player not in this game');
      return;
    }
    
    if (playerNumber !== room.activePlayer) {
      console.log(`❌ ${socket.id} tried to roll but it's not their turn (player ${playerNumber}, active ${room.activePlayer})`);
      return;
    }

    const dice = Math.trunc(Math.random() * 6) + 1;
    console.log(`🎲 Player ${playerNumber} rolled ${dice}`);

    if (dice !== 1) {
      room.currentScore += dice;
      console.log(`   Current score: ${room.currentScore}`);
    } else {
      console.log(`   💥 Rolled 1! Switching turns`);
      room.currentScore = 0;
      room.activePlayer = room.activePlayer === 0 ? 1 : 0;
    }

    // Send fresh copies of game state to ALL players in the room
    const gameState = getGameStateForClient(room);
    io.to(roomCode).emit('updateGameState', { 
      gameState, 
      dice 
    });
  });

  socket.on('holdScore', roomCode => {
    const room = gameRooms[roomCode];
    if (!room || !room.playing) {
      console.log('❌ Cannot hold - game not playing');
      return;
    }

    const playerNumber = room.players[socket.id];
    if (playerNumber === undefined) {
      console.log('❌ Player not in this game');
      return;
    }
    
    if (playerNumber !== room.activePlayer) {
      console.log(`❌ ${socket.id} tried to hold but it's not their turn`);
      return;
    }

    room.scores[room.activePlayer] += room.currentScore;
    console.log(`📥 Player ${room.activePlayer} held score: ${room.currentScore}`);
    console.log(`   Total scores: [${room.scores[0]}, ${room.scores[1]}]`);
    
    room.currentScore = 0;

    if (room.scores[room.activePlayer] >= 100) {
      room.playing = false;
      const winner = room.activePlayer;
      console.log(`🎉 Player ${winner} WINS!`);
      
      const gameState = getGameStateForClient(room);
      io.to(roomCode).emit('gameOver', { 
        gameState, 
        winner 
      });
    } else {
      room.activePlayer = room.activePlayer === 0 ? 1 : 0;
      console.log(`   Switching to player ${room.activePlayer}`);
      
      const gameState = getGameStateForClient(room);
      io.to(roomCode).emit('updateGameState', { 
        gameState, 
        dice: null 
      });
    }
  });

  socket.on('newGame', roomCode => {
    const room = gameRooms[roomCode];
    if (!room) return;

    console.log(`🔄 New game starting in ${roomCode}`);
    
    room.scores = [0, 0];
    room.currentScore = 0;
    room.activePlayer = 0;
    room.playing = true;

    const playerIds = Object.keys(room.players);
    const player0_ID = playerIds.find(id => room.players[id] === 0);
    const player1_ID = playerIds.find(id => room.players[id] === 1);

    const gameState = getGameStateForClient(room);

    if (player0_ID) {
      io.to(player0_ID).emit('startGame', { 
        gameState, 
        playerNumber: 0,
        roomCode 
      });
    }
    if (player1_ID) {
      io.to(player1_ID).emit('startGame', { 
        gameState, 
        playerNumber: 1,
        roomCode 
      });
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