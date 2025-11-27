// assets/js/chess/fen.js
// Renders <fen>...</fen> tags as chessboard.js diagrams with remote piece theme
(function () {
  "use strict";

  // Set your remote piece theme here:
  const PIECE_THEME_URL = "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";
  // You may replace this with any other theme URL that contains "{piece}"

  function renderFENElement(el, index) {
    const fenText = el.textContent.trim();
    if (!fenText) return;

    const boardId = "fen-board-" + index;
    const container = document.createElement("div");
    container.className = "fen-board";
    container.id = boardId;

    el.replaceWith(container);

    Chessboard(boardId, {
      position: fenText,
      draggable: false,
      pieceTheme: PIECE_THEME_URL   // ← Remote pieces!
    });
  }

  function renderAllFENs(root = document) {
    const fenTags = root.querySelectorAll("fen");
    fenTags.forEach((el, i) => renderFENElement(el, i));
  }

  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches && node.matches("fen")) renderAllFENs(node.parentNode);
              renderAllFENs(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.FENRenderer = {
      run: (root) => renderAllFENs(root || document),
      disconnectObserver: () => observer.disconnect()
    };
  }

  function init() {
    renderAllFENs(document);
    observeMutations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
