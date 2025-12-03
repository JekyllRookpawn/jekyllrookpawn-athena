// assets/js/chess/pgn.js
(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  const SAN_CORE_REGEX =
    /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/;
  const RESULT_REGEX = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
  const MOVE_NUMBER_REGEX = /^(\d+)(\.+)$/;

  let diagramCounter = 0;

  // --- helpers ---

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
    const p = dateStr.split(".");
    return /^\d{4}$/.test(p[0]) ? p[0] : "";
  }

  function flipName(name) {
    if (!name) return "";
    const idx = name.indexOf(",");
    if (idx === -1) return name.trim();
    return name.substring(idx + 1).trim() + " " + name.substring(0, idx).trim();
  }

  function appendText(container, text) {
    if (!text) return;
    container.appendChild(document.createTextNode(text));
  }

  function createDiagram(wrapper, fen) {
    if (typeof Chessboard === "undefined") {
      console.warn("pgn.js: chessboard.js missing for diagrams");
      return;
    }

    const id = "pgn-diagram-" + diagramCounter++;
    const div = document.createElement("div");
    div.className = "pgn-diagram";
    div.id = id;
    div.style.width = "340px";
    div.style.maxWidth = "100%";
    wrapper.appendChild(div);

    setTimeout(function () {
      const target = document.getElementById(id);
      if (!target) return;
      Chessboard(target, {
        position: fen,
        draggable: false,
        pieceTheme: PIECE_THEME_URL
      });
    }, 0);
  }

  // ---------- PGNGameView ----------

  class PGNGameView {
    constructor(el) {
      this.sourceEl = el;
      this.wrapper = document.createElement("div");
      this.wrapper.className = "pgn-blog-block";

      this.buildFromElement();
      this.applyFigurines();
    }

    // --- static helpers ---

    static isSANCore(tok) {
      return SAN_CORE_REGEX.test(tok);
    }

    static splitHeadersAndMovetext(raw) {
      const lines = raw.split(/\r?\n/);

      const headerLines = [];
      const movetextLines = [];
      let inHeader = true;

      lines.forEach((line) => {
        const t = line.trim();
        if (inHeader && t.startsWith("[") && t.endsWith("]")) {
          headerLines.push(line);
        } else if (inHeader && t === "") {
          inHeader = false;
        } else {
          inHeader = false;
          movetextLines.push(line);
        }
      });

      const movetext = movetextLines.join(" ").replace(/\s+/g, " ").trim();
      return { headerLines, movetext };
    }

    // --- main entry per <pgn> ---

    buildFromElement() {
      const raw = this.sourceEl.textContent.trim();
      const { headerLines, movetext } = PGNGameView.splitHeadersAndMovetext(raw);

      const cleanedPGN =
        (headerLines.length ? headerLines.join("\n") + "\n\n" : "") + movetext;

      // Use chess.js only to parse headers and result
      const game = new Chess();
      game.load_pgn(cleanedPGN, { sloppy: true });
      const headers = game.header();
      const result = normalizeResult(headers.Result || "");

      this.createHeader(headers);
      this.buildMovetextDOM(movetext + (result ? " " + result : ""));

      this.sourceEl.replaceWith(this.wrapper);
    }

    createHeader(headers) {
      const white =
        (headers.WhiteTitle ? headers.WhiteTitle + " " : "") +
        flipName(headers.White || "") +
        (headers.WhiteElo ? " (" + headers.WhiteElo + ")" : "");

      const black =
        (headers.BlackTitle ? headers.BlackTitle + " " : "") +
        flipName(headers.Black || "") +
        (headers.BlackElo ? " (" + headers.BlackElo + ")" : "");

      const year = extractYear(headers.Date);
      const eventLine = (headers.Event || "") + (year ? ", " + year : "");

      const h3 = document.createElement("h3");
      const titleLine = `${white} \u2013 ${black}`; // en dash

      h3.appendChild(document.createTextNode(titleLine));
      h3.appendChild(document.createElement("br"));
      h3.appendChild(document.createTextNode(eventLine));
      this.wrapper.appendChild(h3);
    }

    ensureParagraph(ctx, className) {
      if (!ctx.container) {
        const p = document.createElement("p");
        p.className = className;
        this.wrapper.appendChild(p);
        ctx.container = p;
      }
    }

    // --- move handling ---

    handleSANToken(displayToken, ctx) {
      // Strip trailing non-SAN characters (e.g. "+-", "!?")
      const core = displayToken.replace(/[^a-hKQRBN0-9=]+$/g, "");
      if (!PGNGameView.isSANCore(core)) return null;

      if (ctx.type === "variation") {
        // In variations, respect explicit PGN numbers like "4..." / "5."
        if (ctx.pendingNumber != null) {
          const dots = ctx.pendingDots === 3 ? "... " : ". ";
          appendText(ctx.container, ctx.pendingNumber + dots);
          ctx.pendingNumber = null;
          ctx.pendingDots = null;
        }
      } else {
        // Mainline: auto numbering
        const ply = ctx.chess.history().length; // half-move count so far
        const isWhite = ply % 2 === 0;
        const moveNumber = Math.floor(ply / 2) + 1;

        if (isWhite) {
          appendText(ctx.container, moveNumber + ". ");
          ctx.lastWasInterrupt = false;
        } else {
          if (ctx.lastWasInterrupt) {
            appendText(ctx.container, moveNumber + "... ");
          }
          ctx.lastWasInterrupt = false;
        }
      }

      const mv = ctx.chess.move(core, { sloppy: true });
      if (!mv) {
        appendText(ctx.container, displayToken + " ");
        return null;
      }

      const span = document.createElement("span");
      span.className = "pgn-move sticky-move";
      span.dataset.fen = ctx.chess.fen();
      span.textContent = displayToken + " ";
      ctx.container.appendChild(span);

      return span;
    }

    // --- comment parsing ---

    parseComment(movetext, pos, outerCtx) {
      const n = movetext.length;
      let idx = pos;

      // Read until closing brace
      while (idx < n && movetext[idx] !== "}") idx++;
      const content = movetext.substring(pos, idx);
      if (idx < n && movetext[idx] === "}") idx++;

      const tokens = content.split(/\s+/).filter(Boolean);
      let hasSAN = false;
      for (let i = 0; i < tokens.length; i++) {
        const core = tokens[i].replace(/[^a-hKQRBN0-9=]+$/g, "");
        if (PGNGameView.isSANCore(core)) {
          hasSAN = true;
          break;
        }
      }

      // INLINE COMMENT (no SAN inside)
      if (!hasSAN) {
        this.ensureParagraph(
          outerCtx,
          outerCtx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );

        const parts = content.split("[D]");
        for (let pIndex = 0; pIndex < parts.length; pIndex++) {
          const textPart = parts[pIndex].trim();
          if (textPart) {
            appendText(outerCtx.container, " " + textPart);
          }
          if (pIndex < parts.length - 1) {
            createDiagram(this.wrapper, outerCtx.chess.fen());
          }
        }
        // Inline comment does not interrupt mainline numbering
        return idx;
      }

      // BLOCK COMMENT (with SAN inside)
      const commentChess = new Chess(outerCtx.chess.fen());
      let p = document.createElement("p");
      p.className = "pgn-comment";
      this.wrapper.appendChild(p);

      let cIdx = 0;
      const len = content.length;
      while (cIdx < len) {
        const ch = content[cIdx];

        if (/\s/.test(ch)) {
          while (cIdx < len && /\s/.test(content[cIdx])) cIdx++;
          appendText(p, " ");
          continue;
        }

        const startTok = cIdx;
        while (cIdx < len && !/\s/.test(content[cIdx])) cIdx++;
        const token = content.substring(startTok, cIdx);
        if (!token) continue;

        if (token === "[D]") {
          createDiagram(this.wrapper, commentChess.fen());
          p = document.createElement("p");
          p.className = "pgn-comment";
          this.wrapper.appendChild(p);
          continue;
        }

        const core = token.replace(/[^a-hKQRBN0-9=]+$/g, "");
        if (!PGNGameView.isSANCore(core)) {
          appendText(p, token + " ");
          continue;
        }

        const mv = commentChess.move(core, { sloppy: true });
        if (!mv) {
          appendText(p, token + " ");
          continue;
        }

        const span = document.createElement("span");
        span.className = "pgn-move sticky-move";
        span.dataset.fen = commentChess.fen();
        span.textContent = token + " ";
        p.appendChild(span);
      }

      outerCtx.lastWasInterrupt = true;
      outerCtx.container = null;

      return idx;
    }

    // --- movetext walker ---

    buildMovetextDOM(movetext) {
      const mainChess = new Chess();

      const rootCtx = {
        type: "main",
        chess: mainChess,
        container: null,
        parent: null,
        lastWasInterrupt: false,
        pendingNumber: null,
        pendingDots: null
      };
      let ctx = rootCtx;

      let i = 0;
      const n = movetext.length;

      while (i < n) {
        const ch = movetext[i];

        // Whitespace
        if (/\s/.test(ch)) {
          while (i < n && /\s/.test(movetext[i])) i++;
          this.ensureParagraph(
            ctx,
            ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
          );
          appendText(ctx.container, " ");
          continue;
        }

        // Start variation
        if (ch === "(") {
          i++;
          ctx.lastWasInterrupt = true;

          const varChess = new Chess(ctx.chess.fen());
          const varCtx = {
            type: "variation",
            chess: varChess,
            container: null,
            parent: ctx,
            lastWasInterrupt: false,
            pendingNumber: null,
            pendingDots: null
          };
          ctx = varCtx;
          this.ensureParagraph(ctx, "pgn-variation");
          continue;
        }

        // End variation
        if (ch === ")") {
          i++;
          if (ctx.parent) {
            ctx = ctx.parent;
            ctx.lastWasInterrupt = true;
            ctx.container = null;
          }
          continue;
        }

        // Comment
        if (ch === "{") {
          i = this.parseComment(movetext, i + 1, ctx);
          continue;
        }

        // Normal token
        const start = i;
        while (i < n) {
          const c2 = movetext[i];
          if (/\s/.test(c2) || c2 === "(" || c2 === ")" || c2 === "{" || c2 === "}") {
            break;
          }
          i++;
        }
        const token = movetext.substring(start, i);
        if (!token) continue;

        // Diagram marker
        if (token === "[D]") {
          createDiagram(this.wrapper, ctx.chess.fen());
          ctx.lastWasInterrupt = true;
          ctx.container = null;
          continue;
        }

        // Game result
        if (RESULT_REGEX.test(token)) {
          this.ensureParagraph(
            ctx,
            ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
          );
          appendText(ctx.container, token + " ");
          continue;
        }

        // Move numbers like "4." or "4..."
        const m = token.match(MOVE_NUMBER_REGEX);
        if (m) {
          ctx.pendingNumber = parseInt(m[1], 10);
          ctx.pendingDots = m[2].length; // 1 for ".", 3 for "..."
          continue;
        }

        // SAN move
        this.ensureParagraph(
          ctx,
          ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );
        const sanSpan = this.handleSANToken(token, ctx);
        if (!sanSpan) {
          appendText(ctx.container, token + " ");
        }
      }
    }

    // --- figurines ---

    applyFigurines() {
      if (window.ChessFigurine && typeof window.ChessFigurine.run === "function") {
        window.ChessFigurine.run(this.wrapper);
        return;
      }

      const map = {
        K: "♔",
        Q: "♕",
        R: "♖",
        B: "♗",
        N: "♘"
      };

      const moveSpans = this.wrapper.querySelectorAll(".pgn-move");
      moveSpans.forEach((span) => {
        const text = span.textContent;
        const match = text.match(/^([KQRBN])(.+?)(\s*)$/);
        if (!match) return;
        const [, letter, rest, ws] = match;
        const fig = map[letter];
        if (!fig) return;
        span.textContent = fig + rest + (ws || "");
      });
    }
  }

  // ---------- PGNRenderer ----------

  class PGNRenderer {
    static renderAll(root) {
      const scope = root || document;
      const elements = scope.querySelectorAll("pgn");
      elements.forEach((el) => new PGNGameView(el));
    }

    static init() {
      if (!ensureDeps()) return;

      PGNRenderer.renderAll(document);

      window.PGNRenderer = {
        run(root) {
          PGNRenderer.renderAll(root || document.body);
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      PGNRenderer.init();
    });
  } else {
    PGNRenderer.init();
  }
})();
