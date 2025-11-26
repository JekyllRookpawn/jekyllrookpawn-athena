document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pgn-viewer").forEach(c => {
    const board = Chessboard(c.querySelector(".board"), {
      position: "start"
    });
  });
});
