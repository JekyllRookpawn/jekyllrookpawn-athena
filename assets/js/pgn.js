// assets/js/chess/pgn.js
(function () {
  "use strict";

  var PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
      console.warn("pgn.js: Missing chess.js or chessboard.js");
      return false;
    }
    return true;
  }

  // Convert 1/2-1/2 into ½-½
  function normalizeResult(str) {
    if (!str) return "";
    return str.replace(/1\/2-1\/2/g, "½-½");
  }

  // Queue for board initialization
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

  // Extract year safely from PGN Date
  function extractYear(dateStr) {
    if (!dateStr) return "";
    var parts = dateStr.split(".");
    if (!parts.length) return "";
    var year = parts[0];
    if (!/^\d{4}$/.test(year)) return "";
    return year;
  }

  // Extract comments {…} and variations (…)
  function extractCommentsAndVariations(raw) {
    var comments = [];
    var variations = [];

    // Remove top-level variations and collect them
    function removeVariations(str) {
      var depth = 0;
      var start = -1;
      var out = "";
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];

        if (ch === "(") {
          if (depth === 0) start = i;
          depth++;
        } else if (ch === ")") {
          depth--;
          if (depth === 0 && start !== -1) {
            var inside = str.substring(start + 1, i);
            variations.push(inside.trim());
          }
        } else if (depth === 0) {
          out += ch;
        }
      }
      return out;
    }

    // 1) Strip variations and collect them
    var stripped = removeVariations(raw);

    // 2) Extract comments { ... }
    var cleaned = stripped.replace(/\{([^}]+)\}/g, function (_, text) {
      comments.push(text.trim());
      return "";
    });

    return {
      cleaned: cleaned,
      comments: comments,
      variations: variations
    };
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    raw = normalizeResult(raw);

    // Extract comments and variations
    var extraction = extractCommentsAndVariations(raw);
    var strippedPGN = extraction.cleaned;
    var comments = extraction.comments;
    var variations = extraction.variations;

    // Filter variations: keep only those that look like real SAN sequences
    var flatVariations = [];
    for (var i = 0; i < variations.length; i++) {
      var v = variations[i].trim();

      // Remove nested parentheses inside this variation
      while (/\([^()]*\)/.test(v)) {
        v = v.replace(/\([^()]*\)/g, "");
      }
      v = v.trim();

      // SAN-ish pattern: pieces, pawn moves, move numbers, castling
      var sanPattern = /(O-O|O-O-O|[KQRBN][a-h1-8]|[a-h][1-8]|^\d+\.)/;

      if (sanPattern.test(v)) {
        flatVariations.push(v);
      }
      // else ignore junk like "DERLD"
    }

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

    // Heading: one <h3> with <br>
    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    // Compute halfway ply index
    var half = Math.floor(moves.length / 2);

    // ----------------------------
    // FIRST HALF OF MOVES
    // ----------------------------
    var p1 = document.createElement("p");

    for (var mIndex = 0; mIndex < moves.length; mIndex++) {
      var m = moves[mIndex];
      var isWhite = m.color === "w";
      var moveNo = Math.floor(mIndex / 2) + 1;

      var span = document.createElement("span");
      span.textContent = isWhite
        ? moveNo + ". " + m.san + " "
        : m.san + " ";

      p1.appendChild(span);

      if (mIndex === half - 1) break;
    }

    wrapper.appendChild(p1);

    // ----------------------------
    // VARIATIONS as separate paragraphs (no "Variation:" label)
    // ----------------------------
    if (flatVariations.length > 0) {
      for (var vIdx = 0; vIdx < flatVariations.length; vIdx++) {
        var vP = document.createElement("p");
        vP.className = "pgn-variation";
        vP.textContent = flatVariations[vIdx];
        wrapper.appendChild(vP);
      }
    }

    // ----------------------------
    // MID-GAME DIAGRAM
    // ----------------------------
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

    // ----------------------------
    // COMMENTS PARAGRAPH (only comments now)
    // ----------------------------
    if (comments.length > 0) {
      var commentWrap = document.createElement("p");
      commentWrap.className = "pgn-comments";

      for (var c = 0; c < comments.length; c++) {
        var comLine = document.createElement("div");
        comLine.textContent = comments[c];
        commentWrap.appendChild(comLine);
      }

      wrapper.appendChild(commentWrap);
    }

    // ----------------------------
    // SECOND HALF OF MOVES
    // ----------------------------
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

    // Append result inline to last move
    if (result) {
      var lastSpan = p2.lastChild;
      if (lastSpan) {
        lastSpan.textContent = lastSpan.textContent.trim() + " " + result;
      }
    }

    wrapper.appendChild(p2);

    // Replace original <pgn> element
    el.replaceWith(wrapper);

    // Initialize any pending boards
    initAllBoards();

    // Apply figurine conversion to the rendered block
    if (window.ChessFigurine && typeof window.ChessFigurine.run === "function") {
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
