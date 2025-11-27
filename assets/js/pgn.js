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
    var result = headers.Result || "";

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

    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // Player names
    var h3a = document.createElement("h3");
    h3a.textContent = white + " – " + black;
    wrapper.appendChild(h3a);

    // Event + year
    var h3b = document.createElement("h3");
    h3b.textContent = year ? eventName + ", " + year : eventName;
    wrapper.appendChild(h3b);

    // Determine halfway
    var half = Math.floor(moves.length / 2);

    // -------------------------------------
    // Moves BEFORE diagram
    // -------------------------------------
    var p1 = document.createElement("p");

    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var w = m.color === "w";
      var n = Math.floor(i / 2) + 1;

      var span = document.createElement("span");
      span.textContent = w ? n + ". " + m.san + " " : m.san + " ";
      p1.appendChild(span);

      if (i === half - 1) break;
    }

    wrapper.appendChild(p1);

    // -------------------------------------
    // Middle diagram
    // -------------------------------------
    game.reset();
    for (var x = 0; x < half; x++) {
      game.move(moves[x].san);
    }

    var midFen = game.fen();

    var midId = "pgn-middle-" + index;
    var midDiv = document.createElement("div");
    midDiv.id = midId;
    midDiv.className = "pgn-board";
    wrapper.appendChild(midDiv);

    queueBoard(midId, midFen);

    // -------------------------------------
    // Moves AFTER diagram
    // -------------------------------------
    var p2 = document.createElement("p");

    for (var j = half; j < moves.length; j++) {
      var mm = moves[j];
      var w2 = mm.color === "w";
      var n2 = Math.floor(j / 2) + 1;

      var s2 = document.createElement("span");
      s2.textContent = w2 ? n2 + ". " + mm.san + " " : mm.san + " ";
      p2.appendChild(s2);
    }

    wrapper.appendChild(p2);

    // -------------------------------------
    // ADD FINAL RESULT OF GAME AFTER MOVES
    // -------------------------------------
    if (result) {
      var res = document.createElement("p");
      res.className = "pgn-result";
      res.textContent = result;
      wrapper.appendChild(res);
    }

    // Replace original <pgn>
    el.replaceWith(wrapper);

    initAllBoards();

    // Convert SAN → figurines
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
