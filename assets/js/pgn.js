// assets/js/chess/pgn.js
// Turn <pgn>...</pgn> into a structured chess blog post.
// Requires chess.js and chessboard.js to be loaded first.

(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: Chess (chess.js) is not loaded.");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: Chessboard (chessboard.js) is not loaded.");
      return false;
    }
    return true;
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    const year = dateStr.split(".")[0];
    return year || "";
  }

  function createBoard(id, fenOrStart) {
    Chessboard(id, {
      position: fenOrStart === "start" ? "start" : fenOrStart,
      draggable: false,
      pieceTheme: PIECE_THEME_URL
    });
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    const raw = el.textContent.trim();
    if (!raw) return;

    const game = new Chess();
    const ok = game.load_pgn(raw, { sloppy: true });
    if (!ok) {
      console.warn("pgn.js: Could not load PGN", raw);
      return;
    }

    // Headers from chess.js
    const headers = game.header ? game.header() : {};

    const whiteTitle = headers.WhiteTitle || "";
    const whiteName = headers.White || "White";
    const whiteElo = headers.WhiteElo ? `(${headers.WhiteElo})` : "";

    const blackTitle = headers.BlackTitle || "";
    const blackName = headers.Black || "Black";
    const blackElo = headers.BlackElo ? `(${headers.BlackElo})` : "";

    const event = headers.Event || "";
    const year = extractYear(headers.Date);

    const whiteLine = [whiteTitle, whiteName, whiteElo].filter(Boolean).join(" ");
    const blackLine = [blackTitle, blackName, blackElo].filter(Boolean).join(" ");

    // Get moves (verbose) then reset to start for stepping
    const moves = game.history({ verbose: true });
    game.reset();

    // Wrapper for everything
    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2: players
    const h2 = document.createElement("h2");
    h2.textContent = `${whiteLine} – ${blackLine}`.trim();
    wrapper.appendChild(h2);

    // H3: event + year
    const h3 = document.createElement("h3");
    h3.textContent = year ? `${event}, ${year}` : event;
    wrapper.appendChild(h3);

    // Starting position diagram
    const startBoard = document.createElement("div");
    const startBoardId = `pgn-start-board-${index}`;
    startBoard.id = startBoardId;
    startBoard.className = "pgn-board";
    wrapper.appendChild(startBoard);
    createBoard(startBoardId, "start");

    // Paragraphs of moves + diagrams every 5 full moves
    let p = document.createElement("p");
    let fullMoveCount = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const isWhite = m.color === "w";
      const moveNumber = Math.floor(i / 2) + 1;

      const text = isWhite
        ? `${moveNumber}. ${m.san}`
        : m.san;

      const span = document.createElement("span");
      span.textContent = text + " ";
      p.appendChild(span);

      // Advance game position
      game.move(m.san);

      // After each Black move, count a full move
      if (!isWhite) {
        fullMoveCount++;

        if (fullMoveCount % 5 === 0) {
          // Finish this paragraph
          wrapper.appendChild(p);

          // Insert diagram at current position
          const boardDiv = document.createElement("div");
          const boardId = `pgn-board-${index}-${fullMoveCount}`;
          boardDiv.id = boardId;
          boardDiv.className = "pgn-board";
          wrapper.appendChild(boardDiv);
          createBoard(boardId, game.fen());

          // Start new paragraph
          p = document.createElement("p");
        }
      }
    }

    // Append last paragraph if it has content
    if (p.textContent.trim().length > 0) {
      wrapper.appendChild(p);
    }

    // Replace <pgn> with our generated block
    el.replaceWith(wrapper);

    // Let figurine.js convert SAN to figurines inside this block
    if (window.ChessFigurine && typeof window.ChessFigurine.run === "function") {
      window.ChessFigurine.run(wrapper);
    }
  }

  function renderAllPGNs(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("pgn");
    nodes.forEach((el, i) => renderPGNElement(el, i));
  }

  function init() {
    renderAllPGNs(document);

    // Optional: expose manual API
    window.PGNRenderer = {
      run: (root) => renderAllPGNs(root || document)
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
