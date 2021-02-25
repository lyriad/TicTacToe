let clientId, gameId, isTurn = false, symbol, socket, board, game;

const connectBtn = document.getElementById('connectBtn')
const newGameBtn = document.getElementById('newGame')

const connectToSocketServer = () => {

    socket = new WebSocket('ws://localhost:9000')
    socket.onopen = e => {};

    socket.onmessage = msg => {

        const data = JSON.parse(msg.data);

        switch (data.method) {

            case 'connect':
                clientId = data.clientId;
                let clientIdLabel = document.getElementById('client-id-label');
                if (clientIdLabel != null) {
                    clientIdLabel.innerText = `${data.clientId}`;
                }
                break;

            case 'create':
                joinedGame(data.game, 0);
                break;

            case 'games':
                listGames(data.games);
                break;

            case 'join':
                joinedGame(data.game, 1);
                break;

            case 'updateBoard':
                game = data.game;
                board = game.board;
                updateBoard();
                break;

            case 'end':
                alert(`El ganador es ${data.winner}`)
                break;
            case 'draw':
                alert('Its a draw')
                break
        }
    }

    socket.onclose = function(event) {

    }

    socket.onerror = function(err) {

    }
};

const createGame = () => {
    socket.send(JSON.stringify({
        'method': 'create',
        'clientId': clientId
    }));
}

const joinedGame = (game, index) => {
    gameId = game.gameId;
    symbol = game.players[index].symbol;
    const cells = document.querySelectorAll('#cell');
    cells.forEach(cell => {
        cell.classList.remove('x', 'circle');
    });
}

const joinGame = e => {

    gameId = e.target.innerText;
    let listElements = document.querySelectorAll('li.game-option');

    for (let li of listElements) {
        li.classList.remove('selected');
    }

    let joinGameBtn = document.getElementById('join-game-btn');
    e.target.classList.add('selected');

    joinGameBtn.removeEventListener('click', requestJoinGame);
    joinGameBtn.addEventListener('click', requestJoinGame, { once: true })
}

const requestJoinGame = () => {
    socket.send(JSON.stringify({
        'method': 'join',
        'clientId': clientId,
        'gameId': gameId
    }))
}

const listGames = games => {

    let gamesList = document.getElementById('games-list');

    while (gamesList.firstChild) {
        gamesList.removeChild(gamesList.lastChild)
    }

    games.forEach(gameId => {
        const li = document.createElement('li');
        li.classList.add('game-option');
        li.dataset.game = gameId;
        li.addEventListener('click', joinGame);
        li.innerText = gameId;
        gamesList.appendChild(li);
    })
}

const updateBoard = () => {

    const gameBoard = document.getElementById('game-board');
    const cells = document.querySelectorAll('#cell');

    gameBoard.style.display = 'grid';
    gameBoard.classList.add(symbol == 'x' ? 'x' : 'circle')

    for (let i = 0; i < cells.length; i++) {

        if (board[i] == 'x') {
            cells[i].classList.add('x');

        } else if (board[i] == 'o') {
            cells[i].classList.add('circle');

        } else {
            cells[i].addEventListener('click', makeMove);
        }
    }

    game.players.forEach(player => {
        if (player.clientId == clientId && player.isTurn == true) {
            isTurn = true;
        }
    })
}

const makeMove = e => {

    if (game.players.length < 2) {
        alert('Esperando por otro jugador');
        return;
    }

    if (!isTurn || e.target.classList.contains('x') || e.target.classList.contains('circle')) {
        alert('No es tu turno');
        return;
    }

    const cells = document.querySelectorAll('#cell');
    e.target.classList.add(symbol == 'x' ? 'x' : 'circle')

    for (let i = 0; i < cells.length; i++) {

        if (cells[i].classList.contains('x')) {
            board[i] = 'x';
        }

        if (cells[i].classList.contains('circle')) {
            board[i] = 'o';
        }
        cells[i].removeEventListener('click', makeMove);
    }

    isTurn = false
    game.board = board;
    socket.send(JSON.stringify({ 'method': 'makeMove', 'game': game }))
    
}

connectToSocketServer();
