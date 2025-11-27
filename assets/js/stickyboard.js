// assets/js/stickyboard.js
(function () {
    "use strict";

    if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
        console.warn("stickyboard.js: chess.js or chessboard.js missing");
        return;
    }

    var PIECE_THEME_URL =
        "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

    var StickyBoard = {
        board: null,
        moves: [],

        initBoard() {
            if (document.getElementById("sticky-chessboard")) return;

            var div = document.createElement("div");
            div.id = "sticky-chessboard";
            document.body.appendChild(div);

            this.board = Chessboard("sticky-chessboard", {
                position: "start",
                draggable: false,
                pieceTheme: PIECE_THEME_URL
            });
        },

        loadMoves(history) {
            this.moves = history;
        },

        showPosition(plyIndex) {
            var temp = new Chess();
            for (var i = 0; i < plyIndex && i < this.moves.length; i++) {
                temp.move(this.moves[i]);
            }
            this.board.position(temp.fen());
        },

        activate(root) {
            this.initBoard();

            var blocks = (root || document).querySelectorAll(".pgn-blog-block");

            blocks.forEach(block => {
                // Load game history
                var g = new Chess();
                g.load_pgn(block.innerText.replace(/\n/g, " "), { sloppy: true });
                this.loadMoves(g.history({ verbose: true }));

                var plyCounter = 0;

                // Find all moves
                var spans = block.querySelectorAll("span");
                spans.forEach(span => {
                    var txt = span.textContent.trim();

                    var isSAN =
                        /(O-O|O-O-O|[KQRBN♔♕♖♗♘]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?)/.test(txt);

                    var isMoveNumber = /^\d+\./.test(txt);

                    if (isSAN || isMoveNumber) {
                        span.classList.add("sticky-move");
                        span.style.cursor = "pointer";

                        // Move only increments on SAN
                        if (isSAN) {
                            span.dataset.ply = plyCounter;
                            plyCounter++;
                        } else {
                            // Move number
                            span.dataset.ply = plyCounter;
                        }

                        span.addEventListener("click", () => {
                            var p = parseInt(span.dataset.ply, 10);
                            StickyBoard.showPosition(p);
                        });
                    }
                });
            });
        }
    };

    // Inject CSS
    var style = document.createElement("style");
    style.textContent = `
#sticky-chessboard {
    position: fixed;
    bottom: 1.2rem;
    right: 1.2rem;
    width: 300px !important;
    height: 300px !important;
    z-index: 9999;
    border: 2px solid #444;
    background: #fff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    border-radius: 4px;
}

.sticky-move:hover {
    text-decoration: underline;
}
`;
    document.head.appendChild(style);

    // Wait for PGNRenderer to finish
    document.addEventListener("DOMContentLoaded", () => {
        if (window.PGNRenderer && window.PGNRenderer.run) {
            StickyBoard.activate(document);
        } else {
            // Retry after PGNRenderer loads
            setTimeout(() => StickyBoard.activate(document), 300);
        }
    });

})();
