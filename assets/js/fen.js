// Store board objects to manage their life cycle (e.g., calling .resize())
        const boardObjects = [];
        let boardCounter = 0;

        // 1. Define a consistent default configuration
        const DEFAULT_CONFIG = {
            draggable: false, 
            orientation: 'white',
            // Using the Alpha set for pieces
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png'
        };

        // 2. Main parsing and rendering function
        function renderBoards() {
            // Use querySelectorAll to find all custom <FEN> tags, which the browser parses as unknown elements.
            const fenElements = document.querySelectorAll('FEN'); 
            
            // Temporary array to hold FENs and IDs before initialization
            const fensToRender = [];

            // 2.1: Iterate over each found FEN element
            fenElements.forEach(fenEl => {
                const fenString = fenEl.textContent.trim();
                
                // Only process if a valid FEN string is found
                if (!fenString) return; 

                const boardId = 'board-' + (boardCounter++);
                
                // Store the FEN and ID for later initialization
                fensToRender.push({ id: boardId, fen: fenString });

                // 2.2: Create the new HTML wrapper element
                const newWrapper = document.createElement('div');
                newWrapper.className = 'board-wrapper';
                // Note: The innerHTML here is just a placeholder div for chessboard.js
                newWrapper.innerHTML = `<div id="${boardId}" class="board-instance"></div>`;

                // 2.3: Replace the original <FEN> element with the new wrapper
                if (fenEl.parentNode) {
                    fenEl.parentNode.replaceChild(newWrapper, fenEl);
                }
            });

            // 3. Now initialize all boards on the newly created DOM elements
            fensToRender.forEach(item => {
                const config = { 
                    ...DEFAULT_CONFIG, 
                    position: item.fen,
                    // Set a fixed width for consistent rendering across boards
                    // The CSS max-width: 400px property now handles the maximum size.
                    width: 300 
                };

                // Initialize the board using the ID
                const board = Chessboard(item.id, config);
                boardObjects.push(board);
            });
        }

        // 3. Attach event listeners for automatic rendering
        window.onload = function() {
            // Initial render when the page loads
            renderBoards();
            
            // Also call resize on all boards when the window resizes (important for responsiveness)
            window.addEventListener('resize', function() {
                boardObjects.forEach(board => board.resize());
            });
        };
