---
layout: category-post
title:  "Simple PGN viewer"
date:   2025-11-11
categories: writing
FEN: rnbqkb1r%2Fpp3ppp%2F4pn2%2F2p5%2F3P4%2FN1P2N2%2FPP3PPP%2FR1BQKB1R+w+KQkq+-+2+7
---

<div id="board"></div>

<div class="controls">
  <button id="startBtn" onclick="toStart()"><<</button>
  <button id="prevBtn" onclick="prevMove()"><</button>
  <button id="nextBtn" onclick="nextMove()">></button>
  <button id="endBtn" onclick="toEnd()">>></button>
</div>

<p id="pgnDisplay"></p>

<script type="text/pgn" id="game-pgn">
<pgn>
[Event "Paris Opera House"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0
</pgn>
</script>