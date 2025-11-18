// PGN loader + parser + renderer (custom header, clean tags, remove empty braces, merge half-moves)

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
  }// PGN loader + parser + renderer (custom header, clean tags, remove empty braces, merge half-moves, remove %cal/%csl, wrap moves and annotations in <p>)

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
      if (line.trim() !== '' && !line.includes('%cal') && !line.includes('%csl')) moves.push(line.trim());
    }
  }

  let moveText = moves.join(' ').replace(/\s+/g, ' ').trim();
  moveText = moveText.replace(/\[%eval[^\]]*\]/g, '');
  moveText = moveText.replace(/\[%clk[^\]]*\]/g, '');
  moveText = moveText.replace(/\{\s*\}/g, '');
  moveText = moveText.replace(/(\d+\.\s*\S+)\s+\1\.\.\.\s*(\S+)/g, '$1 $2');

  // Split moves and annotations into separate items for <p>
  const parts = moveText.split(/(?=\{)/g); // split before each annotation

  return { tags, moveParts: parts };
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
  headerLine += '- ';
  if (t.BlackTitle) headerLine += t.BlackTitle + ' ';
  if (t.Black) headerLine += t.Black + ' ';
  if (t.BlackElo) headerLine += `(${t.BlackElo})`;

  let eventLine = '';
  if (t.Event) eventLine += t.Event;
  if (t.Date) eventLine += eventLine ? `, ${t.Date}` : t.Date;

  let html = `<div>${headerLine}</div>`;
  if (eventLine) html += `<div>${eventLine}</div>`;

  // Wrap each move/annotation in <p>
  parsed.moveParts.forEach(part => {
    html += `<p>${part.trim()}</p>`;
  });

  container.innerHTML = html;
}

async function initPGNReader() {
  const pgnText = await loadPGN();
  if (!pgnText) return;

  const parsed = parsePGN(pgnText);
  renderPGN(parsed);
}

document.addEventListener('DOMContentLoaded', initPGNReader);
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
  // Remove [%eval ...], [%clk ...] tags
  moveText = moveText.replace(/\[%eval[^\]]*\]/g, '');
  moveText = moveText.replace(/\[%clk[^\]]*\]/g, '');
  // Remove empty braces {}
  moveText = moveText.replace(/\{\s*\}/g, '');

  // Merge half-moves where nothing is between them
  // e.g., '1. e4 1... c5' -> '1. e4 c5'
  moveText = moveText.replace(/(\d+\.\s*\S+)\s+\1\.\.\.\s*(\S+)/g, '$1 $2');

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
