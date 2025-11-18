// PGN loader + renderer using chess.js
// Moves on a single line, annotations immediately after their move in <p>, engine/clock/cal removed

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
    const formatPlayer = (title, name, elo) =>
        [title, name, elo ? `(${elo})` : ''].filter(Boolean).join(' ');

    const white = formatPlayer(tags.WhiteTitle, tags.White, tags.WhiteElo);
    const black = formatPlayer(tags.BlackTitle, tags.Black, tags.BlackElo);
    const siteDate = [tags.Site, tags.Date].filter(Boolean).join(', ');

    return `<p>${white} - ${black}<br>${siteDate}</p>`;
}

function parseMovesWithAnnotations(pgnText) {
    // Remove engine/clock/cal tags like { [%eval ...] }, { [%clk ...] }, { [%cal ...] }
    let cleanPGN = pgnText.replace(/\{\s*\[%.*?\]\s*\}/g, '').trim();

    // Extract all annotations with their position in text
    const annotationRegex = /\{([^}]*)\}/g;
    const annotations = [];
    let match;
    while ((match = annotationRegex.exec(cleanPGN)) !== null) {
        const ann = match[1].trim();
        if (ann) annotations.push({ index: match.index, text: `{${ann}}` });
    }

    // Remove annotations from PGN for move parsing
    cleanPGN = cleanPGN.replace(annotationRegex, ' ');

    // Use chess.js to get move history
    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const history = chess.history({ verbose: true });

    let html = '';
    let moveNumber = 1;
    let cursor = 0; // Track character index in cleanPGN

    // Build moves on a single line
    let movesLine = '';

    for (let i = 0; i < history.length; i += 2) {
        let moveStr = `${moveNumber}. ${history[i].san}`;
        if (history[i + 1]) moveStr += ` ${history[i + 1].san}`;
        movesLine += moveStr + ' ';

        // Check for annotations belonging to this move
        annotations.forEach(a => {
            if (a.index >= cursor && a.index < cursor + moveStr.length) {
                html += `<p>${movesLine.trim()}</p>`; // add moves line
                html += `<p>${a.text}</p>`;           // annotation right after
                movesLine = ''; // reset moves line after placing it with annotation
            }
        });

        cursor += moveStr.length + 1; // update cursor for next move
        moveNumber++;
    }

    // Add any remaining moves that have no annotations
    if (movesLine.trim()) html += `<p>${movesLine.trim()}</p>`;

    return html;
}

async function renderPGN() {
    const pgnText = await loadPGN();
    if (!pgnText) return;

    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const tags = chess.header();

    const headerHTML = buildHeader(tags);
    const movesHTML = parseMovesWithAnnotations(pgnText);

    document.getElementById('pgn-output').innerHTML = headerHTML + movesHTML;
}

document.addEventListener('DOMContentLoaded', renderPGN);
