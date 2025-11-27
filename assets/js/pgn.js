// assets/js/chess/pgn.js
(function () {
  "use strict";

  var PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  function ensureDeps() {
    if (typeof Chess === "undefined" || typeof Chessboard === "undefined") {
      console.warn("pgn.js: chess.js or chessboard.js missing");
      return false;
    }
    return true;
  }

  function normalizeResult(str) {
    return str ? str.replace(/1\/2-1\/2/g, "½-½") : "";
  }

  function extractYear(dateStr) {
    if (!dateStr) return "";
    var p = dateStr.split(".");
    return /^\d{4}$/.test(p[0]) ? p[0] : "";
  }

  // ---- NAG formatting (!, ?, !!, ??, !?, ?!) --------------------
  function formatNAGs(sanText) {
    sanText = sanText.replace(/!!/, '<span class="nag nag-brilliant">!!</span>');
    sanText = sanText.replace(/\?\?/, '<span class="nag nag-blunder">??</span>');
    sanText = sanText.replace(/!\?/, '<span class="nag nag-interesting">!?</span>');
    sanText = sanText.replace(/\?!/, '<span class="nag nag-dubious">?!</span>');
    sanText = sanText.replace(/!/, '<span class="nag nag-good">!</span>');
    sanText = sanText.replace(/\?/, '<span class="nag nag-mistake">?</span>');
    return sanText;
  }

  // "Surname, Firstname" → "Firstname Surname"
  function flipName(name) {
    if (!name) return "";
    var idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  // ---- Parse movetext, extract events (comments, variations, diagrams)
  function parseMovetext(movetext) {
    var events = [];
    var sanitizedParts = [];
    var i = 0, n = movetext.length;
    var currentPly = 0;
    var varDepth = 0;

    while (i < n) {
      var ch = movetext.charAt(i);

      // COMMENT { ... }
      if (ch === "{") {
        i++;
        var start = i;
        while (i < n && movetext.charAt(i) !== "}") i++;
        var raw = movetext.substring(start, i).trim();

        if (raw === "[D]") {
          events.push({
            type: "diagram",
            plyIndex: currentPly,
            depth: varDepth
          });
        } else {
          events.push({
            type: "comment",
            text: raw,
            plyIndex: currentPly,
            depth: 0
          });
        }

        if (i < n && movetext.charAt(i) === "}") i++;
        continue;
      }

      // VARIATION ( ... )
      if (ch === "(") {
        varDepth++;
        i++;
        var innerStart = i;
        var depth = 1;

        while (i < n && depth > 0) {
          var c2 = movetext.charAt(i);
          if (c2 === "(") depth++;
          else if (c2 === ")") depth--;
          i++;
        }

        var innerEnd = i - 1;
        var inner = movetext.substring(innerStart, innerEnd).trim();

        if (inner === "[D]") {
          events.push({
            type: "diagram",
            plyIndex: currentPly,
            depth: varDepth
          });
        } else if (/(O-O|O-O-O|[KQRBN][a-h1-8]|[a-h][1-8]|^\d+\.)/.test(inner)) {
          events.push({
            type: "variation",
            text: inner,
            plyIndex: currentPly,
            depth: varDepth
          });
        }

        varDepth--;
        continue;
      }

      // Whitespace
      if (/\s/.test(ch)) {
        sanitizedParts.push(" ");
        i++;
        continue;
      }

      // Normal token
      var startTok = i;
      while (i < n) {
        var c3 = movetext.charAt(i);
        if (/\s/.test(c3) || c3 === "{" || c3 === "(" || c3 === ")") break;
        i++;
      }
      var tok = movetext.substring(startTok, i);
      sanitizedParts.push(tok + " ");

      // Detect SAN move → count as a ply
      if (/^\d+\.+$/.test(tok)) continue;        // 4. or 4...
      if (/^\$\d+$/.test(tok)) continue;         // $1
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(tok)) continue;

      if (
        /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/
        .test(tok)
      ) {
        currentPly++;
      }
    }

    var sanitized = sanitizedParts.join(" ").replace(/\s+/g, " ").trim();
    return { sanitized: sanitized, events: events };
  }

  // ---- MAIN RENDER -------------------------------------------------
  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var lines = raw.split(/\r?\n/);
    var headerLines = [], movetextLines = [];
    var inHeader = true;

    for (var li = 0; li < lines.length; li++) {
      var t = lines[li].trim();
      if (inHeader && t.startsWith("[") && t.indexOf("]") !== -1) {
        headerLines.push(lines[li]);
      } else if (inHeader && t === "") {
        inHeader = false;
      } else {
        inHeader = false;
        movetextLines.push(lines[li]);
      }
    }

    var movetext = movetextLines.join(" ").replace(/\s+/g, " ").trim();
    var parsed = parseMovetext(movetext);
    var sanitizedMovetext = parsed.sanitized;
    var events = parsed.events;

    var cleanedPGN =
      (headerLines.length ? headerLines.join("\n") + "\n\n" : "") +
      sanitizedMovetext;

    var game = new Chess();
    if (!game.load_pgn(cleanedPGN, { sloppy: true })) {
      console.warn("pgn.js: could not parse PGN");
      return;
    }

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");
    var moves = game.history({ verbose: true });

    var white =
      (headers.WhiteTitle ? headers.WhiteTitle + " " : "") +
      flipName(headers.White || "") +
      (headers.WhiteElo ? " (" + headers.WhiteElo + ")" : "");

    var black =
      (headers.BlackTitle ? headers.BlackTitle + " " : "") +
      flipName(headers.Black || "") +
      (headers.BlackElo ? " (" + headers.BlackElo + ")" : "");

    var year = extractYear(headers.Date);
    var eventLine = (headers.Event || "") + (year ? ", " + year : "");

    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    var header = document.createElement("h3");
    header.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(header);

    var currentPly = 0;
    var eventIdx = 0;
    var currentP = null;
    var lastMoveSpan = null;

    // Events before move 1
    while (eventIdx < events.length && events[eventIdx].plyIndex === 0) {
      insertEventBlock(wrapper, events[eventIdx], index, currentPly, game);
      eventIdx++;
    }

    currentP = document.createElement("p");
    wrapper.appendChild(currentP);

    // ---- MAIN MOVES LOOP ----
    for (var mi = 0; mi < moves.length; mi++) {
      var m = moves[mi];
      var moveNumber = Math.floor(mi / 2) + 1;
      var isWhite = (m.color === "w");

      var prefix = "";
      if (isWhite) prefix = moveNumber + ". ";
      else if (currentP.textContent.trim() === "") prefix = moveNumber + "... ";

      var span = document.createElement("span");
      span.innerHTML = prefix + formatNAGs(m.san) + " ";
      currentP.appendChild(span);
      lastMoveSpan = span;

      currentPly++;

      // Insert events for this ply
      while (eventIdx < events.length &&
             events[eventIdx].plyIndex === currentPly) {

        insertEventBlock(wrapper, events[eventIdx], index, currentPly, game);

        currentP = document.createElement("p");
        wrapper.appendChild(currentP);

        eventIdx++;
      }
    }

    // Append result
    if (result && lastMoveSpan) {
      lastMoveSpan.innerHTML =
        lastMoveSpan.innerHTML.trim() + " " + result;
    }

    if (currentP && currentP.textContent.trim() === "") {
      wrapper.removeChild(currentP);
    }

    el.replaceWith(wrapper);

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  // ---- Insert comments, variations, diagrams -------------------
  function insertEventBlock(wrapper, ev, index, plyIndex, game) {

    // ---- DIAGRAM ----
    if (ev.type === "diagram") {

      // Build temp position from original game's history
      var temp = new Chess();
      var fullHistory = game.history({ verbose: true });

      for (var k = 0; k < plyIndex && k < fullHistory.length; k++) {
        temp.move(fullHistory[k]);
      }

      var id =
        "pgn-diagram-" +
        index +
        "-" +
        plyIndex +
        "-" +
        Math.random().toString(36).substr(2, 8);

      var div = document.createElement("div");
      div.className = "pgn-diagram";
      div.id = id;
      wrapper.appendChild(div);

      // Delay creation to ensure the node exists
      setTimeout(function () {
        var target = document.getElementById(id);
        if (!target) {
          console.error("Diagram DIV not found:", id);
          return;
        }
        Chessboard(target, {
          position: temp.fen(),
          draggable: false,
          pieceTheme: PIECE_THEME_URL
        });
      }, 0);

      return;
    }

    // ---- COMMENT / VARIATION ----
    var p = document.createElement("p");
    p.className = ev.type === "comment" ? "pgn-comment" : "pgn-variation";

    var depth = ev.depth || 0;
    if (depth > 0) {
      p.style.marginLeft = (depth * 1.5) + "rem";
    }

    p.textContent = normalizeResult(ev.text);
    wrapper.appendChild(p);
  }

  // ---- Initialization ----------
  function renderAll(root) {
    var nodes = (root || document).querySelectorAll("pgn");
    for (var i = 0; i < nodes.length; i++) {
      renderPGNElement(nodes[i], i);
    }
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
