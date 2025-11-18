<script>
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

async function parseAndRenderPGN() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const chess = new Chess();
  const loaded = chess.load_pgn(pgnText);

  if (!loaded) {
    console.error('Invalid PGN');
    return;
  }

  // Display header (custom)
  const tags = chess.header();
  const headerLine = `${tags.WhiteTitle || ''} ${tags.White || ''} (${tags.WhiteElo || ''}) - ${tags.BlackTitle || ''} ${tags.Black || ''} (${tags.BlackElo || ''})`.trim();
  const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');
  
  const container = document.getElementById('pgn-output');
  container.innerHTML = `<div>${headerLine}</div><div>${eventLine}</div>`;

  // Display moves in <p>, including comments
  const moves = chess.pgn().replace(/\[%.*?\]/g, '').split(/\s*(\d+\.)\s*/).filter(s => s.trim() !== '');
  moves.forEach(move => {
    const p = document.createElement('p');
    p.textContent = move.trim();
    container.appendChild(p);
  });
}

document.addEventListener('DOMContentLoaded', parseAndRenderPGN);
</script>
