$(function() {

  function formatPlayer(title, name, elo) {
    var parts = [];
    if (title) parts.push(title);
    if (name) parts.push(name);
    if (elo) parts.push("(" + elo + ")");
    return parts.join(" ");
  }

  function parseMovesWithComments(pgn) {
    var moves = [];
    pgn = pgn.replace(/\[.*\]\s*/g, '');
    pgn = pgn.replace(/\s+/g, ' ').trim();
    pgn = pgn.replace(/\d+\.+/g, '');
    var regex = /([O\-a-hRNBQK0-9=+#]+)\s*(\{([^}]*)\})?/g;
    var match;
    while ((match = regex.exec(pgn)) !== null) {
      moves.push({ san: match[1], comment: match[3] || '' });
    }
    return moves;
  }

  $("pgn").each(function(i) {
    var rawPgn = $(this).text().trim();
    var game = new Chess();
    if (!game.load_pgn(rawPgn)) {
      $(this).replaceWith("<div>Invalid PGN</div>");
      return;
    }

    var movesWithComments = parseMovesWithComments(rawPgn);
    var headers = game.header();

    var whiteStr = formatPlayer(headers.WhiteTitle, headers.White, headers.WhiteElo);
    var blackStr = formatPlayer(headers.BlackTitle, headers.Black, headers.BlackElo);
    var site = headers.Site || "";
    var year = headers.Date ? headers.Date.split(".")[0] : "";
    var customHeader = whiteStr + " — " + blackStr + " | " + site + (year ? " " + year : "");

    // Create container elements
    var $container = $("<div class='gameContainer'></div>");
    var $header = $("<div class='gameHeader'></div>").text(customHeader);
    var $board = $("<div></div>").attr("id","board"+i).css("width","350px");
    var $controls = $("<div class='controls'></div>");
    $controls.append("<button class='prevBtn'>Prev</button>");
    $controls.append("<button class='nextBtn'>Next</button>");
    var $moves = $("<div class='moves'></div>");

    $container.append($header, $board, "<br>", $controls, $moves);
    $(this).replaceWith($container);

    var board = Chessboard("board"+i, {
      position: 'start',
      pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });

    var index = 0;

    function renderMoves() {
      $moves.empty();
      for (var j = 0; j < movesWithComments.length; j += 2) {
        var moveNumber = (j/2) + 1;

        // White move
        var white = movesWithComments[j];
        $moves.append("<span class='move' data-i='"+j+"'>" + moveNumber + ". " + white.san + "</span>");
        if (white.comment) $moves.append("<span class='comment'> " + white.comment + "</span>");

        // Black move
        if (j+1 < movesWithComments.length) {
          var black = movesWithComments[j+1];
          $moves.append(" <span class='move' data-i='"+(j+1)+"'>" + black.san + "</span>");
          if (black.comment) $moves.append("<span class='comment'> " + black.comment + "</span>");
        }

        $moves.append(" "); // space after each full move
      }
      highlightMove();
    }

    function updateBoard() {
      game.reset();
      for (var j = 0; j < index; j++) {
        game.move(movesWithComments[j].san);
      }
      board.position(game.fen());
      highlightMove();
    }

    function highlightMove() {
      $moves.find(".move").removeClass("active");
      if (index>0) $moves.find(".move[data-i='"+(index-1)+"']").addClass("active");
    }

    $moves.on("click",".move",function() {
      var iClicked = parseInt($(this).data("i"));
      if (!isNaN(iClicked)) {
        index = iClicked + 1;
        updateBoard();
      }
    });

    $controls.find(".prevBtn").click(function() { if(index>0){ index--; updateBoard(); } });
    $controls.find(".nextBtn").click(function() { if(index<movesWithComments.length){ index++; updateBoard(); } });

    renderMoves();
    updateBoard();
  });

});
