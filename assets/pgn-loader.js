// PGN loader + parser + renderer using chess.js

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

    const tags = chess.header();

    // Custom header format
    const whitePart = `${tags.WhiteTitle ? tags.WhiteTitle + ' ' : ''}${tags.White || ''} ${tags.WhiteElo ? '(' + tags.WhiteElo + ')' : ''}`.trim();
    const blackPart = `${tags.BlackTitle ? tags.BlackTitle + ' ' : ''}${tags.Black || ''} ${tags.BlackElo ? '(' + tags.BlackElo + ')' : ''}`.trim();
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');

    // Parse PGN moves including annotations
    let movesText = '';
    let movesOnly = pgnText.replace(/^\[.*\]\s*$/gm, '').trim(); // remove headers
    movesOnly = movesOnly.replace(/\[%.*?\]/g, ''); // remove engine tags like [%eval], [%clk]

    // Split moves by move numbers
    const moveChunks = movesOnly.split(/\s*(\d+\.)\s*/).filter(s => s.trim() !== '');

    for (let i = 0; i < moveChunks.length; i += 2) {
        const moveNumber = moveChunks[i].replace('.', '');
        const moves = moveChunks[i + 1] ? moveChunks[i + 1].trim() : '';
        if (moves) {
            movesText += `${moveNumber}. ${moves} `;
        }
    }

    movesText = movesText.trim();

    // Append game result at the end
    if (tags.Result) {
        movesText += ` ${tags.Result}`;
    }

    // Output into three paragraphs: header, event, moves with annotations
    const container = document.getElementById('pgn-output');
    container.innerHTML = `<p>${headerLine}</p><p>${eventLine}</p><p>${movesText}</p>`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
