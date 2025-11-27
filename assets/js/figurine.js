// assets/js/chess/figurine.js
// Global, robust figurine renderer that works in Athena homepage post blocks.
// - Converts piece SAN (Nf3, Qxe7+, Bb5, etc.) to figurines (♘,♕,♗...)
// - Leaves pawn moves like e4 / exd5 as-is
// - Skips code blocks, script/style, form inputs
// - Works inside links and titles (Athena homepage post blocks)
// - Observes DOM mutations (dynamic content)

(function () {
  "use strict";

  const PIECE_MAP = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘"
  };

  // SAN patterns we want to convert. Grouped to avoid accidental matches.
  // Matches:
  //  O-O, O-O-O
  //  K, Q, R, B, N moves like Nf3, R1a3, Qxe7+, Bc4# or Nbd2
  //  (pawn moves such as e4 or exd5 intentionally NOT converted to a pawn glyph)
  const SAN_REGEX = /\b(O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[KQRBN]x[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

  // Elements we do NOT descend into
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "CODE",
    "PRE",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "NOSCRIPT"
  ]);

  // Quick check to avoid running heavy regex too often on nodes that obviously don't contain SAN.
  function likelyContainsSAN(text) {
    if (!text) return false;
    // look for uppercase piece letter or castling O-O
    return /[KQRBN]|O-O/.test(text);
  }

  // Convert a single text node in place
  function convertTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !likelyContainsSAN(text)) return;

    // Replace SAN piece moves with figurine-prefixed SAN.
    // We only replace matches that start with a piece letter; castling O-O / O-O-O left unchanged.
    const replaced = text.replace(SAN_REGEX, (match, g1) => {
      // Castling (O-O / O-O-O) — leave as-is
      if (match === "O-O" || match === "O-O-O") return match;

      // If it starts with a piece letter, map it
      const firstChar = match.charAt(0);
      if (PIECE_MAP[firstChar]) {
        return PIECE_MAP[firstChar] + match.slice(1);
      }

      // otherwise (shouldn't happen with our regex) return original
      return match;
    });

    // If nothing changed, do nothing
    if (replaced === text) return;

    // Replace text node value (safe — we operate only on text nodes)
    textNode.nodeValue = replaced;
  }

  // Walk a subtree and convert text nodes
  function walkAndConvert(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Reject text nodes that are inside skipped tags
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
          // Also skip if parent or ancestor has attribute data-no-figurine="true"
          if (parent.closest && parent.closest("[data-no-figurine='true']")) return NodeFilter.FILTER_REJECT;
          // Otherwise accept
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let n;
    while ((n = walker.nextNode())) {
      convertTextNode(n);
    }
  }

  // Debounced runner for performance (batches rapid mutation events)
  let scheduled = null;
  function scheduleRun(root) {
    if (scheduled) return;
    scheduled = requestIdleCallback
      ? requestIdleCallback(() => {
          scheduled = null;
          walkAndConvert(root || document.body);
        }, { timeout: 300 })
      : setTimeout(() => {
          scheduled = null;
          walkAndConvert(root || document.body);
        }, 120);
  }

  // Initial run after DOM ready
  function initOnce() {
    walkAndConvert(document.body);

    // Observe DOM mutations (for Athena homepage blocks, lazy loading, PJAX, etc.)
    const mo = new MutationObserver((mutations) => {
      // If many mutations, just schedule a general run
      if (mutations.length > 8) {
        scheduleRun(document.body);
        return;
      }

      // Otherwise process added nodes individually for a bit more precision
      for (const m of mutations) {
        if (m.type === "characterData") {
          // character changes are handled by walk on the changed node's parent
          scheduleRun(m.target.parentNode || document.body);
        }
        if (m.addedNodes && m.addedNodes.length) {
          for (const node of m.addedNodes) {
            // only schedule conversion for element nodes (1)
            if (node.nodeType === Node.ELEMENT_NODE) {
              scheduleRun(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
              scheduleRun(node.parentNode || document.body);
            }
          }
        }
      }
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Expose a manual API if needed
    window.ChessFigurine = {
      run: (root) => walkAndConvert(root || document.body),
      observeDisconnect: () => mo.disconnect()
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnce);
  } else {
    initOnce();
  }
})();
