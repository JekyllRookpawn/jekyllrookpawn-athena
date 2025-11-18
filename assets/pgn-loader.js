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

async function renderMoves() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const chess = new Chess();
  const loaded = chess.load_pgn(pgnText);

  if (!loaded) {
    console.error('Invalid PGN');
    return;
  }

  // Get moves as a simple SAN string
  const moves = chess.pgn()
                     .replace(/\[%.*?\]/g, '') // remove [%eval] or [%clk]
                     .replace(/\s+/g, ' ')     // normalize spaces
                     .trim();

  // Output moves
  const container = document.getElementById('moves-output');
  container.textContent = moves;
}

document.addEventListener('DOMContentLoaded', renderMoves);
