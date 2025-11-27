/* Strictly use for pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png" */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pgn-viewer").forEach(initViewer);
});

/* ---------------- FIGURINES ---------------- */

const FIGURINES = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘"
};

function sanToFigurines(san) {
  return san.replace(/[KQRBN]/g, p => FIGURINES[p] || p);
}

/* ---------------- PGN PARSER (DISPLAY ONLY) ---------------- */

function extractMovesCommentsVariations(pgn) {
  // Remove headers
  let body = pgn.replace(/\[.*?\]\s*/g, "");

  const tokens = [];
  let i = 0;

  while (i < body.length) {
    const char = body[i];

    if (char === "{") {
      const end = body.indexOf("}", i);
      tokens.push({ type: "comment", text: body.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    if (char === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < body.length && depth > 0) {
        if (body[j] === "(") depth++;
        if (body[j] === ")") depth--;
        j++;
      }
      tokens.push({ type: "variation", text: body.slice(i + 1, j - 1) });
      i = j;
      continue;
    }

    const moveMatch = body.slice(i).match(/^(\d+\.+)?\s*([^\s{}()]+)/);
    if (moveMatch) {
      tokens.push({ type: "move", san: moveMatch[2] });
      i += moveMatch[0].length;
      continue;
    }

    i++;
  }

  return tokens;
}

/* ---------------- PGN VIEWER ---------------- */

function initViewer(container) {
  const boardEl = container.querySelector(".board");
  const pgnDisplay = container.querySelector(".pgnDisplay");
  const pgnEl = container.querySelector("pgn");

  const startBtn = container.querySelector(".startBtn");
  const prevBtn  = container.querySelector(".prevBtn");
  const nextBtn  = container.querySelector(".nextBtn");
  const endBtn   = container.querySelector(".endBtn");

  const rawPGN = pgnEl.textContent.trim();
  pgnEl.style.display = "none";

  const game = new Chess();
  game.load_pgn(rawPGN);
  const moves = game.history();   // PURE SAN
  game.reset();

  const displayTokens = extractMovesCommentsVariations(rawPGN);

  let currentMove = 0;
  let moveCounter = 0;

  const board = Chessboard(boardEl, {
    position: "start",
    draggable: false,
    pieceTheme:
      "https://cdnjs.cloudflare.com/ajax/libs/chessboard.js/1.0.0/img/chesspieces/wikipedia/{piece}.png"
  });

  function updateBoard() {
    board.position(game.fen());
    renderPGN();
  }

  function renderPGN() {
    let html = "";
    moveCounter = 0;

    displayTokens.forEach(t => {
      if (t.type === "move") {
        const isActive = moveCounter === currentMove - 1;
        const san = moves[moveCounter++] ?? "";

        html += `
          <span class="pgn-move ${isActive ? "active-move" : ""}"
                data-index="${moveCounter - 1}">
            ${sanToFigurines(san)}
          </span> `;
      }

      if (t.type === "comment") {
        html += `<span class="pgn-comment">{${t.text}}</span> `;
      }

      if (t.type === "variation") {
        html += `<span class="pgn-variation">(${t.text})</span> `;
      }
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

  endBtn.onclick = () => goToMove(moves.length - 1);

  nextBtn.onclick = () => {
    if (currentMove < moves.length) {
      game.move(moves[currentMove++]);
      updateBoard();
    }
  };

  prevBtn.onclick = () => {
    if (currentMove > 0) {
      game.undo();
      currentMove--;
      updateBoard();
    }
  };

  /* ---------- Keyboard navigation ---------- */

  container.addEventListener("keydown", e => {
    if (["ArrowRight", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      nextBtn.click();
    }
    if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      prevBtn.click();
    }
  });

  container.addEventListener("click", () => container.focus());

  updateBoard();
}
