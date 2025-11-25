console.log("RAW PGN RECEIVED BY BROWSER:");
console.log("----START----");
console.log(scriptTag.textContent);
console.log("----END----");

// pgn-viewer.js
// Requires: chess.js + chessboard.js

document.addEventListener("DOMContentLoaded", () => {
  const sources = document.querySelectorAll("script.pgn-source");

  sources.forEach((scriptTag, index) => {
    const container = scriptTag.previousElementSibling;
    if (!container || !container.classList.contains("pgn-viewer")) return;

    // Read exactly the PGN (no escaping)
    let rawPGN = scriptTag.textContent || "";

    // Normalize edges only — internal formatting stays as-is
    let pgn = rawPGN.replace(/^\s*\n/, "").replace(/\s+$/, "");

    // -----------------------------------------------------------------
    // Validate with Chess.js (robust PGN parsing with tags + comments)
    // -----------------------------------------------------------------
    const chess = new Chess();
    const ok = chess.load_pgn(pgn, { sloppy: true });

    if (!ok) {
      container.innerHTML = `
        <div style="color:red; font-weight:bold;">
          Invalid PGN
        </div>
        <pre style="white-space:pre-wrap; font-size:0.8em; margin-top:0.5em;">
${pgn}
        </pre>
      `;
      return;
    }

    // -----------------------------------------------------------------
    // Build simple markup for moves
    // -----------------------------------------------------------------
    const moves = chess.history({ verbose: true });
    let moveHtml = "";

    for (let i = 0; i < moves.length; i += 2) {
      const white = moves[i];
      const black = moves[i + 1];

      moveHtml += `
        <div class="move-row">
          <span class="move-num">${(i / 2) + 1}.</span>
          <span class="white">${white.san}</span>
          <span class="black">${black ? black.san : ""}</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="pgn-block">
        <div class="pgn-moves">${moveHtml}</div>
      </div>
    `;
  });
});
