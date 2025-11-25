// -----------------------------
// SANITIZING LAYER
// -----------------------------
function sanitizePgn(rawPgn) {
    let pgn = rawPgn;

    // Restore HTML entities
    const entityMap = {
        '&quot;': '"',
        '&#39;': "'",
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&#123;': '{',
        '&#125;': '}'
    };
    pgn = pgn.replace(/&[a-zA-Z0-9#]+;/g, m => entityMap[m] || m);

    // Remove markdown-generated tags
    pgn = pgn.replace(/<br\s*\/?>/gi, "\n");
    pgn = pgn.replace(/<\/?p>/gi, "\n");

    // Remove indentation
    pgn = pgn.replace(/^[ \t]+/gm, "");

    // Normalize endings
    pgn = pgn.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Remove invisible chars
    pgn = pgn.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Ensure blank line between headers and moves
    pgn = pgn.replace(/(\]\s*\n)(?=\d+\.)/g, "$1\n");

    // Remove extra blank lines
    pgn = pgn.replace(/\n{3,}/g, "\n\n");

    // Fix glued moves like "e4e5"
    pgn = pgn.replace(/([a-hRNBQKO0-9][a-z0-9=+#]*)(?=[A-Za-z])/g, "$1 ");

    return pgn.trim();
}

// -----------------------------
// PGN → Move list formatter
// -----------------------------
function formatMovesWithComments(pgn, game) {
    const moves = game.history({ verbose: true });
    const comments = game.get_comments();
    let html = "";
    let ply = 1;

    for (let i = 0; i < moves.length; i++) {
        let move = moves[i];
        let moveNum = Math.floor(i / 2) + 1;
        let isWhite = (i % 2 === 0);

        // Start new move number for white
        if (isWhite) html += `<span class="move-num">${moveNum}.</span> `;

        // Move link
        html += `<a href="#" class="goto" data-ply="${i+1}">${move.san}</a> `;

        // Comment for this move
        let com = comments.find(c => c.fen === game.fen());
        if (com) html += `<span class="comment">${com.comment}</span> `;

        // Add spacing between white…black pairs
        if (!isWhite) html += " ";
    }

    return html;
}

// -----------------------------
// INSERT PGN VIEWERS
// -----------------------------
$(document).ready(function () {

    $("pgn").each(function (index) {
        let rawPgn = $(this).html();
        let cleanPgn = sanitizePgn(rawPgn);

        let game = new Chess();
        if (!game.load_pgn(cleanPgn)) {
            $(this).replaceWith("<div style='color:red;'>Invalid PGN</div>");
            return;
        }

        // Create viewer container
        let viewerId = "pgnviewer_" + index;
        let boardId = "board_" + index;
        let movesId = "moves_" + index;

        let html = `
            <div id="${viewerId}" class="pgn-viewer">
                <div id="${boardId}" style="width: 350px;"></div>
                <button class="prev">Prev</button>
                <button class="next">Next</button>
                <div id="${movesId}" class="moves" style="margin-top:10px;"></div>
            </div>
        `;

        $(this).replaceWith(html);

        // INIT BOARD
        let board = Chessboard(boardId, {
            position: "start",
            pieceTheme: "https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/dist/img/chesspieces/wikipedia/{piece}.png"
        });

        // Parse moves + comments
        let formatted = formatMovesWithComments(cleanPgn, game);
        $("#" + movesId).html(formatted);

        // MOVE INDEX
        let ply = 0;

        function updateBoard() {
            let g = new Chess();
            let history = g.history({ verbose: true });

            for (let i = 0; i < ply; i++) g.move(game.history({ verbose: true })[i]);

            board.position(g.fen());
        }

        // BUTTON HANDLERS
        $("#" + viewerId + " .prev").on("click", function () {
            if (ply > 0) ply--;
            updateBoard();
        });

        $("#" + viewerId + " .next").on("click", function () {
            if (ply < game.history().length) ply++;
            updateBoard();
        });

        // CLICK MOVE TO JUMP
        $("#" + movesId).on("click", ".goto", function (e) {
            e.preventDefault();
            ply = parseInt($(this).data("ply"));
            updateBoard();
        });
    });
});
