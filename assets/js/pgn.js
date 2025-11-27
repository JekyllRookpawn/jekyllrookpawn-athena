// assets/js/chess/pgn.js
// Convert <pgn>...</pgn> into formatted posts with ONE diagram (middle of game)

(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensure() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: Missing chess.js");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: Missing chessboard.js");
      return false;
    }
    return true;
  }

  const pendingBoards = [];

  function queueBoard(id, fenOrStart) {
    pendingBoards.push({ id, fen: fenOrStart });
  }

  function initAllBoards() {
    pendingBoards.forEach(({ id, fen }) => {
      const el = document.getElementById(id);
      if (el) {
        Chessboard(id, {
          position: fen === "start" ? "start" : fen,
          draggable: false,
          pieceTheme: PIECE_THEME_URL
        });
      }
    });
    pendingBoards.length = 0;
  }

  function extractYear(dateStr) {
    return dateStr?.split(".")[0] || "";
  }

  function renderPGNElement(el, index) {
    if (!ensure()) return;

    const raw = el.textContent.trim();
    const game = new Chess();

    const ok = game.load_pgn(raw, { sloppy: true });
    if (!ok) {
      console.warn("pgn.js: Could not parse PGN:", raw);
      return;
    }

    const headers = game.header();
    const white = [headers.WhiteTitle, headers.White, headers.WhiteElo && `(${headers.WhiteElo})`]
      .filter(Boolean).join(" ");
    const black = [headers.BlackTitle, headers.Black, headers.BlackElo && `(${headers.BlackElo})`]
      .filter(Boolean).join(" ");

    const event = headers.Event || "";
    const year = extractYear(headers.Date);

    // Get moves (verbose)
    const moves = game.history({ verbose: true });
    game.reset();

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2 + H3
    const h2 = document.createElement("h2");
    h2.textContent = `${white} – ${black}`;
    wrapper.appendChild(h2);

    const h3 = document.createElement("h3");
    h3.textContent = year ? `${event}, ${year}` : event;
    wrapper.appendChild(h3);

    // --------------------------------------------
    // ONE DIAGRAM FOR THE MIDDLE OF THE GAME
    // --------------------------------------------

    // Start from the beginning, walk moves until halfway
    const halfIndex = Math.floor(moves.length / 2);
    game.reset();
    for (let i = 0; i < halfIndex; i++) {
      game.move(moves[i].san);
    }

    const middleFen = game.fen();

    // Insert middle-game diagram
    const midId = `pgn-middle-${index}`;
    const midDiv = document.createElement("div");
    midDiv.id = midId;
    midDiv.className = "pgn-board";
    wrapper.appendChild(midDiv);

    queueBoard(midId, middleFen);

    // --------------------------------------------
    // Moves (continous paragraph, no break)
    // --------------------------------------------
    game.reset();
    const p = document.createElement("p");

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const isWhite = m.color === "w";
      const moveNo = Math.floor(i / 2) + 1;

      const span = document.createElement("span");
      span.textContent = isWhite ? `${moveNo}. ${m.san} ` : `${m.san} `;
      p.appendChild(span);
    }

    wrapper.appendChild(p);

    // Replace <pgn> block
    el.replaceWith(wrapper);

    initAllBoards();

    // Figurine conversion AFTER PGN rendering
    if (window.ChessFigurine) ChessFigurine.run(wrapper);
  }

  function renderAll(root = document) {
    root.querySelectorAll("pgn").forEach((el, i) => renderPGNElement(el, i));
  }

  function init() {
    renderAll();
    window.PGNRenderer = { run: (r) => renderAll(r || document.body) };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
