const http = require('http');
const WebSocket = require('websocket').server

const games = {};
const players = {};
const CROSS_SYMBOL = 'x';
const CIRCLE_SYMBOL = 'o';
const WIN_STATES = Array([0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]);
const emptyBoard = [
    '', '', '',
    '', '', '',
    '', '', ''
];

const server = http.createServer((req, res) => {});
const wss = new WebSocket({ 'httpServer': server });

wss.on('request', req => {

    const conn = req.accept(null, req.origin)
    conn.on('open', () => { conn.send('Connected to server'); })
    conn.on('close', () => { conn.send('Disconnected from server'); })
    conn.on('message', handleMessage)

    const username = req.resourceURL.query.username != null
        ? req.resourceURL.query.username
        : 'Player ' + Object.keys(players).length;

    players[username] = { 'username': username, 'connection': conn }
    conn.send(JSON.stringify({ 'method': 'connect', 'username': players[username].username }))

    sendAvailableGames();
});

server.listen(9000, () => { console.log('Game server running on port 9000'); });

const handleMessage = message => {

    const msg = JSON.parse(message.utf8Data);
    let player = {};

    switch (msg.method) {

        case 'create':
            player = {
                'username': msg.username,
                'symbol': CROSS_SYMBOL,
                'isTurn': true,
                'wins': 0,
                'lost': 0
            };
            const gameId = Math.floor(Math.random() * (99999 - 10000) + 10000);
            games[gameId] = {
                'gameId': gameId,
                'players': [player],
                'board': emptyBoard
            };
            players[msg.username].connection.send(JSON.stringify({ 'method': 'create', 'game': games[gameId] }));
            updateGameBoard(games[gameId]);
            sendAvailableGames();
            break

        case 'join':
            player = {
                'username': msg.username,
                'symbol': CIRCLE_SYMBOL,
                'isTurn': false,
                'wins': 0,
                'lost': 0
            }
            games[msg.gameId].players.push(player);

            players[msg.username].connection.send(JSON.stringify({
                'method': 'join',
                'game': games[msg.gameId]
            }));
            updateGameBoard(games[msg.gameId]);
            sendAvailableGames();
            break;

        case 'makeMove':

            games[msg.game.gameId].board = msg.game.board

            msg.game.players.forEach(gamePlayer => {
                if (gamePlayer.isTurn) {
                    player = gamePlayer;
                }
            });

            let isWinner = WIN_STATES.some(row => {
                return row.every(cell => { 
                    return games[msg.game.gameId].board[cell] == player.symbol ? true : false;
                });
            });

            if (isWinner) {
                games[msg.game.gameId].players.forEach(gamePlayer => {
                    players[gamePlayer.username].connection.send(JSON.stringify({ 'method': 'end', 'winner': player.username }))
                })
                break;

            } else {
                const isDraw = WIN_STATES.every(state => {
                    return state.some(index => {
                        return games[msg.game.gameId].board[index] == 'x'
                    }) && state.some(index => {
                        return games[msg.game.gameId].board[index] == 'o'
                    })
                });

                if (isDraw) {
                    games[msg.game.gameId].players.forEach(gamePlayer => {
                        players[gamePlayer.username].connection.send(JSON.stringify({ 'method': 'draw' }))
                    })
                    break;
                }
            }

            games[msg.game.gameId].players.forEach(gamePlayer => {
                gamePlayer.isTurn = !gamePlayer.isTurn;
            })
            updateGameBoard(games[msg.game.gameId]);
            break;
    }
}

const updateGameBoard = game => {

    game.players.forEach(player => {
        players[player.username].connection.send(JSON.stringify({ 'method': 'updateBoard', 'game': game }))
    })

}

const sendAvailableGames = () => {

    const availableGames = []
    for (const key of Object.keys(games)) {
        if (games[key].players.length < 2) {
            availableGames.push(games[key].gameId)
        }
    }

    for (const username of Object.keys(players)) {
        players[username].connection.send(JSON.stringify({ 'method': 'games', 'games': availableGames }))
    }
}