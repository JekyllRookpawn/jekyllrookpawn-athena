// PGN loader + renderer using chess.js
// Moves on a single line, annotations immediately after move in <p>, engine/clock/cal removed

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
    // Remove engine/clock/cal tags
    let cleanText = pgnText.replace(/\{\s*\[%.*?\]\s*\}/g, '').trim();

    // Extract annotations with their positions
    const annotationRegex = /\{([^}]*)\}/g;
    const annotations = [];
    let match;
    while ((match = annotationRegex.exec(cleanText)) !== null) {
        const ann = match[1].trim();
        if (ann) annotations.push({ index: match.index, text: `{${ann}}` });
    }

    // Remove annotations from moves for parsing
    cleanText = cleanText.replace(annotationRegex, '').replace(/\s+/g, ' ').trim();

    // Use chess.js to get proper move history
    const chess = new Chess();
    chess.load_pgn(pgnText, { sloppy: true });
    const history = chess.history({ verbose: true });

    // Build single-line moves string
    let moveNumber = 1;
    let movesLine = '';
    const htmlParts = [];

    for (let i = 0; i < history.length; i += 2) {
        let moveStr = `${moveNumber}. ${history[i].san}`;
        if (history[i + 1]) moveStr += ` ${history[i + 1].san}`;
        movesLine += moveStr + ' ';

        // Determine if any annotations belong to these moves
        const moveStartIndex = cleanText.indexOf(history[i].san, movesLine.length - moveStr.length - 1);
        annotations.forEach(a => {
            if (a.index >= moveStartIndex && a.index < moveStartIndex + moveStr.length) {
                htmlParts.push(`<p>${a.text}</p>`);
            }
        });

        moveNumber++;
    }

    movesLine = movesLine.trim();
    htmlParts.unshift(`<p>${movesLine}</p>`); // add moves first

    return htmlParts.join('');
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
