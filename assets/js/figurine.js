// assets/js/chess/figurine.js
(function () {

  const MAP = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘"
  };

  // Strict SAN detection
  const SAN_REGEX = /\b(?![a-z]{2,})(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|\b[a-h][1-8]\b)\b/g;

  const SKIP = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "A"]);

  function convertTextNode(node) {
    if (!node.nodeValue || !SAN_REGEX.test(node.nodeValue)) return;

    node.nodeValue = node.nodeValue.replace(SAN_REGEX, match => {
      if (match === "O-O" || match === "O-O-O") return match;
      const piece = match[0];
      return MAP[piece] ? MAP[piece] + match.slice(1) : match;
    });
  }

  function walk(node) {
    if (SKIP.has(node.nodeName)) return;

    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) {
        convertTextNode(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    walk(document.body);
  });

})();
