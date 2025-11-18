// PGN loader + renderer using chess.js
// Header in <p>, moves grouped together, each annotation in its own <p>

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

function extractMovesWithParagraphs(pgnText) {
    // Remove header lines starting with '['
    const lines = pgnText.split('\n');
    let movesLines = lines.filter(line => !line.startsWith('['));
    let movesText = movesLines.join(' ').trim();

    // Remove engine/clock/cal tags: { [%eval ...] }, { [%clk ...] }, { [%cal ...] }
    movesText = movesText.replace(/\{\s*\[%.*?\]\s*\}/g, '').trim();

    // Split into segments: annotations { ... } and plain moves
    const segments = movesText.split(/(\{[^}]*\})/g).filter(Boolean);

    let html = '';
    let movesBuffer = '';

    for (let seg of segments) {
        seg = seg.trim();
        if (!seg) continue;

        if (seg.startsWith('{') && seg.endsWith('}')) {
            // Flush buffered moves as one paragraph
            if (movesBuffer) {
                html += `<p>${movesBuffer.trim()}</p>`;
                movesBuffer = '';
            }
            // Add the annotation as its own paragraph
            html += `<p>${seg}</p>`;
        } else {
            // Accumulate moves
            movesBuffer += ' ' + seg;
        }
    }

    // Flush any remaining moves
    if (movesBuffer) html += `<p>${movesBuffer.trim()}</p>`;

    return html;
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

    const movesHTML = extractMovesWithParagraphs(pgnText);

    const container = document.getElementById('pgn-output');
    container.innerHTML = headerHTML + movesHTML;
}

document.addEventListener('DOMContentLoaded', renderPGN);
