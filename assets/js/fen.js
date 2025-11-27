// assets/js/chess/fen.js
// Renders <fen>...</fen> tags as chessboard.js diagrams
(function () {
  "use strict";

  // Hard requirement: chessboard.js must be loaded globally
  // Chessboard(...) must be available

  function renderFENElement(el, index) {
    const fenText = el.textContent.trim();
    if (!fenText) return;

    // Create a wrapper div to replace the <fen> tag
    const boardId = "fen-board-" + index;
    const container = document.createElement("div");
    container.className = "fen-board";
    container.id = boardId;

    // Replace <fen> with the board container
    el.replaceWith(container);

    // Initialize chessboard.js
    Chessboard(boardId, {
      position: fenText,
      draggable: false
    });
  }

  function renderAllFENs(root = document) {
    const fenTags = root.querySelectorAll("fen");
    fenTags.forEach((el, i) => renderFENElement(el, i));
  }

  // MutationObserver: re-render if new <fen> nodes appear dynamically
  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches && node.matches("fen")) {
                renderAllFENs(node.parentNode || document);
              }
              // Also check inside this subtree
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

  // Initialize at DOM ready
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