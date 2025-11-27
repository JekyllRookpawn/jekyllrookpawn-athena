// assets/js/chess/pgn.js
(function () {
  "use strict";

  function ensureDeps() {
    if (typeof Chess === "undefined") {
      console.warn("pgn.js: chess.js missing");
      return false;
    }
    return true;
  }

  // Convert 1/2-1/2 -> ½-½
  function normalizeResult(str) {
    if (!str) return "";
    return str.replace(/1\/2-1\/2/g, "½-½");
  }

  // Extract year safely
  function extractYear(dateStr) {
    if (!dateStr) return "";
    var parts = dateStr.split(".");
    if (!parts.length) return "";
    var y = parts[0];
    return /^\d{4}$/.test(y) ? y : "";
  }

  // Parse movetext and record comment/variation insertion points
  function parseMovetext(movetext) {
    var events = []; // {type:"comment"/"variation", text:"", plyIndex:N}
    var sanitizedParts = [];
    var i = 0;
    var n = movetext.length;
    var currentPly = 0;

    while (i < n) {
      var ch = movetext.charAt(i);

      // COMMENT { ... }
      if (ch === "{") {
        i++;
        var start = i;
        while (i < n && movetext.charAt(i) !== "}") i++;
        var comment = movetext.substring(start, i).trim();
        if (comment.length) {
          events.push({ type: "comment", text: comment, plyIndex: currentPly });
        }
        if (i < n && movetext.charAt(i) === "}") i++;
        continue;
      }

      // VARIATION ( ... )
      if (ch === "(") {
        i++;
        var depth = 1;
        var startVar = i;
        while (i < n && depth > 0) {
          var c2 = movetext.charAt(i);
          if (c2 === "(") depth++;
          else if (c2 === ")") depth--;
          i++;
        }
        var endVar = i - 1;
        var varText = movetext.substring(startVar, endVar).trim();

        // only keep variations containing SAN-like moves
        if (/(O-O|O-O-O|[KQRBN][a-h1-8]|[a-h][1-8]|^\d+\.)/.test(varText)) {
          events.push({ type: "variation", text: varText, plyIndex: currentPly });
        }
        continue;
      }

      // whitespace
      if (/\s/.test(ch)) {
        sanitizedParts.push(" ");
        i++;
        continue;
      }

      // SAN / token
      var startTok = i;
      while (i < n) {
        var c3 = movetext.charAt(i);
        if (/\s/.test(c3) || c3 === "{" || c3 === "(" || c3 === ")") break;
        i++;
      }
      var tok = movetext.substring(startTok, i);
      sanitizedParts.push(tok + " ");

      // Detect actual move (not move number, not NAG, not result)
      if (/^\d+\.+$/.test(tok)) continue; // move number
      if (/^\$\d+$/.test(tok)) continue; // NAG
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(tok)) continue; // game result

      // SAN pattern
      if (
        /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(
          tok
        )
      ) {
        currentPly++;
      }
    }

    var sanitized = sanitizedParts.join(" ").replace(/\s+/g, " ").trim();

    return {
      sanitized: sanitized,
      events: events
    };
  }

  // MAIN RENDER FUNCTION
  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();

    // Split header + movetext
    var lines = raw.split(/\r?\n/);
    var headerLines = [];
    var movetextLines = [];
    var inHeader = true;

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var t = line.trim();

      if (inHeader && t.startsWith("[") && t.indexOf("]") !== -1) {
        headerLines.push(line);
      } else if (inHeader && t === "") {
        inHeader = false;
      } else {
        inHeader = false;
        movetextLines.push(line);
      }
    }

    var movetext = movetextLines.join(" ").replace(/\s+/g, " ").trim();

    // Parse movetext for events + sanitized version
    var parsed = parseMovetext(movetext);
    var sanitizedMovetext = parsed.sanitized;
    var events = parsed.events;

    // Build PGN for chess.js
    var sanitizedPGN =
      headerLines.join("\n") + "\n\n" + sanitizedMovetext;

    var game = new Chess();
    if (!game.load_pgn(sanitizedPGN, { sloppy: true })) {
      console.warn("pgn.js: Could not parse PGN");
      return;
    }

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");
    var moves = game.history({ verbose: true });

    var white =
      (headers.WhiteTitle || "") +
      " " +
      (headers.White || "") +
      (headers.WhiteElo ? " (" + headers.WhiteElo + ")" : "");
    white = white.trim();

    var black =
      (headers.BlackTitle || "") +
      " " +
      (headers.Black || "") +
      (headers.BlackElo ? " (" + headers.BlackElo + ")" : "");
    black = black.trim();

    var eventName = headers.Event || "";
    var year = extractYear(headers.Date);
    var eventLine = eventName + (year ? ", " + year : "");

    // Wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // Title header
    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    // Begin moves
    var currentPly = 0;
    var eventIdx = 0;

    // First, events at plyIndex 0 (before first move)
    while (eventIdx < events.length && events[eventIdx].plyIndex === 0) {
      var e0 = events[eventIdx];
      var p0 = document.createElement("p");
      p0.className = e0.type === "comment" ? "pgn-comment" : "pgn-variation";
      p0.textContent = normalizeResult(e0.text);
      wrapper.appendChild(p0);
      eventIdx++;
    }

    // First moves paragraph
    var currentP = document.createElement("p");
    wrapper.appendChild(currentP);
    var lastMoveSpan = null;

    // Render each move sequentially
    for (var mi = 0; mi < moves.length; mi++) {
      var m = moves[mi];
      var isWhiteMove = m.color === "w";
      var moveNumber = Math.floor(mi / 2) + 1;

      var spanMove = document.createElement("span");
      spanMove.textContent = isWhiteMove
        ? moveNumber + ". " + m.san + " "
        : m.san + " ";

      currentP.appendChild(spanMove);
      lastMoveSpan = spanMove;
      currentPly++;

      // Insert any events that belong after this move
      while (eventIdx < events.length &&
             events[eventIdx].plyIndex === currentPly) {

        var ev = events[eventIdx];

        var ep = document.createElement("p");
        ep.className =
          ev.type === "comment" ? "pgn-comment" : "pgn-variation";
        ep.textContent = normalizeResult(ev.text);
        wrapper.appendChild(ep);

        // Continue moves in a new paragraph
        currentP = document.createElement("p");
        wrapper.appendChild(currentP);

        eventIdx++;
      }
    }

    // Append result inline
    if (result && lastMoveSpan) {
      lastMoveSpan.textContent =
        lastMoveSpan.textContent.trim() + " " + result;
    }

    // Remove empty trailing paragraph
    if (currentP && currentP.textContent.trim() === "") {
      wrapper.removeChild(currentP);
    }

    // Replace <pgn>
    el.replaceWith(wrapper);

    // Figurines
    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

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
