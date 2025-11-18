// PGN loader + parser + renderer (custom header format, clean evaluation/clock tags)
// Loads a PGN file via <link rel="pgn" href="game.pgn"> and renders selected headers + moves, removing [%eval ...] and [%clk ...]

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

function parsePGN(pgnText) {
  const lines = pgnText.split(/\r?\n/);
  const tags = {};
  let moves = [];
  let inHeader = true;

  for (const line of lines) {
    if (inHeader && line.startsWith('[')) {
      const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);
      if (match) tags[match[1]] = match[2];
    } else {
      inHeader = false;
      if (line.trim() !== '') moves.push(line.trim());
    }
  }

  let moveText = moves.join(' ').replace(/\s+/g, ' ').trim();
  // Remove [%eval ...] and [%clk ...] tags but keep other annotations
  moveText = moveText.replace(/\[%eval[^\]]*\]/g, '');
  moveText = moveText.replace(/\[%clk[^\]]*\]/g, '');

  return { tags, moveText };
}

function renderPGN(parsed) {
  const container = document.getElementById('pgn-output');
  if (!container) return;

  const t = parsed.tags;

  // Construct custom header line
  let headerLine = '';
  if (t.WhiteTitle) headerLine += t.WhiteTitle + ' ';
  if (t.White) headerLine += t.White + ' ';
  if (t.WhiteElo) headerLine += `(${t.WhiteElo}) `;
  headerLine += '- '; // separator
  if (t.BlackTitle) headerLine += t.BlackTitle + ' ';
  if (t.Black) headerLine += t.Black + ' ';
  if (t.BlackElo) headerLine += `(${t.BlackElo})`;

  // Construct event/date line
  let eventLine = '';
  if (t.Event) eventLine += t.Event;
  if (t.Date) eventLine += eventLine ? `, ${t.Date}` : t.Date;

  let html = `<div>${headerLine}</div>`;
  if (eventLine) html += `<div>${eventLine}</div>`;

  // Display moves below
  html += `<pre>${parsed.moveText}</pre>`;

  container.innerHTML = html;
}

async function initPGNReader() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const parsed = parsePGN(pgnText);
  renderPGN(parsed);
}

document.addEventListener('DOMContentLoaded', initPGNReader);
