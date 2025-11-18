// PGN loader + renderer using chess.js
// Header formatted on two lines with <p>, moves preserve comments except engine/clock/cal tags

async function loadPGN() {
    const link = document.querySelector('link[rel="pgn"]');
    if (!link?.href) return null;

    try {
        const response = await fetch(link.href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error('Failed to load PGN:', err);
        return null;
    }
}

function buildHeader(tags) {
    const formatPlayer = (title, name, elo) => {
        const parts = [];
        if (title) parts.push(title);
        if (name) parts.push(name);
        if (elo) parts.push(`(${elo})`);
        return parts.join(' ');
    };

    const white = formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo);
    const black = formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo);
    const siteDate = [tags.Site, tags.Date].filter(Boolean).join(', ');

    return `<p>${white} - ${black}<br>${siteDate}</p>`;
}

function extractMovesOnly(pgnText) {
    // Remove all header tag lines: lines starting with '['
    const lines = pgnText.split('\n');
    let movesLines = lines.filter(line => !line.startsWith('['));
    let movesText = movesLines.join(' ').trim();

    // Remove engine/clock/cal tags: { [%eval ...] }, { [%clk ...] }, { [%cal ...] }
    movesText = movesText.replace(/\{\s*\[%.*?\]\s*\}/g, '').trim();

    return movesText;
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const chess = new Chess();
    if (!chess.load_pgn(pgnText, { sloppy: true })) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();
    const headerHTML = buildHeader(tags);

    const movesText = extractMovesOnly(pgnText);

    const container = document.getElementById('pgn-output');
    container.innerHTML = `${headerHTML}<p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
