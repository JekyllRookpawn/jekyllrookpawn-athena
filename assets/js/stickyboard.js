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
        moveSpans: [],
        currentPly: -1, // -1 = initial position (before moves)

        initBoard() {
            if (document.getElementById("sticky-chessboard")) return;

            var div = document.createElement("div");
            div.id = "sticky-chessboard";
            div.className = "sticky-chessboard";
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

        // ⭐ Apply moves up to (and including) plyIndex
        showPosition(plyIndex) {
            this.currentPly = plyIndex;

            var temp = new Chess();
            for (var i = 0; i <= plyIndex && i < this.moves.length; i++) {
                temp.move(this.moves[i]);
            }
            this.board.position(temp.fen());

            this.highlightMove(plyIndex);
        },

        highlightMove(plyIndex) {
            this.moveSpans.forEach(s => s.classList.remove("sticky-move-active"));

            var span = this.moveSpans.find(s => parseInt(s.dataset.ply, 10) === plyIndex);
            if (span) span.classList.add("sticky-move-active");
        },

        gotoNext() {
            if (this.currentPly + 1 < this.moves.length) {
                this.showPosition(this.currentPly + 1);
            }
        },

        gotoPrev() {
            if (this.currentPly - 1 >= -1) {
                this.showPosition(this.currentPly - 1);
            }
        },

        activate(root) {
            this.initBoard();

            var blocks = (root || document).querySelectorAll(".pgn-blog-block");

            blocks.forEach(block => {

                if (block._pgnHistory) {
                    StickyBoard.loadMoves(block._pgnHistory);
                } else {
                    console.warn("stickyboard.js: no _pgnHistory found");
                    return;
                }

                this.moveSpans = [];
                var plyCounter = 0;

                var spans = block.querySelectorAll("span");

                spans.forEach(span => {
                    var text = span.textContent
                        .replace(/^\d+\.+/, "")
                        .trim();

                    var isSAN =
                        /(O-O|O-O-O|[KQRBN♔♕♖♗♘]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?)/.test(text);

                    var isMoveNumber = /^\d+\./.test(span.textContent.trim());

                    if (isSAN || isMoveNumber) {
                        span.classList.add("sticky-move");
                        span.style.cursor = "pointer";

                        if (isSAN) {
                            span.dataset.ply = plyCounter;
                            this.moveSpans.push(span);
                            plyCounter++;
                        } else {
                            span.dataset.ply = plyCounter;
                        }

                        span.addEventListener("click", () => {
                            var p = parseInt(span.dataset.ply, 10);
                            StickyBoard.showPosition(p);
                        });
                    }
                });
            });

            // ⭐ Keyboard navigation
            window.addEventListener("keydown", (e) => {
                if (e.key === "ArrowRight") {
                    this.gotoNext();
                }
                if (e.key === "ArrowLeft") {
                    this.gotoPrev();
                }
            });
        }
    };


    // ===== CSS =====
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

.sticky-move-active {
    background: #ffe38a;
    border-radius: 4px;
    padding: 2px 4px;
}
`;
    document.head.appendChild(style);


    document.addEventListener("DOMContentLoaded", () => {
        if (window.PGNRenderer && window.PGNRenderer.run) {
            StickyBoard.activate(document);
        } else {
            setTimeout(() => StickyBoard.activate(document), 300);
        }
    });

})();