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

  // Convert 1/2-1/2 -> ½-½ for display
  function normalizeResult(str) {
    if (!str) return "";
    return str.replace(/1\/2-1\/2/g, "½-½");
  }

  // Extract year safely from PGN [Date "YYYY.MM.DD"]
  function extractYear(dateStr) {
    if (!dateStr) return "";
    var parts = dateStr.split(".");
    if (!parts.length) return "";
    var y = parts[0];
    return /^\d{4}$/.test(y) ? y : "";
  }

  // Parse movetext; build sanitized movetext and a list of events:
  // events: { type: "comment" | "variation", text: string, plyIndex: number, depth?: number }
  function parseMovetext(movetext) {
    var events = [];
    var sanitizedParts = [];
    var i = 0;
    var n = movetext.length;
    var currentPly = 0;
    var varDepth = 0; // nesting depth of variations

    while (i < n) {
      var ch = movetext.charAt(i);

      // COMMENTS { ... }
      if (ch === "{") {
        i++;
        var start = i;
        while (i < n && movetext.charAt(i) !== "}") i++;
        var comment = movetext.substring(start, i).trim();
        if (comment.length) {
          events.push({
            type: "comment",
            text: comment,
            plyIndex: currentPly
          });
        }
        if (i < n && movetext.charAt(i) === "}") i++;
        continue;
      }

      // VARIATIONS ( ... ) — track depth
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
        var varText = movetext.substring(innerStart, innerEnd).trim();

        // only treat as variation if it looks like it contains at least one move
        if (/(O-O|O-O-O|[KQRBN][a-h1-8]|[a-h][1-8]|^\d+\.)/.test(varText)) {
          events.push({
            type: "variation",
            text: varText,
            plyIndex: currentPly,
            depth: varDepth
          });
        }

        if (varDepth > 0) varDepth--;
        continue;
      }

      // Whitespace: keep a single space in sanitized text
      if (/\s/.test(ch)) {
        sanitizedParts.push(" ");
        i++;
        continue;
      }

      // TOKEN (move number, SAN, result, NAG, etc.)
      var startTok = i;
      while (i < n) {
        var c3 = movetext.charAt(i);
        if (/\s/.test(c3) || c3 === "{" || c3 === "(" || c3 === ")") break;
        i++;
      }
      var tok = movetext.substring(startTok, i);
      sanitizedParts.push(tok + " ");

      // Detect actual move (ply) — ignore numbers, NAGs, result markers
      if (/^\d+\.+$/.test(tok)) continue; // move number like "4." or "4..."
      if (/^\$\d+$/.test(tok)) continue; // NAG like "$1"
      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(tok)) continue; // result

      // Rough SAN pattern
      if (
        /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(
          tok
        )
      ) {
        currentPly++;
      }
    }

    var sanitized = sanitizedParts.join(" ");
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return {
      sanitized: sanitized,
      events: events
    };
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();

    // Split header vs movetext
    var lines = raw.split(/\r?\n/);
    var headerLines = [];
    var movetextLines = [];
    var inHeader = true;

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var t = line.trim();

      if (inHeader && t.charAt(0) === "[" && t.indexOf("]") !== -1) {
        headerLines.push(line);
      } else if (inHeader && t === "") {
        inHeader = false;
      } else {
        inHeader = false;
        movetextLines.push(line);
      }
    }

    var movetext = movetextLines.join(" ");
    movetext = movetext.replace(/\s+/g, " ").trim();

    // Parse movetext into sanitized moves + events
    var parsed = parseMovetext(movetext);
    var sanitizedMovetext = parsed.sanitized;
    var events = parsed.events;

    // Build PGN string for chess.js
    var sanitizedPGN;
    if (headerLines.length > 0) {
      sanitizedPGN =
        headerLines.join("\n") + "\n\n" + sanitizedMovetext;
    } else {
      sanitizedPGN = sanitizedMovetext;
    }

    var game = new Chess();
    if (!game.load_pgn(sanitizedPGN, { sloppy: true })) {
      console.warn("pgn.js: Could not parse PGN");
      return;
    }

    var headers = game.header();
    var result = normalizeResult(headers.Result || "");
    var moves = game.history({ verbose: true });

    // Build player / event strings
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

    // Wrapper div
    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

    // Header h3 (players + event)
    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    var currentPly = 0;
    var eventIdx = 0;
    var currentP;
    var lastMoveSpan = null;

    // Events at plyIndex 0 (before any moves)
    while (eventIdx < events.length && events[eventIdx].plyIndex === 0) {
      var e0 = events[eventIdx];
      var p0 = document.createElement("p");
      p0.className =
        e0.type === "comment" ? "pgn-comment" : "pgn-variation";

      if (e0.type === "variation" && e0.depth) {
        p0.style.marginLeft = (e0.depth * 1.5) + "rem";
      }

      p0.textContent = normalizeResult(e0.text);
      wrapper.appendChild(p0);
      eventIdx++;
    }

    // Start first moves paragraph
    currentP = document.createElement("p");
    wrapper.appendChild(currentP);

    // Main move loop
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

      // Insert any events attached to this ply
      while (eventIdx < events.length &&
             events[eventIdx].plyIndex === currentPly) {

        var ev = events[eventIdx];

        var ep = document.createElement("p");
        ep.className =
          ev.type === "comment" ? "pgn-comment" : "pgn-variation";

        if (ev.type === "variation" && ev.depth) {
          ep.style.marginLeft = (ev.depth * 1.5) + "rem";
        }

        ep.textContent = normalizeResult(ev.text);
        wrapper.appendChild(ep);

        // After a comment / variation, continue moves in a new paragraph
        currentP = document.createElement("p");
        wrapper.appendChild(currentP);

        eventIdx++;
      }
    }

    // Append result to last move
    if (result && lastMoveSpan) {
      lastMoveSpan.textContent =
        lastMoveSpan.textContent.trim() + " " + result;
    }

    // Remove empty trailing paragraph, if any
    if (currentP && currentP.textContent.trim() === "") {
      wrapper.removeChild(currentP);
    }

    // Replace original <pgn> block
    el.replaceWith(wrapper);

    // Apply figurine conversion to this block
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
