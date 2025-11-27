// assets/js/chess/pgn.js
// Parse <pgn>...</pgn> blocks into structured posts with diagrams.

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

  function extractYear(dateStr) {
    return dateStr?.split(".")[0] || "";
  }

  // ---------------------------------------
  // DEFERRED BOARD INITIALIZATION QUEUE
  // ---------------------------------------
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
      } else {
        console.warn("Board container not found:", id);
      }
    });
    pendingBoards.length = 0;
  }

  // ---------------------------------------

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

    const moves = game.history({ verbose: true });
    game.reset();

    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2
    const h2 = document.createElement("h2");
    h2.textContent = `${white} – ${black}`;
    wrapper.appendChild(h2);

    // H3
    const h3 = document.createElement("h3");
    h3.textContent = year ? `${event}, ${year}` : event;
    wrapper.appendChild(h3);

    // START DIAGRAM
    const startId = `pgn-start-${index}`;
    const startDiv = document.createElement("div");
    startDiv.id = startId;
    startDiv.className = "pgn-board";
    wrapper.appendChild(startDiv);

    // Queue board creation AFTER DOM insertion
    queueBoard(startId, "start");

    // Paragraphs & diagrams every 5 full moves
    let p = document.createElement("p");
    let fullMoveCount = 0;

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const isWhite = m.color === "w";
      const moveNumber = Math.floor(i / 2) + 1;

      const span = document.createElement("span");
      span.textContent = isWhite ? `${moveNumber}. ${m.san} ` : `${m.san} `;
      p.appendChild(span);

      game.move(m.san);

      if (!isWhite) {
        fullMoveCount++;
        if (fullMoveCount % 5 === 0) {
          wrapper.appendChild(p);

          const diagId = `pgn-diag-${index}-${fullMoveCount}`;
          const diag = document.createElement("div");
          diag.id = diagId;
          diag.className = "pgn-board";
          wrapper.appendChild(diag);

          // Queue this board for later initialization
          queueBoard(diagId, game.fen());

          p = document.createElement("p");
        }
      }
    }

    if (p.textContent.trim()) wrapper.appendChild(p);

    // Replace <pgn> with wrapper
    el.replaceWith(wrapper);

    // Convert SAN → figurine after building structure
    if (window.ChessFigurine) ChessFigurine.run(wrapper);
  }

  function renderAll(root = document) {
    root.querySelectorAll("pgn").forEach((el, i) => renderPGNElement(el, i));
    initAllBoards(); // <-- initialize all boards AFTER DOM is complete
  }

  function init() {
    renderAll();
    window.PGNRenderer = { run: (r) => renderAll(r || document.body) };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();