// PGN loader + renderer using chess.js
// Preserve all moves, comments, and engine/clock tags
// Header formatted on two lines using <p>

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

    // Use <br> to separate the two lines
    return `<p>${white} - ${black}<br>${siteDate}</p>`;
}

function extractMovesOnly(pgnText) {
    // Remove all header tag lines: lines starting with '['
    const lines = pgnText.split('\n');
    const movesLines = lines.filter(line => !line.startsWith('['));
    return movesLines.join(' ').trim();
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

    // Extract only moves section from the PGN (preserve comments and engine/clock tags)
    const movesText = extractMovesOnly(pgnText);

    const container = document.getElementById('pgn-output');
    container.innerHTML = `${headerHTML}<p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
