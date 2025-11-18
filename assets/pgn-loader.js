async function loadPGN() {
  const link = document.querySelector('link[rel="pgn"]');
  if (!link || !link.href) return null;

  try {
    const response = await fetch(link.href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (err) {
    console.error('Failed to load PGN:', err);
    return null;
  }
}

async function renderPGN() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const chess = new Chess();
  const loaded = chess.load_pgn(pgnText);

  if (!loaded) {
    console.error('Invalid PGN');
    return;
  }

  // 1. Render header info
  const tags = chess.header();
  const allowedTags = ['Event','Date','White','Black','WhiteElo','BlackElo','WhiteTitle','BlackTitle'];
  const headInfo = allowedTags
                     .filter(tag => tags[tag])
                     .map(tag => `${tag}: ${tags[tag]}`)
                     .join(', ');

  // 2. Render moves only (no header lines)
  const movesArray = chess.history(); // array of SAN moves
  const movesText = movesArray.join(' '); // join into single string

  // Output into two paragraphs
  const container = document.getElementById('pgn-output');
  container.innerHTML = `<p>${headInfo}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
