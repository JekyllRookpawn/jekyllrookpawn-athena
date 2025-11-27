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

  function flipName(name) {
    if (!name) return "";
    var idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  function appendText(container, text) {
    if (!text) return;
    container.appendChild(document.createTextNode(text));
  }

  var diagramCounter = 0;

  function createDiagram(wrapper, fen) {
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing for diagrams");
      return;
    }

    var id = "pgn-diagram-" + (diagramCounter++);
    var div = document.createElement("div");
    div.className = "pgn-diagram";
    div.id = id;
    // Block diagram; simple width, no extra styling
    div.style.width = "340px";
    div.style.maxWidth = "100%";
    wrapper.appendChild(div);

    setTimeout(function () {
      var target = document.getElementById(id);
      if (!target) return;
      Chessboard(target, {
        position: fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    }, 0);
  }

  function isSANCore(tok) {
    return /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/.test(
      tok
    );
  }

  // Ensure the current context has a paragraph container
  function ensureParagraph(ctx, wrapper, className) {
    if (!ctx.container) {
      var p = document.createElement("p");
      p.className = className;
      wrapper.appendChild(p);
      ctx.container = p;
    }
  }

  // Create a clickable move span, add move number if needed, and advance Chess
  function handleSANToken(displayToken, ctx, wrapper) {
    var core = displayToken.replace(/[!?+#]+$/g, ""); // strip trailing ! ? + #
    if (!isSANCore(core)) return null;

    // determine move number and side *before* playing move
    var ply = ctx.chess.history().length; // 0-based half-move count
    var isWhiteToMove = (ply % 2 === 0);
    var moveNumber = Math.floor(ply / 2) + 1;

    // white: always show move number
    if (isWhiteToMove) {
      appendText(
        ctx.container,
        moveNumber + ". "
      );
      ctx.lastWasInterrupt = false;
    } else {
      // black: show number only if interrupted, or first black move in mainline
      var printBlack = false;

      // first black move in main game: ply === 1 and ctx.type === "main"
      if (ctx.type === "main" && ply === 1) {
        printBlack = true;
      } else if (ctx.lastWasInterrupt) {
        printBlack = true;
      }

      if (printBlack) {
        appendText(
          ctx.container,
          moveNumber + "... "
        );
      }

      ctx.lastWasInterrupt = false;
    }

    var mv = ctx.chess.move(core, { sloppy: true });
    if (!mv) {
      // fallback: if illegal, just print token as text (no span)
      appendText(ctx.container, displayToken + " ");
      return null;
    }

    var span = document.createElement("span");
    span.className = "pgn-move sticky-move";
    span.dataset.fen = ctx.chess.fen();
    span.textContent = displayToken + " ";
    ctx.container.appendChild(span);
    return span;
  }

  // Parse a comment {...}, render as its own <p>, and mark interruption
  function parseComment(movetext, pos, outerCtx, wrapper) {
    var commentChess = new Chess(outerCtx.chess.fen());
    var p = document.createElement("p");
    p.className = "pgn-comment";
    wrapper.appendChild(p);

    var n = movetext.length;

    while (pos < n) {
      var ch = movetext[pos];

      if (ch === "}") {
        pos++;
        break;
      }

      if (/\s/.test(ch)) {
        while (pos < n && /\s/.test(movetext[pos])) pos++;
        appendText(p, " ");
        continue;
      }

      var start = pos;
      while (pos < n) {
        var c2 = movetext[pos];
        if (/\s/.test(c2) || c2 === "}") break;
        pos++;
      }
      var token = movetext.substring(start, pos);
      if (!token) continue;

      if (token === "[D]") {
        createDiagram(wrapper, commentChess.fen());
        // new comment paragraph after diagram if more text follows
        p = document.createElement("p");
        p.className = "pgn-comment";
        wrapper.appendChild(p);
        continue;
      }

      // SAN moves inside comments: we keep them clickable but
      // do NOT bother with numbering rules here (keep comments light).
      (function () {
        var core = token.replace(/[!?+#]+$/g, "");
        if (!isSANCore(core)) {
          appendText(p, token + " ");
          return;
        }
        var mv = commentChess.move(core, { sloppy: true });
        if (!mv) {
          appendText(p, token + " ");
          return;
        }
        var span = document.createElement("span");
        span.className = "pgn-move sticky-move";
        span.dataset.fen = commentChess.fen();
        span.textContent = token + " ";
        p.appendChild(span);
      })();
    }

    // comments count as interruption for the outer context
    outerCtx.lastWasInterrupt = true;
    return pos;
  }

  // Build paragraphs in true reading order.
  // Mainline, variations, comments and diagrams are emitted as they are read.
  function buildMovetextDOM(movetext, wrapper) {
    var mainChess = new Chess();

    var rootCtx = {
      type: "main",
      chess: mainChess,
      container: null,
      parent: null,
      lastWasInterrupt: false
    };
    var ctx = rootCtx;

    var i = 0;
    var n = movetext.length;

    while (i < n) {
      var ch = movetext[i];

      // whitespace → single space in current paragraph
      if (/\s/.test(ch)) {
        while (i < n && /\s/.test(movetext[i])) i++;
        ensureParagraph(
          ctx,
          wrapper,
          ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );
        appendText(ctx.container, " ");
        continue;
      }

      // start variation
      if (ch === "(") {
        i++;

        // entering a variation interrupts the parent stream
        if (ctx) ctx.lastWasInterrupt = true;

        var varChess = new Chess(ctx.chess.fen());
        var varCtx = {
          type: "variation",
          chess: varChess,
          container: null,
          parent: ctx,
          lastWasInterrupt: false
        };
        ctx = varCtx;
        // new paragraph for variation
        ensureParagraph(ctx, wrapper, "pgn-variation");
        continue;
      }

      // end variation
      if (ch === ")") {
        i++;
        if (ctx.parent) {
          var parent = ctx.parent;
          ctx = parent;
          // returning from variation interrupts the parent stream
          ctx.lastWasInterrupt = true;
          // subsequent text continues in a new paragraph in parent
          ctx.container = null;
        }
        continue;
      }

      // comment
      if (ch === "{") {
        i = parseComment(movetext, i + 1, ctx, wrapper);
        // after comment, continue same context in a NEW paragraph
        ctx.container = null;
        continue;
      }

      // normal token
      var start = i;
      while (i < n) {
        var c2 = movetext[i];
        if (/\s/.test(c2) || c2 === "(" || c2 === ")" || c2 === "{" || c2 === "}") break;
        i++;
      }
      var token = movetext.substring(start, i);
      if (!token) continue;

      // diagram marker
      if (token === "[D]") {
        createDiagram(wrapper, ctx.chess.fen());
        // diagram interrupts the stream
        ctx.lastWasInterrupt = true;
        // subsequent tokens in same context go to a new paragraph
        ctx.container = null;
        continue;
      }

      // result / move number literals → plain text, do not cause interruption
      if (
        /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(token) ||
        /^\d+\.+$/.test(token)
      ) {
        ensureParagraph(
          ctx,
          wrapper,
          ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );
        appendText(ctx.container, token + " ");
        continue;
      }

      // SAN move?
      ensureParagraph(
        ctx,
        wrapper,
        ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
      );
      var sanSpan = handleSANToken(token, ctx, wrapper);
      if (!sanSpan) {
        appendText(ctx.container, token + " ");
      }
    }
  }

  function renderPGNElement(el, index) {
    if (!ensureDeps()) return;

    var raw = el.textContent.trim();
    var lines = raw.split(/\r?\n/);

    var headerLines = [];
    var movetextLines = [];
    var inHeader = true;

    lines.forEach(function (line) {
      var t = line.trim();
      if (inHeader && t.startsWith("[") && t.endsWith("]")) {
        headerLines.push(line);
      } else if (inHeader && t === "") {
        inHeader = false;
      } else {
        inHeader = false;
        movetextLines.push(line);
      }
    });

    var movetext = movetextLines.join(" ").replace(/\s+/g, " ").trim();
    var cleanedPGN =
      (headerLines.length ? headerLines.join("\n") + "\n\n" : "") + movetext;

    var game = new Chess();
    game.load_pgn(cleanedPGN, { sloppy: true });

    var headers = game.header();
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

    // Build paragraphs + diagrams in correct reading order,
    // including final result token if present.
    buildMovetextDOM(movetext + (result ? " " + result : ""), wrapper);

    el.replaceWith(wrapper);

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    (root || document)
      .querySelectorAll("pgn")
      .forEach(function (el, i) {
        renderPGNElement(el, i);
      });
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
