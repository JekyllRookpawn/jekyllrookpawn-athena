var board = null;
        var game = null;
        var moveHistory = []; 
        var currentMove = -1;
        var moveNotation = []; // Stores the move objects with SAN notation

        // Function to jump to a specific move index
        function jumpToMove(index) {
            currentMove = index;
            displayPosition();
        }

        function displayPosition() {
            if (currentMove < 0) {
                board.position('start');
            } else if (currentMove < moveHistory.length) {
                board.position(moveHistory[currentMove].fen, false);
            }

            // Update button states
            // FIX: Only disable when currentMove is -1 (start position), not 0 (after first move).
            $('#startBtn').prop('disabled', currentMove < 0);
            $('#prevBtn').prop('disabled', currentMove < 0);
            
            // Disable forward buttons at the end
            $('#nextBtn').prop('disabled', currentMove === moveHistory.length - 1);
            $('#endBtn').prop('disabled', currentMove === moveHistory.length - 1);
            
            // Highlight current move
            $('#pgnDisplay a').removeClass('highlight');
            if (currentMove >= 0) {
                $(`#move-link-${currentMove}`).addClass('highlight');
            }
        }

        function toStart() {
            currentMove = -1;
            displayPosition();
        }

        function prevMove() {
            if (currentMove > -1) {
                currentMove--;
                displayPosition();
            }
        }

        function nextMove() {
            if (currentMove < moveHistory.length - 1) {
                currentMove++;
                displayPosition();
            }
        }

        function toEnd() {
            currentMove = moveHistory.length - 1;
            displayPosition();
        }

        $(document).ready(function() {
            if (typeof Chess === 'undefined' || typeof Chessboard === 'undefined') {
                console.error('Error: Libraries failed to load.'); 
                return;
            }

            let pgnString = $('#game-pgn').html();
            
            if (pgnString) {
                pgnString = pgnString.trim();
            }

            if (!pgnString) {
                console.error('Error: No PGN found in the script tag.');
                return;
            }

            try {
                game = new Chess();
                
                if (!game.load_pgn(pgnString, { sloppy: true })) {
                    console.error("Error: PGN parsing failed.", pgnString);
                    return;
                }
            } catch (e) {
                console.error("Error initializing chess.js or loading PGN:", e);
                return;
            }
            
            // 1. Get all moves with verbose information
            moveNotation = game.history({ verbose: true });
            
            // 2. Reset board and generate FEN history by replaying moves
            game.reset(); 
            for (let i = 0; i < moveNotation.length; i++) {
                game.move(moveNotation[i]);
                moveHistory.push({
                    fen: game.fen(),
                    turn: game.turn(),
                    ply: game.history().length
                });
            }

            // 3. Construct PGN HTML with clickable links
            let pgnHtml = '';
            for (let i = 0; i < moveNotation.length; i++) {
                const move = moveNotation[i];

                if (i % 2 === 0) {
                    // White's move: include move number
                    const moveNumber = Math.floor(i / 2) + 1;
                    // Use strong tag for move number for better visibility
                    pgnHtml += ` <strong>${moveNumber}.</strong> `;
                }

                // Create the clickable link for the half-move
                pgnHtml += `<a href="#" id="move-link-${i}" onclick="jumpToMove(${i}); return false;">${move.san}</a> `;
            }
            $('#pgnDisplay').html(pgnHtml);

            // 4. Initialize the board
            const boardConfig = {
                draggable: false,
                position: 'start',
                pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
            };
            board = Chessboard('board', boardConfig);

            toStart();
        });