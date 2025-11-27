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

  // ---- NAG formatting ----------------------------------------------------
  function formatNAGs(sanText) {
    sanText = sanText.replace(/!!/, '<span class="nag nag-brilliant">!!</span>');
    sanText = sanText.replace(/\?\?/, '<span class="nag nag-blunder">??</span>');
    sanText = sanText.replace(/!\?/, '<span class="nag nag-interesting">!?</span>');
    sanText = sanText.replace(/\?!/, '<span class="nag nag-dubious">?!</span>');
    sanText = sanText.replace(/!/, '<span class="nag nag-good">!</span>');
    sanText = sanText.replace(/\?/, '<span class="nag nag-mistake">?</span>');
    return sanText;
  }

  // ---- Flip "Surname, Firstname" → "Firstname Surname" ------------------
  function flipName(name) {
    if (!name) return "";
    var idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  // ---- Parse movetext, detect comments/variations/diagrams --------------
  function parseMovetext(movetext) {
    var events = [];
    var sanitizedParts = [];
    var i = 0, n = movetext.length;
    var currentPly = 0;
    var varDepth = 0;

    while (i < n) {
      var ch = movetext.charAt(i);

      // ----- COMMENT { ... } -----
      if (ch === "{") {
        i++;
        var start = i;
        while (i < n && movetext.charAt(i) !== "}") i++;
        var raw = movetext.substring(start, i).trim();

        if (raw.indexOf("[D]") !== -1) {
          var isSmall = (varDepth > 0);

          events.push({
            type: "diagram",
            plyIndex: currentPly,
            depth: varDepth,
            small: isSmall
          });

          var cleaned = raw.replace(/\[D\]/g, "").trim();
          if (cleaned.length > 0) {
            events.push({
              type: "comment",
              text: cleaned,
              plyIndex: currentPly,
              depth: varDepth
            });
          }
        } else {
          events.push({
            type: "comment",
            text: raw,
            plyIndex: currentPly,
            depth: varDepth
          });
        }

        if (i < n && movetext.charAt(i) === "}") i++;
        continue;
      }

      // ----- VARIATION ( ... ) -----
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

        // CASE A: comment inside variation containing [D]
        if (/\{[^}]*\[D\][^}]*\}/.test(inner)) {
          var commentRegex = /\{([^}]*)\}/;
          var cm = inner.match(commentRegex);
          var innerBefore = "";
          var innerAfter = "";
          var rawComment = "";

          if (cm) {
            rawComment = cm[1].trim();
            var commentFull = cm[0];
            var commentIndex = inner.indexOf(commentFull);
            innerBefore = inner.substring(0, commentIndex).trim();
            innerAfter = inner.substring(commentIndex + commentFull.length).trim();
          }

          var parts = rawComment.split("[D]");
          var commentBefore = (parts[0] || "").trim();
          var commentAfter  = (parts[1] || "").trim();

          events.push({
            type: "variation_head",
            plyIndex: currentPly,
            depth: varDepth,
            headMoves: innerBefore,
            headComment: commentBefore
          });

          events.push({
            type: "diagram",
            plyIndex: currentPly,
            depth: varDepth,
            small: true
          });

          var allMoves = (innerBefore ? innerBefore + " " : "") +
                         (innerAfter || "");
          allMoves = allMoves.trim();

          events.push({
            type: "variation_tail",
            plyIndex: currentPly,
            depth: varDepth,
            tailComment: commentAfter,
            allMoves: allMoves
          });

        // CASE B: direct variation-level [D]
        } else if (/^\[D\]$/.test(inner)) {
          events.push({
            type: "diagram",
            plyIndex: currentPly,
            depth: varDepth,
            small: false
          });

        // CASE C: normal variation
        } else if (/(O-O|O-O-O|[KQRBN]|^\d+\.)/.test(inner)) {
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

      // ----- Whitespace -----
      if (/\s/.test(ch)) {
        sanitizedParts.push(" ");
        i++;
        continue;
      }

      // ----- Normal token -----
      var startTok = i;
      while (i < n) {
        var c3 = movetext.charAt(i);
        if (/\s/.test(c3) || c3 === "{" || c3 === "(" || c3 === ")") break;
        i++;
      }
      var tok = movetext.substring(startTok, i);
      sanitizedParts.push(tok + " ");

      if (/^\d+\.+$/.test(tok)) continue;
      if (/^\$\d+$/.test(tok)) continue;
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

  // ---- MAIN RENDERER ----------------------------------------------------
  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var lines = raw.split(/\r?\n/);
    var headerLines = [], movetextLines = [];
    var inHeader = true;

    for (var li = 0; li < lines.length; li++) {
      var t = lines[li].trim();
      if (inHeader && t.startsWith("[") && t.endsWith("]")) {
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
    var sanitized = parsed.sanitized;
    var events = parsed.events;

    var cleanedPGN =
      (headerLines.length ? headerLines.join("\n") + "\n\n" : "") + sanitized;

    var game = new Chess();
    if (!game.load_pgn(cleanedPGN, { sloppy: true })) {
      console.warn("pgn.js: could not parse PGN");
      return;
    }

    var headers = game.header();
    var moves = game.history({ verbose: true });
    var result = normalizeResult(headers.Result || "");

    var wrapper = document.createElement("div");
    wrapper.className = "pgn-blog-block";

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

    var h3 = document.createElement("h3");
    h3.innerHTML = white + " – " + black + "<br>" + eventLine;
    wrapper.appendChild(h3);

    var currentPly = 0;
    var eventIdx = 0;
    var currentP = document.createElement("p");
    wrapper.appendChild(currentP);
    var lastMoveSpan = null;

    while (eventIdx < events.length && events[eventIdx].plyIndex === 0) {
      insertEventBlock(wrapper, events[eventIdx], index, currentPly, game);
      eventIdx++;
    }

    // ---- MOVES LOOP ----
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

      while (eventIdx < events.length &&
             events[eventIdx].plyIndex === currentPly) {

        insertEventBlock(wrapper, events[eventIdx], index, currentPly, game);

        currentP = document.createElement("p");
        wrapper.appendChild(currentP);

        eventIdx++;
      }
    }

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

  // ---- EVENT INSERTION --------------------------------------------------
  function insertEventBlock(wrapper, ev, index, plyIndex, game) {

    // ---- DIAGRAM --------------------------------------------------------
    if (ev.type === "diagram") {

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

      if (ev.small) div.style.width = "250px";
      else div.style.width = "340px";

      // ⭐ NEW: indentation for diagrams inside variations
      if (ev.depth > 0) {
        div.style.marginLeft = (ev.depth * 1.5) + "rem";
      }

      wrapper.appendChild(div);

      setTimeout(function () {
        var target = document.getElementById(id);
        if (!target) return;

        Chessboard(target, {
          position: temp.fen(),
          draggable: false,
          pieceTheme: PIECE_THEME_URL
        });
      }, 0);

      return;
    }

    // ---- COMMENT / VARIATION / variation_head / variation_tail ----
    var p = document.createElement("p");
    var isComment = (ev.type === "comment");
    p.className = isComment ? "pgn-comment" : "pgn-variation";

    // ⭐ NEW: smaller font
    p.style.fontSize = "0.95rem";

    var depth = ev.depth || 0;
    if (depth > 0) {
      p.style.marginLeft = (depth * 1.5) + "rem";
    }

    var text = "";

    if (ev.type === "comment") {
      text = ev.text || "";

    } else if (ev.type === "variation") {
      text = ev.text || "";

    } else if (ev.type === "variation_head") {
      var s1 = ev.headMoves || "";
      if (ev.headComment) {
        if (s1) s1 += " ";
        s1 += ev.headComment;
      }
      text = s1;

    } else if (ev.type === "variation_tail") {
      var s2 = ev.tailComment || "";
      if (ev.allMoves) {
        if (s2) s2 += " ";
        s2 += ev.allMoves;
      }
      text = s2;
    }

    p.textContent = normalizeResult(text);
    wrapper.appendChild(p);
  }

  // ---- Initialization ---------------------------------------------------
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
