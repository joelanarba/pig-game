const express =  require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//Serve the public folder
app.use(express.static('public'));

let gameRooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    //Create a new game room
    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        socket.join(roomCode);
        gameRooms[roomCode] = {
            players: { [socket.id] : 0 }, //Player 1
            scores: [0, 0],
            currentScore: 0,
            activePlayer: 0,
            playing: true,  
        };
        socket.emit('gameCreated', roomCode);
    });

    //Join an existing game room
    socket.on('joinGame', (roomCode) => {
        if (gameRooms[roomCode] && Object.keys(gameRooms[roomCode].players).length === 1 ) {
            socket.join(roomCode);
            gameRooms[roomCode].players[socket.id] = 1; //Player 2
            io.to(roomCode).emit('startGame', gameRooms[roomCode]);
        } else {
            socket.emit('error', 'Invalid or full game code.');
        }
    });

    //Handle game actions
    socket.on('rollDice', (roomCode) => {
        if (!gameRooms[roomCode]) return;
        const game = gameRooms[roomCode];
        const dice = Math.trunc(Math.random() * 6) + 1;

        if (dice !== 1) {
            game.currentScore += dice;
        } else {
            //Switch player
            game.currentScore = 0;
            game.activePlayer = game.activePlayer === 0 ? 1 : 0;
        }
        io.to(roomCode).emit('updateGameState', { game, dice });
    });

    socket.on('holdScore', (roomCode) => {
        if (!gameRooms[roomCode]) return;
        const game = gameRooms[roomCode];

        game.scores[game.activePlayer] += game.currentScore;
        game.currentScore = 0;

        if (game.scores[game.activePlayer] >= 100) {
            game.playing = false;
            io.to(roomCode.emit('gameOver', { game, winner: game.activePlayer }));
        } else {
            //Switch player
            game.activePlayer = game.activePlayer === 0 ? 1 : 0;
            io.to(roomCode).emit('updateGameState', {game, dice: null});
        }
    });

    socket.on('newGame', (roomCode) => {
        if (!gameRooms[roomCode]) return;
        const game = gameRooms[roomCode];

        game.scores = [0, 0];
        game.currentScore = 0;
        game.activePlayer = 0;
        game.playing = true;

        io.to(roomCode).emit('startGame', game);
    });

    socket.on('disconnect', () => {
        console.log( 'User disconnected:', socket.id);
        //Find the room the player was in and notify the other player
        for (const roomCode in gameRooms){
            if ( gameRooms[roomCode].players[socket.id] !== undefined) {
                io.to(roomCode).emit('playerLeft', 'The other player has disconnected.');
                delete gameRooms[roomCode];
                break;
            }
        }
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});