//
// Strategic Block Builder - Main Container
// Implements the game UI and logic (9x9 grid, block dragging, scoring, restart, dark theme)
//

/**
 * Block color palette (colorful, bold for dark theme)
 */
const BLOCK_COLORS = [
  "#f5246d", // accent
  "#00c2ff",
  "#ffe156",
  "#62e403",
  "#ff6f32",
  "#19e68c",
  "#956ff9",
  "#f9ed69",
  "#ffa36c",
  "#65d6ff"
];
const GRID_SIZE = 9;
const SELECTION_COUNT = 3;
const PRIMARY_COLOR = "#4100a3";
const SECONDARY_COLOR = "#FFFFFF";
const ACCENT_COLOR = "#f5246d";
const CELL_EMPTY = 0;

type Cell = number;
type Grid = Cell[][];
type Position = { x: number; y: number };
type Shape = number[][]; // 2D block shape (eg. 1/0 matrix)
type SelectionBlock = { shape: Shape; color: string; id: string };

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shapes(): Shape[] {
  // Block Blast and Tetris inspired shapes - can extend as desired.
  return [
    [[1]], // single
    [[1,1]], // 2-horiz
    [[1],[1]], // 2-vert

    [[1,1,1]], // 3-horiz
    [[1],[1],[1]], // 3-vert
    [[1,1],[1,0]], // L (corner)
    [[1,1],[0,1]], // flipped L
    [[1,1],[1,1]], // 2x2 square

    [[1,1,1],[0,1,0]], // T
    [[1,0],[1,0],[1,1]], // reverse L
    [[0,1],[0,1],[1,1]], // reverse J

    [[1,1,1,1]], // 4-horizontal
    [[1],[1],[1],[1]], // 4-vertical

    [[1,1,1],[1,0,0],[1,0,0]], // fat L
    [[1,1,1],[0,0,1],[0,0,1]], // fat J
  ];
}

// PUBLIC_INTERFACE
/**
 * Returns a random block shape and color, with a unique id.
 */
function randomBlockShape(): SelectionBlock {
  const color = randomElement(BLOCK_COLORS);
  // Deep clone shape so new block is not mutated
  const shapeMat = JSON.parse(JSON.stringify(randomElement(shapes())));
  const id = Math.random().toString(36).substr(2, 8) + Date.now();
  return { shape: shapeMat, color, id };
}

// PUBLIC_INTERFACE
/**
 * Generates a fresh grid (all empty)
 */
function makeEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(CELL_EMPTY)
  );
}

// PUBLIC_INTERFACE
/**
 * Checks if a given shape can fit the grid at position (top-left).
 */
function canPlaceBlock(grid: Grid, shape: Shape, pos: Position): boolean {
  const [sh, sw] = [shape.length, shape[0].length];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (shape[y][x] === 1) {
        const gridY = pos.y + y;
        const gridX = pos.x + x;
        if (
          gridY < 0 || gridY >= GRID_SIZE ||
          gridX < 0 || gridX >= GRID_SIZE ||
          grid[gridY][gridX] !== CELL_EMPTY
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

// PUBLIC_INTERFACE
/**
 * Place a block's shape on the grid at position (top-left), mutates grid.
 */
function placeBlock(grid: Grid, shape: Shape, pos: Position, blockId: number): void {
  const [sh, sw] = [shape.length, shape[0].length];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (shape[y][x] === 1) {
        const gridY = pos.y + y;
        const gridX = pos.x + x;
        grid[gridY][gridX] = blockId;
      }
    }
  }
}

// PUBLIC_INTERFACE
/**
 * Checks the grid for completed lines (row/col). Returns cleared indices.
 */
function checkLines(grid: Grid): { rows: number[]; cols: number[] } {
  const fullRows: number[] = [];
  const fullCols: number[] = [];
  // check rows
  for (let y = 0; y < GRID_SIZE; y++) {
    if (grid[y].every(cell => cell !== CELL_EMPTY)) fullRows.push(y);
  }
  // check cols
  for (let x = 0; x < GRID_SIZE; x++) {
    let full = true;
    for (let y = 0; y < GRID_SIZE; y++) {
      if (grid[y][x] === CELL_EMPTY) { full = false; break; }
    }
    if (full) fullCols.push(x);
  }
  return { rows: fullRows, cols: fullCols };
}

// PUBLIC_INTERFACE
/**
 * Clears given rows+cols from the grid (set to empty)
 */
function clearLines(grid: Grid, rows: number[], cols: number[]): void {
  for (const y of rows) {
    for (let x = 0; x < GRID_SIZE; x++) grid[y][x] = CELL_EMPTY;
  }
  for (const x of cols) {
    for (let y = 0; y < GRID_SIZE; y++) grid[y][x] = CELL_EMPTY;
  }
}

// PUBLIC_INTERFACE
/**
 * Returns true if any of the selection blocks can still be placed on the board.
 */
function anyPlacementPossible(grid: Grid, selection: SelectionBlock[]): boolean {
  for (const block of selection) {
    const [sh, sw] = [block.shape.length, block.shape[0].length];
    for (let y = 0; y <= GRID_SIZE - sh; y++) {
      for (let x = 0; x <= GRID_SIZE - sw; x++) {
        if (canPlaceBlock(grid, block.shape, { x, y })) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * UI Helper: Generate block html to render in drag zone or grid preview
 * Optionally provide an overlay color for validity preview.
 */
function renderBlock(
  shape: Shape,
  color: string,
  cellSize = 28,
  outline = false,
  visualOverlay: string | null = null
): HTMLDivElement {
  const sh = shape.length;
  const sw = shape[0].length;
  const blockDiv = document.createElement("div");
  blockDiv.style.display = "inline-block";
  blockDiv.style.width = sw * cellSize + "px";
  blockDiv.style.height = sh * cellSize + "px";
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const cell = document.createElement("div");
      cell.style.position = "absolute";
      cell.style.left = x * cellSize + "px";
      cell.style.top = y * cellSize + "px";
      cell.style.width = cellSize + "px";
      cell.style.height = cellSize + "px";
      cell.style.boxSizing = "border-box";
      if (shape[y][x]) {
        cell.style.background = visualOverlay || color;
        cell.style.borderRadius = "7px";
        cell.style.transition = "background 0.1s";
        if (outline) cell.style.border = `2.3px solid ${ACCENT_COLOR}`;
        else cell.style.border = `2px solid #23223a`;
        cell.style.boxShadow = "0 0 6px 0 #18181e";
      }
      blockDiv.appendChild(cell);
    }
  }
  // Container: must be relatively positioned
  blockDiv.style.position = "relative";
  return blockDiv;
}

/**
 * UI Helper: Create a 9x9 grid as DOM for game area
 * Each cell is a div with proper data attributes for coordinates.
 */
function renderGrid(
  grid: Grid,
  cellColorsMap: Map<number, string>,
  cellSize = 34,
  validOverlay: boolean[][] | null = null,
  invalidOverlay: boolean[][] | null = null
): HTMLDivElement {
  const board = document.createElement("div");
  board.className = "sbb-grid";
  board.style.display = "grid";
  board.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
  board.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;
  board.style.background = "#1d1140";
  board.style.border = `3.4px solid ${PRIMARY_COLOR}`;
  board.style.boxShadow = "0 0 28px 0 #2c125cbb";
  board.style.borderRadius = "9px";
  board.style.margin = "0 auto";
  board.style.width = board.style.height = GRID_SIZE * cellSize + "px";
  board.style.gap = "3px";
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const box = document.createElement("div");
      box.className = "sbb-grid-cell";
      box.style.width = box.style.height = cellSize + "px";
      box.style.borderRadius = "7px";
      box.style.background =
        grid[y][x] !== CELL_EMPTY
          ? cellColorsMap.get(grid[y][x]) as string
          : "#20194c";
      if (
        validOverlay && validOverlay[y] && validOverlay[y][x]
      ) {
        box.style.outline = `2.7px solid #61edb6`;
      } else if (
        invalidOverlay && invalidOverlay[y] && invalidOverlay[y][x]
      ) {
        box.style.outline = `2.3px solid ${ACCENT_COLOR}`;
      } else {
        box.style.outline = "none";
      }
      board.appendChild(box);
    }
  }
  return board;
}

/**
 * UI Helper for top bar: Score + Restart
 */
function renderTopBar(score: number, onRestartClick: () => void): HTMLDivElement {
  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.width = "100%";
  bar.style.maxWidth = "max(70vw, 410px)";
  bar.style.margin = "0 auto 18px auto";
  bar.style.color = SECONDARY_COLOR;
  bar.style.fontWeight = "bold";
  bar.style.fontSize = "2.2rem";

  const scoreSpan = document.createElement("span");
  scoreSpan.textContent = `Score: ${score}`;
  scoreSpan.style.color = ACCENT_COLOR;
  scoreSpan.style.filter = "drop-shadow(0 2px 0 #1d1140)";

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Restart";
  restartBtn.style.fontSize = "1.1rem";
  restartBtn.style.background = PRIMARY_COLOR;
  restartBtn.style.color = SECONDARY_COLOR;
  restartBtn.style.border = `2px solid ${ACCENT_COLOR}`;
  restartBtn.style.padding = "0.4em 1.6em";
  restartBtn.style.marginLeft = "1.3em";
  restartBtn.style.borderRadius = "8px";
  restartBtn.style.cursor = "pointer";
  restartBtn.onmouseenter = () =>
    (restartBtn.style.background = ACCENT_COLOR);
  restartBtn.onmouseleave = () =>
    (restartBtn.style.background = PRIMARY_COLOR);

  restartBtn.onclick = onRestartClick;

  bar.appendChild(scoreSpan);
  bar.appendChild(restartBtn);
  return bar;
}

/**
 * UI Helper for "game over"
 */
function renderGameOverBar(score: number, onRestartClick: () => void): HTMLDivElement {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = "50%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.fontSize = "2rem";
  div.style.fontWeight = "bold";
  div.style.padding = "3.5rem 4rem";
  div.style.background = "#19102eeb";
  div.style.color = SECONDARY_COLOR;
  div.style.border = `2.6px solid ${ACCENT_COLOR}`;
  div.style.borderRadius = "16px";
  div.style.boxShadow = "0 0 28px 0 #2c125cbb";
  div.style.textAlign = "center";
  div.innerHTML = `<div style="color:${ACCENT_COLOR};font-size:2.6rem;margin-bottom:0.7em;">Game Over</div>
  <div style="margin-bottom:0.6em;">Final Score: <b style="color: ${SECONDARY_COLOR};">${score}</b></div>`;

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Play Again";
  restartBtn.style.fontSize = "1.2rem";
  restartBtn.style.background = ACCENT_COLOR;
  restartBtn.style.color = SECONDARY_COLOR;
  restartBtn.style.border = `2px solid ${PRIMARY_COLOR}`;
  restartBtn.style.padding = "0.7em 2.1em";
  restartBtn.style.borderRadius = "8px";
  restartBtn.style.cursor = "pointer";
  restartBtn.style.marginTop = "0.8em";

  restartBtn.onclick = onRestartClick;
  div.appendChild(document.createElement("br"));
  div.appendChild(restartBtn);
  return div;
}

/**
 * UI Helper to render the block selection row (draggable blocks)
 */
function renderBlockSelectionArea(
  selection: SelectionBlock[],
  used: Set<string>,
  dragHandlers: {
    dragstart: (ev: DragEvent, blockIdx: number) => void;
    dragend: (ev: DragEvent, blockIdx: number) => void;
  },
  draggingIdx: number | null
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.justifyContent = "center";
  wrap.style.gap = "36px";
  wrap.style.margin = "28px 0 1.5em 0";
  selection.forEach((block, idx) => {
    const blockWrap = document.createElement("div");
    blockWrap.className = "sbb-selection-block";
    blockWrap.style.opacity = used.has(block.id) ? "0.24" : "1";
    blockWrap.style.pointerEvents = used.has(block.id) ? "none" : "auto";
    blockWrap.style.transition = "opacity 0.2s";
    blockWrap.style.userSelect = "none";
    const dragDiv = renderBlock(
      block.shape,
      block.color,
      34,
      true,
      draggingIdx === idx ? ACCENT_COLOR : null
    );
    dragDiv.draggable = !used.has(block.id); // disable drag for used blocks
    dragDiv.ondragstart = ev => dragHandlers.dragstart(ev, idx);
    dragDiv.ondragend = ev => dragHandlers.dragend(ev, idx);
    blockWrap.appendChild(dragDiv);
    wrap.appendChild(blockWrap);
  });
  return wrap;
}

/**
 * Strategic Block Builder - Main Container
 * - Manages UI and game state. Re-mounts on state change.
 */
class StrategicBlockBuilder {
  container: HTMLElement;
  grid: Grid;
  cellColorsMap: Map<number, string>; // blockID => color
  selection: SelectionBlock[];
  selectionUsed: Set<string>;
  score: number;
  blockIdSeed: number;
  draggingIdx: number | null;
  dragPreviewGrid: boolean[][] | null;
  dragPreviewValid: boolean;
  gameOver: boolean;

  // PUBLIC_INTERFACE
  constructor(root: HTMLElement) {
    this.container = root;
    this.grid = makeEmptyGrid();
    this.cellColorsMap = new Map();
    this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
    this.selectionUsed = new Set();
    this.score = 0;
    this.blockIdSeed = 2;
    this.draggingIdx = null;
    this.dragPreviewGrid = null;
    this.dragPreviewValid = false;
    this.gameOver = false;
    this.mount();
  }

  // PUBLIC_INTERFACE
  restartGame() {
    this.grid = makeEmptyGrid();
    this.cellColorsMap.clear();
    this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
    this.selectionUsed.clear();
    this.score = 0;
    this.blockIdSeed = 2;
    this.draggingIdx = null;
    this.dragPreviewGrid = null;
    this.dragPreviewValid = false;
    this.gameOver = false;
    this.mount();
  }

  dragHandlers() {
    return {
      dragstart: (_ev: DragEvent, blockIdx: number) => {
        this.draggingIdx = blockIdx;
        this.mount();
      },
      dragend: (_ev: DragEvent, _blockIdx: number) => {
        this.draggingIdx = null;
        this.dragPreviewGrid = null;
        this.dragPreviewValid = false;
        this.mount();
      }
    };
  }

  hookGridDrop(boardDiv: HTMLDivElement) {
    // Allow drop
    boardDiv.ondragover = (ev) => {
      if (this.gameOver || this.draggingIdx === null) return;
      ev.preventDefault();
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      const gs = rect.width / GRID_SIZE;
      // Compute cell from mouse position
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;
      // Guess top-left placement (align to block's corner)
      const block = this.selection[this.draggingIdx];
      const shape = block.shape;
      const sh = shape.length;
      const sw = shape[0].length;
      const cellX = Math.floor(mouseX / gs) - Math.floor(sw / 2);
      const cellY = Math.floor(mouseY / gs) - Math.floor(sh / 2);

      // Preview overlay: highlight pending cells
      let preview: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
      );
      let valid = canPlaceBlock(this.grid, shape, { x: cellX, y: cellY });
      // Mark placed shape in preview
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (
            shape[y][x] &&
            cellY + y >= 0 &&
            cellY + y < GRID_SIZE &&
            cellX + x >= 0 &&
            cellX + x < GRID_SIZE
          ) {
            preview[cellY + y][cellX + x] = true;
          }
        }
      }
      this.dragPreviewGrid = preview;
      this.dragPreviewValid = valid;
      // Re-mount to update overlay
      this.mount();
    };
    boardDiv.ondragleave = () => {
      // clear overlay
      if (this.draggingIdx !== null) {
        this.dragPreviewGrid = null;
        this.mount();
      }
    };
    boardDiv.ondrop = (ev) => {
      if (this.gameOver || this.draggingIdx === null) return;
      ev.preventDefault();
      const rect = (ev.target as HTMLElement).getBoundingClientRect();
      const gs = rect.width / GRID_SIZE;
      const block = this.selection[this.draggingIdx];
      const shape = block.shape;
      const sh = shape.length;
      const sw = shape[0].length;

      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;
      const cellX = Math.floor(mouseX / gs) - Math.floor(sw / 2);
      const cellY = Math.floor(mouseY / gs) - Math.floor(sh / 2);
      if (canPlaceBlock(this.grid, shape, { x: cellX, y: cellY })) {
        // Place shape
        placeBlock(this.grid, shape, { x: cellX, y: cellY }, this.blockIdSeed);
        this.cellColorsMap.set(this.blockIdSeed, block.color);
        this.blockIdSeed++;
        this.selectionUsed.add(block.id);
        // Score for placement (1 point per tile placed)
        let tilesPlaced = 0;
        for (let y = 0; y < sh; y++)
          for (let x = 0; x < sw; x++)
            if (shape[y][x] === 1) tilesPlaced++;
        this.score += tilesPlaced;

        // Line clearing
        const { rows, cols } = checkLines(this.grid);
        if (rows.length || cols.length) {
          clearLines(this.grid, rows, cols);
          // Score bonus: 10 per line
          this.score += (rows.length + cols.length) * 10;
        }
        // All three blocks placed: new selection
        if (this.selectionUsed.size >= SELECTION_COUNT) {
          this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
          this.selectionUsed.clear();
        }
        // Game over check:
        if (!anyPlacementPossible(this.grid, this.selection.filter(b => !this.selectionUsed.has(b.id)))) {
          this.gameOver = true;
        }
      }
      // Clear drag+overlay state
      this.draggingIdx = null;
      this.dragPreviewGrid = null;
      this.dragPreviewValid = false;
      this.mount();
    };
  }

  // PUBLIC_INTERFACE
  mount() {
    // Clear root
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);

    // Main frame
    this.container.style.background = "#190731";
    this.container.style.minHeight = "100vh";
    this.container.style.padding = "0";
    this.container.style.margin = "0";
    this.container.style.position = "relative";
    this.container.style.fontFamily = "'Segoe UI', 'Avenir', 'Helvetica', 'Arial', sans-serif";

    // Top bar: Score, Restart
    const topBar = renderTopBar(this.score, () => this.restartGame());
    topBar.style.marginTop = "40px";
    this.container.appendChild(topBar);

    // Central area: grid
    const boardWrap = document.createElement("div");
    boardWrap.style.display = "flex";
    boardWrap.style.flexDirection = "column";
    boardWrap.style.alignItems = "center";
    boardWrap.style.justifyContent = "center";
    boardWrap.style.padding = "36px 0 0 0";
    boardWrap.style.position = "relative";

    // Main Grid
    let validOverlay: boolean[][] | null = null;
    let invalidOverlay: boolean[][] | null = null;
    if (this.draggingIdx !== null && this.dragPreviewGrid) {
      if (this.dragPreviewValid) validOverlay = this.dragPreviewGrid;
      else invalidOverlay = this.dragPreviewGrid;
    }

    const gridDiv = renderGrid(this.grid, this.cellColorsMap, 34, validOverlay, invalidOverlay);
    // Drag-drop handlers
    this.hookGridDrop(gridDiv);

    // Place grid center
    boardWrap.appendChild(gridDiv);

    // Game over overlay
    if (this.gameOver) {
      const overlay = renderGameOverBar(this.score, () => this.restartGame());
      overlay.style.zIndex = "20";
      boardWrap.appendChild(overlay);
    }

    this.container.appendChild(boardWrap);

    // Block selection area
    const selectionDiv = renderBlockSelectionArea(
      this.selection,
      this.selectionUsed,
      this.dragHandlers(),
      this.draggingIdx
    );
    selectionDiv.style.margin = "44px 0 1.8em 0";

    this.container.appendChild(selectionDiv);

    // Footer message
    const footer = document.createElement("div");
    footer.style.margin = "28px 0 1em 0";
    footer.style.color = "#847db4";
    footer.style.fontSize = "1.01rem";
    footer.style.fontWeight = "400";
    footer.innerHTML =
      "Drag a block onto the board. <span style='color:" +
      ACCENT_COLOR +
      "'>Clear lines!</span>";
    this.container.appendChild(footer);
  }
}

// PUBLIC_INTERFACE
/**
 * Mounts Strategic Block Builder to the element specified by selector/id.
 */
export function mountStrategicBlockBuilder(selector: string) {
  const root = document.querySelector(selector) as HTMLElement;
  if (root) new StrategicBlockBuilder(root);
}
