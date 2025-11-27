// assets/js/chess/pgn.js
(function () {
  "use strict";

  var PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: chess.js missing");
      return false;
    }
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing");
      return false;
    }
    return true;
  }

  var pendingBoards = [];

  function queueBoard(id, fen) {
    pendingBoards.push({ id: id, fen: fen });
  }

  function initAllBoards() {
    for (var i = 0; i < pendingBoards.length; i++) {
      var item = pendingBoards[i];
      var el = document.getElementById(item.id);
      if (!el) continue;

      Chessboard(item.id, {
        position: item.fen === "start" ? "start" : item.fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    }
    pendingBoards = [];
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    return dateStr.split(".")[0];
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var game = new Chess();
    var ok = game.load_pgn(raw, { sloppy: true });

    if (!ok) {
      console.warn("pgn.js: Could not parse PGN");
      return;
    }

    var headers = game.header();

    var white = [
      headers.WhiteTitle || "",
      headers.White || "",
      headers.WhiteElo ? "(" + headers.WhiteElo + ")" : ""
    ].join(" ").trim();

    var black = [
      headers.BlackTitle || "",
      headers.Black || "",
      headers.BlackElo ? "(" + headers.BlackElo + ")" : ""
    ].join(" ").trim();

    var eventName = headers.Event || "";
    var year = extractYear(headers.Date);

    var moves = game.history({ verbose: true });
    game.reset();

    // Wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // H2
    var h2 = document.createElement("h2");
    h2.textContent = white + " – " + black;
    wrapper.appendChild(h2);

    // H3
    var h3 = document.createElement("h3");
    h3.textContent = year ? eventName + ", " + year : eventName;
    wrapper.appendChild(h3);

    // ---------------------------
    // ONE DIAGRAM AT MID-GAME
    // ---------------------------
    var half = Math.floor(moves.length / 2);

    game.reset();
    for (var i = 0; i < half; i++) {
      game.move(moves[i].san);
    }

    var middleFen = game.fen();

    var midId = "pgn-middle-" + index;
    var midDiv = document.createElement("div");
    midDiv.id = midId;
    midDiv.className = "pgn-board";
    wrapper.appendChild(midDiv);

    queueBoard(midId, middleFen);

    // ---------------------------
    // MOVES IN ONE PARAGRAPH
    // ---------------------------
    var p = document.createElement("p");

    for (var j = 0; j < moves.length; j++) {
      var m = moves[j];
      var isWhite = m.color === "w";
      var moveNo = Math.floor(j / 2) + 1;

      var span = document.createElement("span");
      span.textContent = isWhite
        ? moveNo + ". " + m.san + " "
        : m.san + " ";
      p.appendChild(span);
    }

    wrapper.appendChild(p);

    // Replace original <pgn>
    el.replaceWith(wrapper);

    // Now create all boards
    initAllBoards();

    // Then figurine conversion
    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("pgn");
    for (var i = 0; i < nodes.length; i++) {
      renderPGNElement(nodes[i], i);
    }
    initAllBoards();
  }

  function init() {
    renderAll(document);
    window.PGNRenderer = {
      run: function (root) {
        renderAll(root || document.body);
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
