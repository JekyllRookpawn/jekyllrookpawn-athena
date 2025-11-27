// assets/js/chess/pgn.js
// Convert <pgn>...</pgn> into formatted blog posts with diagrams.

(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: Chess.js missing");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: Chessboard.js missing");
      return false;
    }
    return true;
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    return dateStr.split(".")[0];
  }

  function createBoard(id, position) {
    Chessboard(id, {
      position: position === "start" ? "start" : position,
      draggable: false,
      pieceTheme: PIECE_THEME_URL
    });
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    const raw = el.textContent.trim();

    const game = new Chess();
    const ok = game.load_pgn(raw, { sloppy: true });   // ✅ correct API

    if (!ok) {
      console.warn("pgn.js: Could not parse PGN:", raw);
      return;
    }

    // Extract headers
    const headers = game.header();

    const whiteTitle = headers.WhiteTitle || "";
    const whiteName  = headers.White || "White";
    const whiteElo   = headers.WhiteElo ? `(${headers.WhiteElo})` : "";

    const blackTitle = headers.BlackTitle || "";
    const blackName  = headers.Black || "Black";
    const blackElo   = headers.BlackElo ? `(${headers.BlackElo})` : "";

    const event = headers.Event || "";
    const year  = extractYear(headers.Date);

    // Combine titles + names + elos
    const whiteLine = [whiteTitle, whiteName, whiteElo].filter(Boolean).join(" ");
    const blackLine = [blackTitle, blackName, blackElo].filter(Boolean).join(" ");

    // Get verbose moves, then reset to start
    const verboseMoves = game.history({ verbose: true });
    game.reset();

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2: players
    const h2 = document.createElement("h2");
    h2.textContent = `${whiteLine} – ${blackLine}`;
    wrapper.appendChild(h2);

    // H3: event + year
    const h3 = document.createElement("h3");
    h3.textContent = year ? `${event}, ${year}` : event;
    wrapper.appendChild(h3);

    // Starting diagram
    const startDiv = document.createElement("div");
    const startId = `pgn-start-${index}`;
    startDiv.id = startId;
    startDiv.className = "pgn-board";
    wrapper.appendChild(startDiv);
    createBoard(startId, "start");

    // Moves grouped into paragraphs
    let p = document.createElement("p");
    let fullMoves = 0;

    for (let i = 0; i < verboseMoves.length; i++) {
      const m = verboseMoves[i];
      const isWhite = m.color === "w";
      const moveNo = Math.floor(i / 2) + 1;

      const text = isWhite ? `${moveNo}. ${m.san}` : m.san;

      const span = document.createElement("span");
      span.textContent = text + " ";
      p.appendChild(span);

      game.move(m.san);

      // Count full moves (after black's move)
      if (!isWhite) {
        fullMoves++;

        if (fullMoves % 5 === 0) {
          wrapper.appendChild(p);

          // Insert diagram after move 5, 10, 15...
          const diag = document.createElement("div");
          const diagId = `pgn-board-${index}-${fullMoves}`;
          diag.id = diagId;
          diag.className = "pgn-board";
          wrapper.appendChild(diag);
          createBoard(diagId, game.fen());

          p = document.createElement("p");
        }
      }
    }

    if (p.textContent.trim()) wrapper.appendChild(p);

    el.replaceWith(wrapper);

    // Convert SAN → figurines
    if (window.ChessFigurine) ChessFigurine.run(wrapper);
  }

  function renderAll(root) {
    root.querySelectorAll("pgn").forEach((el, i) => renderPGNElement(el, i));
  }

  function init() {
    renderAll(document);

    window.PGNRenderer = {
      run: (root) => renderAll(root || document)
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
