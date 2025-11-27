(function () {

  function createViewer(pgnText, index) {
    const chess = new Chess();
    chess.loadPgn(pgnText);

    const moves = chess.history({ verbose: true });
    chess.reset();

    let current = 0;

    const wrapper = document.createElement("div");
    wrapper.className = "pgn-viewer";

    const boardEl = document.createElement("div");
    const movesEl = document.createElement("div");

    boardEl.id = "pgn-board-" + index;
    boardEl.className = "pgn-board";
    movesEl.className = "pgn-moves";

    wrapper.append(boardEl, movesEl);

    const board = Chessboard(boardEl.id, {
      position: "start",
      draggable: false
    });

    function updateBoard() {
      chess.reset();
      for (let i = 0; i < current; i++) chess.move(moves[i]);
      board.position(chess.fen());
      highlight();
    }

    function highlight() {
      movesEl.querySelectorAll("span").forEach((el, i) => {
        el.classList.toggle("active", i === current - 1);
      });
    }

    moves.forEach((m, i) => {
      const span = document.createElement("span");
      span.className = "figurine";
      span.textContent = m.san;
      span.addEventListener("click", () => {
        current = i + 1;
        updateBoard();
      });
      movesEl.appendChild(span);
    });

    wrapper.tabIndex = 0;
    wrapper.addEventListener("keydown", e => {
      if (e.key === "ArrowRight" && current < moves.length) {
        current++;
        updateBoard();
      }
      if (e.key === "ArrowLeft" && current > 0) {
        current--;
        updateBoard();
      }
    });

    ChessFigurine.render(wrapper);
    return wrapper;
  }

  function renderPGNs() {
    document.querySelectorAll("pgn").forEach((el, i) => {
      const viewer = createViewer(el.textContent.trim(), i);
      el.replaceWith(viewer);
    });
  }

  window.PGNRenderer = { render: renderPGNs };
})();