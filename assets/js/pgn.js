/* Strictly use for pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png" */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pgn-viewer").forEach(initViewer);
});

function initViewer(container) {
  const boardEl = container.querySelector(".board");
  const pgnDisplay = container.querySelector(".pgnDisplay");
  const pgnEl = container.querySelector("pgn");

  const startBtn = container.querySelector(".startBtn");
  const prevBtn  = container.querySelector(".prevBtn");
  const nextBtn  = container.querySelector(".nextBtn");
  const endBtn   = container.querySelector(".endBtn");

  const game = new Chess();
  const rawPGN = pgnEl.textContent.trim();
  pgnEl.style.display = "none";

  game.load_pgn(rawPGN);
  const moves = game.history(); // SAN list
  game.reset();

  let currentMove = 0;

  const board = Chessboard(boardEl, {
    position: "start",
    draggable: false,
    pieceTheme:
      "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png"
  });

  function updateBoard() {
    board.position(game.fen());
    renderPGN();
  }

  function renderPGN() {
    let html = "";

    moves.forEach((move, i) => {
      if (i % 2 === 0) {
        html += `${Math.floor(i / 2) + 1}. `;
      }

      const active = i === currentMove - 1 ? "active-move" : "";
      html += `<span class="pgn-move ${active}" data-index="${i}">${move}</span> `;
    });

    pgnDisplay.innerHTML = html;

    pgnDisplay.querySelectorAll(".pgn-move").forEach(span => {
      span.onclick = () => goToMove(+span.dataset.index);
    });
  }

  function goToMove(index) {
    game.reset();
    currentMove = 0;

    for (let i = 0; i <= index; i++) {
      game.move(moves[i]);
      currentMove++;
    }
    updateBoard();
  }

  startBtn.onclick = () => {
    game.reset();
    currentMove = 0;
    updateBoard();
  };

  endBtn.onclick = () => {
    goToMove(moves.length - 1);
  };

  nextBtn.onclick = () => {
    if (currentMove >= moves.length) return;
    game.move(moves[currentMove]);
    currentMove++;
    updateBoard();
  };

  prevBtn.onclick = () => {
    if (currentMove <= 0) return;
    game.undo();
    currentMove--;
    updateBoard();
  };

  // Keyboard navigation (← →)
  container.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextBtn.click();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevBtn.click();
    }
  });

  // focus on click
  container.addEventListener("click", () => container.focus());

  updateBoard();
}
