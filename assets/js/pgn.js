// assets/js/chess/pgn.js
(function () {
  "use strict";

  const PIECE_THEME_URL =
    "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png";

  const SAN_CORE_REGEX = /^(O-O(-O)?[+#]?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8](=[QRBN])?[+#]?)$/;
  const RESULT_REGEX = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
  const MOVE_NUMBER_REGEX = /^\d+\.+$/;

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

      this.board = null;
      this.activeMoveSpan = null;

      this.buildFromElement();
      this.attachMoveClickHandler();
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
      this.createMainBoard();
      this.buildMovetextDOM(
        movetext + (result ? " " + result : "")
      );

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

    createMainBoard() {
      if (typeof Chessboard === "undefined") {
        return;
      }
      const boardDiv = document.createElement("div");
      boardDiv.className = "pgn-main-board";
      boardDiv.style.width = "340px";
      boardDiv.style.maxWidth = "100%";

      // Insert board at the top of the block (just after the header)
      const refNode = this.wrapper.querySelector("h3");
      if (refNode && refNode.nextSibling) {
        this.wrapper.insertBefore(boardDiv, refNode.nextSibling);
      } else {
        this.wrapper.appendChild(boardDiv);
      }

      this.board = Chessboard(boardDiv, {
        position: "start",
        draggable: false,
        pieceTheme: PIECE_THEME_URL,
        // simple animation config (chessboard.js v1)
        moveSpeed: 200,
        snapSpeed: 100,
        snapbackSpeed: 100
      });
    }

    ensureParagraph(ctx, className) {
      if (!ctx.container) {
        const p = document.createElement("p");
        p.className = className;
        this.wrapper.appendChild(p);
        ctx.container = p;
      }
    }

    handleSANToken(displayToken, ctx) {
      const core = displayToken.replace(/[!?+#]+$/g, "");
      if (!PGNGameView.isSANCore(core)) return null;

      const ply = ctx.chess.history().length; // half-move count so far
      const isWhite = ply % 2 === 0;
      const moveNumber = Math.floor(ply / 2) + 1;

      if (isWhite) {
        // White move: always print "N."
        appendText(ctx.container, moveNumber + ". ");
        ctx.lastWasInterrupt = false;
      } else {
        // Black: only print "N..." if there was an interruption
        if (ctx.lastWasInterrupt) {
          appendText(ctx.container, moveNumber + "... ");
        }
        ctx.lastWasInterrupt = false;
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

    parseComment(movetext, pos, outerCtx) {
      const n = movetext.length;
      let idx = pos;

      // Read full comment content up to closing brace
      while (idx < n && movetext[idx] !== "}") idx++;
      const content = movetext.substring(pos, idx);
      if (idx < n && movetext[idx] === "}") idx++; // skip closing }

      const tokens = content.split(/\s+/).filter(Boolean);
      let hasSAN = false;
      for (let i = 0; i < tokens.length; i++) {
        const core = tokens[i].replace(/[!?+#]+$/g, "");
        if (PGNGameView.isSANCore(core)) {
          hasSAN = true;
          break;
        }
      }

      // ========= INLINE COMMENT (no SAN inside) =========
      if (!hasSAN) {
        this.ensureParagraph(
          outerCtx,
          outerCtx.type === "main" ? "pgn-mainline" : "pgn-variation"
        );

        // Split by [D] markers so we can drop diagrams at correct spots
        const parts = content.split("[D]");
        for (let pIndex = 0; pIndex < parts.length; pIndex++) {
          const textPart = parts[pIndex].trim();
          if (textPart) {
            // prepend space so it reads "... Na3 de düşünülebilemezdi."
            appendText(outerCtx.container, " " + textPart);
          }
          // If not the last part, there was a [D] here
          if (pIndex < parts.length - 1) {
            createDiagram(this.wrapper, outerCtx.chess.fen());
          }
        }
        // Inline comment does NOT count as interruption for numbering
        return idx;
      }

      // ========= BLOCK COMMENT (with SAN) =========
      // Use separate Chess for FEN, but do NOT print any move numbers here
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
          // After diagram in a block comment, start a new comment paragraph
          p = document.createElement("p");
          p.className = "pgn-comment";
          this.wrapper.appendChild(p);
          continue;
        }

        const core = token.replace(/[!?+#]+$/g, "");
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

      // Block comments DO count as interruption
      outerCtx.lastWasInterrupt = true;
      // next text in outer context should go to a fresh paragraph
      outerCtx.container = null;

      return idx;
    }

    buildMovetextDOM(movetext) {
      const mainChess = new Chess();

      const rootCtx = {
        type: "main",
        chess: mainChess,
        container: null,
        parent: null,
        lastWasInterrupt: false
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
            lastWasInterrupt: false
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
            ctx.lastWasInterrupt = true; // returning from var = interruption
            ctx.container = null; // next text in parent starts fresh paragraph
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
          if (
            /\s/.test(c2) ||
            c2 === "(" ||
            c2 === ")" ||
            c2 === "{" ||
            c2 === "}"
          )
            break;
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

        // Game result (1-0, ½-½, etc.)
        if (RESULT_REGEX.test(token)) {
          this.ensureParagraph(
            ctx,
            ctx.type === "main" ? "pgn-mainline" : "pgn-variation"
          );
          appendText(ctx.container, token + " ");
          continue;
        }

        // IGNORE literal PGN move numbers like "1.", "23."
        if (MOVE_NUMBER_REGEX.test(token)) {
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

    syncBoardToFEN(fen, span) {
      if (!this.board) return;
      this.board.position(fen, true); // use animation

      if (this.activeMoveSpan) {
        this.activeMoveSpan.classList.remove("pgn-move--active");
      }
      if (span) {
        span.classList.add("pgn-move--active");
        this.activeMoveSpan = span;
      }
    }

    attachMoveClickHandler() {
      this.wrapper.addEventListener("click", (evt) => {
        const target = evt.target.closest(".pgn-move");
        if (!target || !this.wrapper.contains(target)) return;
        const fen = target.dataset.fen;
        if (!fen) return;
        this.syncBoardToFEN(fen, target);
      });
    }

    applyFigurines() {
      // Prefer external figurine library if available
      if (window.ChessFigurine && typeof window.ChessFigurine.run === "function") {
        window.ChessFigurine.run(this.wrapper);
        return;
      }

      // Fallback: basic SAN -> figurine replacement for initial piece letter
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
        // Keep trailing whitespace
        const match = text.match(/^([KQRBN])(.+?)(\s*)$/);
        if (!match) return;
        const [, letter, rest, ws] = match;
        const fig = map[letter];
        if (!fig) return;
        span.textContent = fig + rest + (ws || "");
      });
    }
  }

  class PGNRenderer {
    static renderAll(root) {
      const scope = root || document;
      const elements = scope.querySelectorAll("pgn");
      elements.forEach((el) => new PGNGameView(el));
    }

    static init() {
      if (!ensureDeps()) return;

      PGNRenderer.renderAll(document);

      // public API
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
