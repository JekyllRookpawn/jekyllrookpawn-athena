// assets/js/chess/fen.js
(function () {
  function renderFENs() {
    document.querySelectorAll("fen").forEach((el, i) => {
      const fen = el.textContent.trim();
      const holder = document.createElement("div");
      holder.className = "fen-board";
      holder.id = "fen-board-" + i;

      el.replaceWith(holder);

      Chessboard(holder.id, {
        position: fen,
        draggable: false
      });
    });
  }

  window.FENRenderer = { render: renderFENs };
})();