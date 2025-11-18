// PGN loader + parser + renderer using chess.js
// Only engine/clock tags [%eval ...] [%clk ...] are removed; other comments are preserved

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

function removeEngineClockTags(text) {
    // Only remove [%...] tags, keep other comments intact
    return text.replace(/\[%.*?\]/g, '');
}

function buildHeader(tags) {
    const whitePart = [tags.WhiteTitle, tags.White, tags.WhiteElo ? `(${tags.WhiteElo})` : null].filter(Boolean).join(' ');
    const blackPart = [tags.BlackTitle, tags.Black, tags.BlackElo ? `(${tags.BlackElo})` : null].filter(Boolean).join(' ');
    const headerLine = `${whitePart} - ${blackPart}`;
    const eventLine = [tags.Event, tags.Date].filter(Boolean).join(', ');
    return { headerLine, eventLine };
}

function buildMovesText(chess) {
    const history = chess.history({ verbose: true });
    let movesText = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i]?.san || '';
        const blackMove = history[i + 1]?.san || '';

        movesText += `${moveNumber}. ${whiteMove}`;
        if (blackMove) movesText += ` ${blackMove} `;
        else movesText += ' ';
    }

    movesText = movesText.trim();
    movesText += ` ${chess.header().Result || '*'}`;

    return movesText;
}

async function renderPGN() {
    let pgnText = await loadPGN();
    if (!pgnText) return;

    // Only remove engine/clock tags, keep other annotations
    pgnText = removeEngineClockTags(pgnText);

    const chess = new Chess();
    if (!chess.load_pgn(pgnText)) {
        console.error('Invalid PGN');
        return;
    }

    const tags = chess.header();
    const { headerLine, eventLine } = buildHeader(tags);
    const movesText = buildMovesText(chess);

    const container = document.getElementById('pgn-output');
    container.textContent = `${headerLine}\n${eventLine}\n${movesText}`;
}

document.addEventListener('DOMContentLoaded', renderPGN);
