// assets/js/chess/pgn.js
(function () {
  "use strict";

  var PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    return !(typeof Chess === "undefined" || typeof Chessboard === "undefined");
  }

  function normalizeResult(str) {
    if (!str) return "";
    return str.replace(/1\/2-1\/2/g, "½-½");
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
    var parts = dateStr.split(".");
    if (!parts.length) return "";
    if (/^\d{4}$/.test(parts[0])) return parts[0];
    return "";
  }

  // Strip comments but store them
  function extractComments(raw) {
    var comments = [];
    var cleaned = raw.replace(/\{([^}]+)\}/g, function (_, text) {
      comments.push(text.trim());
      return "";
    });
    return { cleaned: cleaned, comments: comments };
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    raw = normalizeResult(raw);

    // Extract comments
    var extraction = extractComments(raw);
    var strippedPGN = extraction.cleaned;
    var comments = extraction.comments;

    var game = new Chess();
    var ok = game.load_pgn(strippedPGN, { sloppy: true });

    if (!ok) {
      console.warn("pgn.js: Could not parse PGN");
      return;
    }

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");

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
    var eventLine = eventName + (year ? ", " + year : "");

    var moves = game.history({ verbose: true });
    game.reset();

    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // Heading
    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    // Middle index
    var half = Math.floor(moves.length / 2);

    // ------------------------------------
    // FIRST HALF MOVES
    // ------------------------------------
    var p1 = document.createElement("p");

    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var isWhite = m.color === "w";
      var moveNo = Math.floor(i / 2) + 1;

      var span = document.createElement("span");
      span.textContent = isWhite ? moveNo + ". " + m.san + " " : m.san + " ";
      p1.appendChild(span);

      if (i === half - 1) break;
    }

    wrapper.appendChild(p1);

    // ------------------------------------
    // MID DIAGRAM
    // ------------------------------------
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

    // ------------------------------------
    // COMMENTS paragraph (if any)
    // ------------------------------------
    if (comments.length > 0) {
      var commentWrap = document.createElement("p");
      commentWrap.className = "pgn-comments";

      for (var c = 0; c < comments.length; c++) {
        var line = document.createElement("div");
        line.textContent = comments[c];
        commentWrap.appendChild(line);
      }

      wrapper.appendChild(commentWrap);
    }

    // ------------------------------------
    // SECOND HALF MOVES
    // ------------------------------------
    var p2 = document.createElement("p");

    for (var j = half; j < moves.length; j++) {
      var mm = moves[j];
      var isWhite2 = mm.color === "w";
      var moveNo2 = Math.floor(j / 2) + 1;

      var span2 = document.createElement("span");
      span2.textContent = isWhite2
        ? moveNo2 + ". " + mm.san + " "
        : mm.san + " ";
      p2.appendChild(span2);
    }

    // Append result to last move
    if (result) {
      var last = p2.lastChild;
      if (last) {
        last.textContent = last.textContent.trim() + " " + result;
      }
    }

    wrapper.appendChild(p2);

    el.replaceWith(wrapper);

    initAllBoards();

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    var nodes = (root || document).querySelectorAll("pgn");
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

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
