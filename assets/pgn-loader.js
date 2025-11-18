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
    let movesOnly = pgnText.replace(/^\[.*\]\s*$/gm, '').trim(); // remove headers
    movesOnly = movesOnly.replace(/\[%.*?\]/g, ''); // remove engine tags
    movesOnly = movesOnly.replace(/\{\s*\}/g, ''); // remove empty braces

    // Split all tokens: move numbers, moves, annotations
    const tokens = movesOnly.match(/(\d+\.)|(\{[^}]*\})|(\S+)/g);

    let movesText = '';
    let moveNumber = 1;
    for (let i = 0; i < tokens.len
