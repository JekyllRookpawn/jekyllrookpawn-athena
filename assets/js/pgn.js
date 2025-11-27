// assets/js/chess/pgn.js
// Converts <pgn>...</pgn> into a fully formatted chess blog post

(function () {
  "use strict";

  // PIECE THEME (Wikipedia set)
  const PIECE_THEME_URL = "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function parseHeaders(headerText) {
    const headers = {};
    const regex = /\[(\w+)\s+"([^"]*)"\]/g;
    let m;
    while ((m = regex.exec(headerText))) {
      headers[m[1]] = m[2];
    }
    return headers;
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    const year = dateStr.split(".")[0];
    return year || "";
  }

  function createBoard(containerId, fen = "start") {
    Chessboard(containerId, {
      position: fen === "start" ? "start" : fen,
      draggable: false,
      pieceTheme: PIECE_THEME_URL
    });
  }

  function renderPGNElement(el, index) {
    const rawPGN = el.textContent.trim();
    const chess = new Chess();

    chess.loadPgn(rawPGN);
    chess.reset();

    const headerSection = rawPGN.split("\n\n")[0];
    const headers = parseHeaders(headerSection);

    const whiteTitle = headers.WhiteTitle || "";
    const whiteName = headers.White || "White";
    const whiteElo = headers.WhiteElo ? `(${headers.WhiteElo})` : "";

    const blackTitle = headers.BlackTitle || "";
    const blackName = headers.Black || "Black";
    const blackElo = headers.BlackElo ? `(${headers.BlackElo})` : "";

    const event = headers.Event || "";
    const year = extractYear(headers.Date);

    const wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2
    const h2 = document.createElement("h2");
    h2.textContent = `${whiteTitle} ${whiteName} ${whiteElo} – ${blackTitle} ${blackName} ${blackElo}`;
    wrapper.appendChild(h2);

    // H3
    const h3 = document.createElement("h3");
    h3.textContent = `${event}, ${year}`;
    wrapper.appendChild(h3);

    // Start diagram
    const startBoard = document.createElement("div");
    startBoard.id = `pgn-start-board-${index}`;
    startBoard.className = "pgn-board";
    wrapper.appendChild(startBoard);
    createBoard(startBoard.id);

    // Moves + diagrams
    const verboseMoves = chess.history({ verbose: true });
    chess.reset();

    let moveCounter = 0;
    let p = document.createElement("p");

    verboseMoves.forEach((move, i) => {
      const displayMove = move.turn === "w"
        ? `${move.moveNumber}. ${move.san}`
        : `${move.san}`;

      const span = document.createElement("span");
      span.textContent = displayMove + " ";
      p.appendChild(span);

      if (move.turn === "b") moveCounter++;

      if (move.turn === "b" && moveCounter % 5 === 0) {
        wrapper.appendChild(p);

        chess.move(verboseMoves[i]);

        const boardAfter = document.createElement("div");
        const boardId = `pgn-board-${index}-${moveCounter}`;
        boardAfter.id = boardId;
        boardAfter.className = "pgn-board";
        wrapper.appendChild(boardAfter);
        createBoard(boardId, chess.fen());

        p = document.createElement("p");
      }
    });

    if (p.textContent.trim().length > 0) {
      wrapper.appendChild(p);
    }

    el.replaceWith(wrapper);

    if (window.ChessFigurine) {
      window.ChessFigurine.run(wrapper);
    }
  }

  function renderAllPGNs(root = document) {
    root.querySelectorAll("pgn").forEach((el, i) => renderPGNElement(el, i));
  }

  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches && node.matches("pgn")) {
                renderAllPGNs(node.parentNode);
              }
              renderAllPGNs(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.PGNRenderer = {
      run: (root) => renderAllPGNs(root || document),
      disconnectObserver: () => observer.disconnect()
    };
  }

  function init() {
    renderAllPGNs(document);
    observeMutations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
