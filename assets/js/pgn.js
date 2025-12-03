// assets/js/chess/pgn.js
(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  const SAN_CORE_REGEX =
    /^([O0]-[O0](-[O0])?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/;

  const RESULT_REGEX = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
  const MOVE_NUMBER_REGEX = /^(\d+)(\.+)$/;
  const EVAL_TOKEN = /^[\+\-=∞±]+$/;

  let diagramCounter = 0;

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

  class PGNGameView {
    constructor(el) {
      this.sourceEl = el;
      this.wrapper = document.createElement("div");
      this.wrapper.className = "pgn-blog-block";
      this.lastLiteralToken = null;

      this.buildFromElement();
      this.applyFigurines();
    }

    static isSANCore(tok) {
      return SAN_CORE_REGEX.test(tok);
    }

    static splitHeadersAndMovetext(raw) {
      const lines = raw.split(/\r?\n/);
      const headerLines = [];
      const movetextLines = [];
      let inHeader = true;

      for (const line of lines) {
        const t = line.trim();
        if (inHeader && t.startsWith("[") && t.endsWith("]")) {
          headerLines.push(line);
        } else if (inHeader && t === "") {
          inHeader = false;
        } else {
          inHeader = false;
          movetextLines.push(line);
        }
      }

      return {
        headerLines,
        movetext: movetextLines.join(" ").replace(/\s+/g, " ").trim()
      };
    }

    buildFromElement() {
      const raw = this.sourceEl.textContent.trim();
      const { headerLines, movetext } = PGNGameView.splitHeadersAndMovetext(raw);

      const cleanedPGN =
        (headerLines.length ? headerLines.join("\n") + "\n\n" : "") + movetext;

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
      h3.appendChild(document.createTextNode(`${white} – ${black}`));
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

    handleSAN(displayToken, ctx) {
      let core = displayToken.replace(/[^a-hKQRBN0-9=O0-]+$/g, "");
      core = core.replace(/0/g, "O");

      if (!PGNGameView.isSANCore(core)) {
        appendText(ctx.container, displayToken + " ");
        this.lastLiteralToken = displayToken;
        return null;
      }

      const baseLen =
        typeof ctx.baseHistoryLen === "number" ? ctx.baseHistoryLen : 0;
      const localHist = ctx.chess.history().length;
      const ply = baseLen + localHist;
      const isWhite = ply % 2 === 0;
      const moveNumber = Math.floor(ply / 2) + 1;

      if (ctx.type === "main") {
        if (isWhite) {
          appendText(ctx.container, moveNumber + ". ");
        } else if (ctx.lastWasInterrupt) {
          appendText(ctx.container, moveNumber + "... ");
        }
      } else {
        if (isWhite) {
          appendText(ctx.container, moveNumber + ". ");
        } else if (ctx.lastWasInterrupt) {
          appendText(ctx.container, moveNumber + "... ");
        }
      }

      ctx.prevFen = ctx.chess.fen();
      ctx.prevHistoryLen = baseLen + localHist;

      const mv = ctx.chess.move(core, { sloppy: true });
      if (!mv) {
        appendText(ctx.container, displayToken + " ");
        this.lastLiteralToken = displayToken;
        return null;
      }

      ctx.lastWasInterrupt = false;
      this.lastLiteralToken = null;

      const span = document.createElement("span");
      span.className = "pgn-move sticky-move";
      span.dataset.fen = ctx.chess.fen();
      span.textContent = displayToken + " ";
      ctx.container.appendChild(span);

      return span;
    }

    // *** COMMENTS — always their own paragraph ***
    parseComment(movetext, pos, ctx) {
      const n = movetext.length;
      let idx = pos;

      // read until closing brace
      while (idx < n && movetext[idx] !== "}") idx++;
      const content = movetext.substring(pos, idx);
      if (idx < n && movetext[idx] === "}") idx++;

      const parts = content.split("[D]");
      for (let k = 0; k < parts.length; k++) {
        const text = parts[k].trim();
        if (text) {
          const p = document.createElement("p");
          p.className = "pgn-comment";
          appendText(p, text);
          this.wrapper.appendChild(p);
        }
        if (k < parts.length - 1) {
          createDiagram(this.wrapper, ctx.chess.fen());
        }
      }

      ctx.lastWasInterrupt = true;
      ctx.container = null;
      this.lastLiteralToken = null;

      return idx;
    }

    buildMovetextDOM(movetext) {
      const mainChess = new Chess();

      let ctx = {
        type: "main",
        chess: mainChess,
        container: null,
        parent: null,
        lastWasInterrupt: false,
        prevFen: mainChess.fen(),
        prevHistoryLen: 0,
        baseHistoryLen: null
      };

      let i = 0;
      const n = movetext.length;

      while (i < n) {
        const ch = movetext[i];

        // whitespace
        if (/\s/.test(ch)) {
          while (i < n && /\s/.test(movetext[i])) i++;
          this.ensureParagraph(
            ctx,
            ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
          );
          appendText(ctx.container, " ");
          continue;
        }

        // variation start
        if (ch === "(") {
          i++;

          const branchFen = ctx.prevFen || ctx.chess.fen();
          const branchLen =
            typeof ctx.prevHistoryLen === "number"
              ? ctx.prevHistoryLen
              : ctx.chess.history().length;

          ctx = {
            type: "variation",
            chess: new Chess(branchFen),
            container: null,
            parent: ctx,
            lastWasInterrupt: true,
            prevFen: branchFen,
            prevHistoryLen: branchLen,
            baseHistoryLen: branchLen
          };
          this.ensureParagraph(ctx, "pgn-variation");
          continue;
        }

        // variation end
        if (ch === ")") {
          i++;
          if (ctx.parent) {
            ctx = ctx.parent;
            ctx.lastWasInterrupt = true;
            ctx.container = null;
          }
          continue;
        }

        // comment block
        if (ch === "{") {
          i = this.parseComment(movetext, i + 1, ctx);
          continue;
        }

        // read token
        const start = i;
        while (i < n) {
          const c2 = movetext[i];
          if (/\s/.test(c2) || "(){}".includes(c2)) break;
          i++;
        }
        let token = movetext.substring(start, i);
        if (!token) continue;

        if (token === "[D]") {
          createDiagram(this.wrapper, ctx.chess.fen());
          ctx.lastWasInterrupt = true;
          ctx.container = null;
          this.lastLiteralToken = null;
          continue;
        }

        if (RESULT_REGEX.test(token)) {
          this.ensureParagraph(
            ctx,
            ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
          );
          appendText(ctx.container, token + " ");
          this.lastLiteralToken = token;
          continue;
        }

        if (MOVE_NUMBER_REGEX.test(token)) {
          continue;
        }

        const strippedCore = token
          .replace(/[^a-hKQRBN0-9=O0-]+$/g, "")
          .replace(/0/g, "O");
        const looksLikeSAN = PGNGameView.isSANCore(strippedCore);

        if (!looksLikeSAN) {
          if (EVAL_TOKEN.test(token) && token === this.lastLiteralToken) {
            continue;
          }

          const hasLetters = /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(token);

          if (hasLetters) {
            const p = document.createElement("p");
            p.className = "pgn-comment";
            appendText(p, token);
            this.wrapper.appendChild(p);
            this.lastLiteralToken = token;
            ctx.lastWasInterrupt = true;
            ctx.container = null;
          } else {
            this.ensureParagraph(
              ctx,
              ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
            );
            appendText(ctx.container, token + " ");
            this.lastLiteralToken = token;
          }

          continue;
        }

        this.ensureParagraph(
          ctx,
          ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );
        const sanSpan = this.handleSAN(token, ctx);
        if (!sanSpan) {
          appendText(ctx.container, token + " ");
          this.lastLiteralToken = token;
        }
      }
    }

    applyFigurines() {
      const map = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘" };
      const spans = this.wrapper.querySelectorAll(".pgn-move");

      spans.forEach((span) => {
        const m = span.textContent.match(/^([KQRBN])(.+?)(\s*)$/);
        if (!m) return;
        span.textContent = map[m[1]] + m[2] + (m[3] || "");
      });
    }
  }

  class PGNRenderer {
    static renderAll(root) {
      (root || document)
        .querySelectorAll("pgn")
        .forEach((el) => new PGNGameView(el));
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
    document.addEventListener("DOMContentLoaded", () => PGNRenderer.init());
  } else {
    PGNRenderer.init();
  }
})();
