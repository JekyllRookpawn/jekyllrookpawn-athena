// pgn-viewer.js
// Requires chess.js + chessboard.js
document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll('pgn').forEach((tag, index) => {
    const rawPGN = tag.textContent || "";
    console.log(`RAW PGN #${index}:\n${rawPGN}`);

    // --- Sanitize PGN ---
    const pgn = rawPGN.trim()
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\r/g, "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\t+/g, "");

    // --- Create viewer container ---
    tag.innerHTML = `
      <div class="pgn-viewer">
        <div class="board" id="board${index}"></div>
        <div class="meta"></div>
        <div class="moves"></div>
      </div>
    `;

    const container = tag.querySelector('.pgn-viewer');
    const boardEl  = container.querySelector(".board");
    const metaEl   = container.querySelector(".meta");
    const movesEl  = container.querySelector(".moves");

    // --- Parse PGN ---
    const chess = new Chess();
    const loaded = chess.load_pgn(pgn, { sloppy: true });

    if (!loaded) {
      movesEl.innerHTML = `<div style="color:red;font-weight:bold">Invalid PGN</div>`;
      return;
    }

    // --- Metadata ---
    const header = chess.header();
    const wTitle = header.WhiteTitle ? header.WhiteTitle + " " : "";
    const bTitle = header.BlackTitle ? header.BlackTitle + " " : "";
    metaEl.textContent = `${wTitle}${header.White || ""} — ${bTitle}${header.Black || ""}` +
                         `${header.WhiteElo ? ` (${header.WhiteElo})` : ""}` +
                         `${header.BlackElo ? ` (${header.BlackElo})` : ""}\n` +
                         `${header.Site || ""}, ${header.Date || ""}`;

    // --- Move list ---
    const history = chess.history({ verbose: true });
    let moveNumber = 1;
    let html = "";

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      if (move.color === "w") {
        html += `<div class="move-pair"><span class="move-num">${moveNumber}. </span>` +
                `<a href="#" class="mv" data-index="${i}">${move.san}</a> `;
        if (move.comment) html += `<span class="comment">${move.comment}</span> `;
      } else {
        html += `<span class="black-move"><span class="black-num">${moveNumber}... </span>` +
                `<a href="#" class="mv" data-index="${i}">${move.san}</a> `;
        if (move.comment) html += `<span class="comment">${move.comment}</span>`;
        html += `</span></div>`;
        moveNumber++;
      }
    }
    movesEl.innerHTML = html;

    // --- Initialize board ---
    // *******************************************************************
    // FIX: Added pieceTheme to point to the CDN for piece images
    // *******************************************************************
    const board = Chessboard(boardEl, {
      position: chess.fen(),
      pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
    // *******************************************************************

    // --- Click moves to jump to position ---
    movesEl.querySelectorAll(".mv").forEach(a => {
      a.addEventListener("click", evt => {
        evt.preventDefault();
        const idx = parseInt(a.dataset.index, 10);
        const replay = new Chess();
        const hist = chess.history({ verbose: true });
        for (let j = 0; j <= idx; j++) replay.move(hist[j]);
        board.position(replay.fen());
      });
    });

  }); // end forEach
});
