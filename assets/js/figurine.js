// Safer full-page figurine converter: updates ONLY text nodes, never HTML tags

const FIGURINES = {
  'K': '\u2654',
  'Q': '\u2655',
  'R': '\u2656',
  'B': '\u2657',
  'N': '\u2658',
};

function toFigurineNotation(text) {
  return text.replace(/[KQRBN]/g, m => FIGURINES[m] || m);
}

const patterns = [
  { regex: /\bO-O-O\b/g, replace: m => m },
  { regex: /\bO-O\b/g, replace: m => m },
  { regex: /\b([KQRBN](?:[a-h]|[1-8])?[x-]?[a-h][1-8](?:=[QRBN])?[+#?!]*)/g, replace: m => toFigurineNotation(m) },
  { regex: /\b([a-h](?:x[a-h])?[1-8](?:=[QRBN])?[+#?!]*)/g, replace: m => m.replace(/=[QRBN]/, x => '=' + toFigurineNotation(x.slice(1))) },
  { regex: /\b(\d{1,3}\.{1,3})/g, replace: m => m },
];

function processTextContent(text) {
  let result = text;
  patterns.forEach(p => {
    result = result.replace(p.regex, p.replace);
  });
  return result;
}

function walkAndReplace(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(textNode => {
    const original = textNode.nodeValue;
    const replaced = processTextContent(original);
    if (replaced !== original) {
      textNode.nodeValue = replaced;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  walkAndReplace(document.body);
});
