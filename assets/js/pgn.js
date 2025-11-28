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

  function ensureParagraph(ctx, wrapper, className) {
    if (!ctx.container) {
      var p = document.createElement("p");
      p.className = className;
      wrapper.appendChild(p);
      ctx.container = p;
    }
  }

  function handleSANToken(displayToken, ctx) {
    var core = displayToken.replace(/[!?+#]+$/g, "");
    if (!isSANCore(core)) return null;

    var ply = ctx.chess.history().length;
    var isWhite = (ply % 2 === 0);
    var moveNumber = Math.floor(ply / 2) + 1;

    if (isWhite) {
      appendText(ctx.container, moveNumber + ". ");
      ctx.lastWasInterrupt = false;
    } else {
      var printBlack = false;
      
      if (ctx.lastWasInterrupt) {
        printBlack = true;
      }

      if (printBlack) {
        appendText(ctx.container, moveNumber + "... ");
      }

      ctx.lastWasInterrupt = false;
    }

    var mv = ctx.chess.move(core, { sloppy: true });
    if (!mv) {
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
        p = document.createElement("p");
        p.className = "pgn-comment";
        wrapper.appendChild(p);
        continue;
      }

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

    outerCtx.lastWasInterrupt = true;
    return pos;
  }

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

      if (/\s/.test(ch)) {
        while (i < n && /\s/.test(movetext[i])) i++;
        ensureParagraph(ctx, wrapper, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
        appendText(ctx.container, " ");
        continue;
      }

      if (ch === "(") {
        i++;
        ctx.lastWasInterrupt = true;

        var varChess = new Chess(ctx.chess.fen());
        var varCtx = {
          type: "variation",
          chess: varChess,
          container: null,
          parent: ctx,
          lastWasInterrupt: false
        };
        ctx = varCtx;
        ensureParagraph(ctx, wrapper, "pgn-variation");
        continue;
      }

      if (ch === ")") {
        i++;
        if (ctx.parent) {
          ctx = ctx.parent;
          ctx.lastWasInterrupt = true;
          ctx.container = null;
        }
        continue;
      }

      if (ch === "{") {
        i = parseComment(movetext, i + 1, ctx, wrapper);
        ctx.container = null;
        continue;
      }

      var start = i;
      while (i < n) {
        var c2 = movetext[i];
        if (/\s/.test(c2) || c2 === "(" || c2 === ")" || c2 === "{" || c2 === "}") break;
        i++;
      }
      var token = movetext.substring(start, i);
      if (!token) continue;

      if (token === "[D]") {
        createDiagram(wrapper, ctx.chess.fen());
        ctx.lastWasInterrupt = true;
        ctx.container = null;
        continue;
      }

      if (/^(1-0|0-1|1\/2-1\/2|½-½|\*)$/.test(token)) {
        ensureParagraph(ctx, wrapper, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
        appendText(ctx.container, token + " ");
        continue;
      }

      // IGNORE literal PGN move numbers like "1.", "23."
      if (/^\d+\.+$/.test(token)) {
        continue;
      }

      ensureParagraph(ctx, wrapper, ctx.type === "main" ? "pgn-mainline" : "pgn-variation");
      var sanSpan = handleSANToken(token, ctx);
      if (!sanSpan) {
        appendText(ctx.container, token + " ");
      }
    }
  }

  function renderPGNElement(el) {
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

    buildMovetextDOM(movetext + (result ? " " + result : ""), wrapper);

    el.replaceWith(wrapper);

    if (window.ChessFigurine && window.ChessFigurine.run) {
      ChessFigurine.run(wrapper);
    }
  }

  function renderAll(root) {
    (root || document).querySelectorAll("pgn").forEach(function (el) {
      renderPGNElement(el);
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
