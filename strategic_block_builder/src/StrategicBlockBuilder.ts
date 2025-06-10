//
// Strategic Block Builder (Classic Drag-and-Drop Version)
// Main game logic and UI. Block shape placement is managed through drag-and-drop, not click-to-select.
//

/* global setTimeout */

const BLOCK_COLORS = [
  "#f5246d",  // pink
  "#00c2ff",  // blue
  "#ffe156",  // yellow
  "#62e403",  // green
  "#ff6f32",  // orange
  "#19e68c",  // teal
  "#956ff9",  // purple
  "#f9ed69",  // light yellow
  "#ffa36c",  // peach
  "#d57bee"   // violet
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
type Shape = number[][];
type SelectionBlock = { shape: Shape; color: string; id: string };

/**
 * Returns all block shapes, randomizes order.
 */
function blockShapes(): Shape[] {
  return [
    [[1]], // single
    [[1, 1]], // horizontal 2
    [[1], [1]], // vertical 2
    [[1, 1, 1]], // horizontal 3
    [[1], [1], [1]], // vertical 3
    [[1, 1], [1, 0]], // L
    [[1, 1], [0, 1]], // reverse L
    [[1, 1], [1, 1]], // square
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 0], [1, 0], [1, 1]] // tall L
  ];
}

function randomBlockShape(): SelectionBlock {
  const shapes = blockShapes();
  const shape = JSON.parse(JSON.stringify(shapes[Math.floor(Math.random() * shapes.length)]));
  const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
  const id = Math.random().toString(36).substr(2, 8) + Date.now();
  return { shape, color, id };
}

function makeEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(CELL_EMPTY));
}

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

function renderBlock(
  shape: Shape,
  color: string,
  cellSize = 28,
  outline = false,
  visualOverlay: string | null = null,
  selected = false,
  faded = false
): HTMLDivElement {
  const sh = shape.length;
  const sw = shape[0].length;
  const blockDiv = document.createElement("div");
  blockDiv.style.display = "inline-block";
  blockDiv.style.width = sw * cellSize + "px";
  blockDiv.style.height = sh * cellSize + "px";
  blockDiv.style.position = "relative";
  if (faded) {
    blockDiv.style.opacity = "0.24";
  }

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
        cell.style.border = outline ? `2.3px solid ${ACCENT_COLOR}` : `2px solid #23223a`;
        cell.style.boxShadow = "0 0 6px 0 #18181e";
        if (selected) {
          cell.style.outline = `3px solid ${ACCENT_COLOR}`;
          cell.style.background = "#280930";
        }
      }
      blockDiv.appendChild(cell);
    }
  }
  return blockDiv;
}

function renderGrid(
  grid: Grid,
  cellColorsMap: Map<number, { color: string }>,
  cellSize = 34,
  onCellDrop?: (x: number, y: number, draggingBlockIdx: number | null) => void,
  validOverlay: boolean[][] | null = null,
  invalidOverlay: boolean[][] | null = null,
  onCellDragOver?: (x: number, y: number, draggingBlockIdx: number | null) => void
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

      let bgColor = "#20194c";
      if (grid[y][x] !== CELL_EMPTY) {
        const mapping = cellColorsMap.get(grid[y][x]);
        if (mapping) {
          bgColor = mapping.color;
        }
      }

      box.style.background = bgColor;

      if (validOverlay && validOverlay[y] && validOverlay[y][x]) {
        box.style.outline = `2.7px solid #61edb6`;
      } else if (invalidOverlay && invalidOverlay[y] && invalidOverlay[y][x]) {
        box.style.outline = `2.3px solid ${ACCENT_COLOR}`;
      } else {
        box.style.outline = "none";
      }
      box.setAttribute("data-x", x.toString());
      box.setAttribute("data-y", y.toString());

      if (onCellDrop) {
        box.ondragover = (ev: DragEvent) => {
          ev.preventDefault();
          if (onCellDragOver) onCellDragOver(x, y, globalDraggingBlockIdx);
          box.style.background = "#241c44";
        };
        box.ondragleave = (ev: DragEvent) => {
          ev.preventDefault();
          box.style.background = bgColor;
        };
        box.ondrop = (ev: DragEvent) => {
          ev.preventDefault();
          box.style.background = bgColor;
          if (onCellDrop) onCellDrop(x, y, globalDraggingBlockIdx);
        };
      }
      board.appendChild(box);
    }
  }
  return board;
}
  }
  return board;
}

let globalDraggingBlockIdx: number | null = null;
function setDraggingBlockIdx(idx: number | null) {
  globalDraggingBlockIdx = idx;
}

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
  restartBtn.onmouseenter = () => (restartBtn.style.background = ACCENT_COLOR);
  restartBtn.onmouseleave = () => (restartBtn.style.background = PRIMARY_COLOR);

  restartBtn.onclick = onRestartClick;

  bar.appendChild(scoreSpan);
  bar.appendChild(restartBtn);
  return bar;
}

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

function renderBlockSelectionArea(
  selection: SelectionBlock[],
  used: Set<string>,
  onDragStartHandlers: (() => void)[]
): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.justifyContent = "center";
  wrap.style.gap = "36px";
  wrap.style.margin = "28px 0 1.5em 0";
  selection.forEach((block, idx) => {
    const blockWrap = document.createElement("div");
    blockWrap.className = "sbb-selection-block";
    const isUsed = used.has(block.id);
    blockWrap.style.opacity = isUsed ? "0.24" : "1";
    blockWrap.style.pointerEvents = isUsed ? "none" : "auto";
    blockWrap.style.transition = "opacity 0.2s";
    blockWrap.style.userSelect = "none";
    blockWrap.style.padding = "3px";
    blockWrap.style.borderRadius = "11px";
    blockWrap.style.cursor = isUsed ? "default" : "grab";

    if (!isUsed) {
      blockWrap.setAttribute("draggable", "true");
      blockWrap.ondragstart = () => onDragStartHandlers[idx]();
      blockWrap.ondragend = () => {
        setDraggingBlockIdx(null);
      };
    }
    const blockDiv = renderBlock(
      block.shape,
      block.color,
      34,
      true,
      null,
      false,
      isUsed
    );
    blockWrap.appendChild(blockDiv);
    wrap.appendChild(blockWrap);
  });
  return wrap;
}

class StrategicBlockBuilder {
  container: HTMLElement;
  grid: Grid;
  cellColorsMap: Map<number, { color: string }>;
  selection: SelectionBlock[];
  selectionUsed: Set<string>;
  score: number;
  blockIdSeed: number;
  placePreview: { pos: Position; valid: boolean; previewGrid: boolean[][], blockIdx: number } | null;
  gameOver: boolean;

  constructor(root: HTMLElement) {
    this.container = root;
    this.grid = makeEmptyGrid();
    this.cellColorsMap = new Map();
    this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
    this.selectionUsed = new Set();
    this.score = 0;
    this.blockIdSeed = 2;
    this.placePreview = null;
    this.gameOver = false;
    this.mount();
  }

  restartGame() {
    this.grid = makeEmptyGrid();
    this.cellColorsMap.clear();
    this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
    this.selectionUsed.clear();
    this.score = 0;
    this.blockIdSeed = 2;
    this.placePreview = null;
    this.gameOver = false;
    this.mount();
  }

  mount() {
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);

    this.container.style.background = "#190731";
    this.container.style.minHeight = "100vh";
    this.container.style.padding = "0";
    this.container.style.margin = "0";
    this.container.style.position = "relative";
    this.container.style.fontFamily = "'Segoe UI', 'Avenir', 'Helvetica', 'Arial', sans-serif";

    const topBar = renderTopBar(this.score, () => this.restartGame());
    topBar.style.marginTop = "40px";
    this.container.appendChild(topBar);

    const boardWrap = document.createElement("div");
    boardWrap.style.display = "flex";
    boardWrap.style.flexDirection = "column";
    boardWrap.style.alignItems = "center";
    boardWrap.style.justifyContent = "center";
    boardWrap.style.padding = "36px 0 0 0";
    boardWrap.style.position = "relative";

    let validOverlay: boolean[][] | null = null;
    let invalidOverlay: boolean[][] | null = null;

    if (this.placePreview && this.placePreview.previewGrid != null) {
      if (this.placePreview.valid) validOverlay = this.placePreview.previewGrid;
      else invalidOverlay = this.placePreview.previewGrid;
    }

    // The main grid with drop logic
    const gridDiv = renderGrid(
      this.grid,
      this.cellColorsMap,
      34,
      (x, y, draggingBlockIdx) => {
        if (this.gameOver) return;
        if (draggingBlockIdx === null) return;
        const block = this.selection[draggingBlockIdx];
        if (!block || this.selectionUsed.has(block.id)) return;
        if (canPlaceBlock(this.grid, block.shape, { x, y })) {
          const sh = block.shape.length, sw = block.shape[0].length;
          for (let by = 0; by < sh; by++) {
            for (let bx = 0; bx < sw; bx++) {
              if (block.shape[by][bx] === 1) {
                const gridY = y + by;
                const gridX = x + bx;
                this.grid[gridY][gridX] = this.blockIdSeed;
              }
            }
          }
          this.cellColorsMap.set(this.blockIdSeed, { color: block.color });
          this.blockIdSeed++;
          this.selectionUsed.add(block.id);
          // score for placement
          let tilesPlaced = 0;
          for (let by = 0; by < sh; by++)
            for (let bx = 0; bx < sw; bx++)
              if (block.shape[by][bx] === 1) tilesPlaced++;
          this.score += tilesPlaced;

          // clear lines
          const fullRows: number[] = [];
          const fullCols: number[] = [];
          for (let y2 = 0; y2 < GRID_SIZE; y2++) {
            if (this.grid[y2].every(cell => cell !== CELL_EMPTY)) fullRows.push(y2);
          }
          for (let x2 = 0; x2 < GRID_SIZE; x2++) {
            let full = true;
            for (let y2 = 0; y2 < GRID_SIZE; y2++) {
              if (this.grid[y2][x2] === CELL_EMPTY) { full = false; break; }
            }
            if (full) fullCols.push(x2);
          }
          for (const y2 of fullRows) for (let x2 = 0; x2 < GRID_SIZE; x2++) this.grid[y2][x2] = CELL_EMPTY;
          for (const x2 of fullCols) for (let y2 = 0; y2 < GRID_SIZE; y2++) this.grid[y2][x2] = CELL_EMPTY;
          this.score += (fullRows.length + fullCols.length) * 10;

          if (this.selectionUsed.size >= SELECTION_COUNT) {
            this.selection = Array.from({ length: SELECTION_COUNT }, randomBlockShape);
            this.selectionUsed.clear();
          }

          // game over
          let hasPlacement = false;
          for (const b of this.selection.filter((b2) => !this.selectionUsed.has(b2.id))) {
            const [sh2, sw2] = [b.shape.length, b.shape[0].length];
            for (let yTry = 0; yTry <= GRID_SIZE - sh2; yTry++) {
              for (let xTry = 0; xTry <= GRID_SIZE - sw2; xTry++) {
                if (canPlaceBlock(this.grid, b.shape, { x: xTry, y: yTry })) {
                  hasPlacement = true;
                  break;
                }
              }
              if (hasPlacement) break;
            }
            if (hasPlacement) break;
          }
          if (!hasPlacement) this.gameOver = true;
          this.placePreview = null;
        } else {
          // feedback for invalid drop
          const sh = block.shape.length, sw = block.shape[0].length;
          let gridOverlay: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
            Array(GRID_SIZE).fill(false)
          );
          for (let by = 0; by < sh; by++) {
            for (let bx = 0; bx < sw; bx++) {
              if (
                block.shape[by][bx] &&
                y + by >= 0 && y + by < GRID_SIZE &&
                x + bx >= 0 && x + bx < GRID_SIZE
              ) {
                gridOverlay[y + by][x + bx] = true;
              }
            }
          }
          this.placePreview = { pos: { x, y }, valid: false, previewGrid: gridOverlay, blockIdx: draggingBlockIdx };
          setTimeout(() => { this.placePreview = null; this.mount(); }, 350);
        }
        this.mount();
      },
      validOverlay,
      invalidOverlay,
      (x, y, draggingBlockIdx) => {
        if (this.gameOver) return;
        if (draggingBlockIdx === null) return;
        const block = this.selection[draggingBlockIdx];
        if (!block || this.selectionUsed.has(block.id)) return;
        const sh = block.shape.length, sw = block.shape[0].length;
        let gridOverlay: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
          Array(GRID_SIZE).fill(false)
        );
        let valid = canPlaceBlock(this.grid, block.shape, { x, y });
        for (let by = 0; by < sh; by++) {
          for (let bx = 0; bx < sw; bx++) {
            if (
              block.shape[by][bx] &&
              y + by >= 0 && y + by < GRID_SIZE &&
              x + bx >= 0 && x + bx < GRID_SIZE
            ) {
              gridOverlay[y + by][x + bx] = true;
            }
          }
        }
        this.placePreview = { pos: { x, y }, valid, previewGrid: gridOverlay, blockIdx: draggingBlockIdx };
        this.mount();
      }
    );

    boardWrap.appendChild(gridDiv);

    if (this.gameOver) {
      const overlay = renderGameOverBar(this.score, () => this.restartGame());
      overlay.style.zIndex = "20";
      boardWrap.appendChild(overlay);
    }

    this.container.appendChild(boardWrap);

    const onDragStartHandlers: (() => void)[] = [];
    for (let idx = 0; idx < SELECTION_COUNT; idx++) {
      onDragStartHandlers.push(() => {
        if (this.selectionUsed.has(this.selection[idx].id)) return;
        setDraggingBlockIdx(idx);
      });
    }

    const selectionDiv = renderBlockSelectionArea(
      this.selection,
      this.selectionUsed,
      onDragStartHandlers
    );
    this.container.appendChild(selectionDiv);

    const footer = document.createElement("div");
    footer.style.margin = "28px 0 1em 0";
    footer.style.color = "#847db4";
    footer.style.fontSize = "1.01rem";
    footer.style.fontWeight = "400";
    footer.innerHTML =
      "Drag a block to the grid. <span style='" +
      "color:" + ACCENT_COLOR + "'>Clear lines!</span>";
    this.container.appendChild(footer);
  }
}

// PUBLIC_INTERFACE
export function mountStrategicBlockBuilder(selector: string) {
  const root = document.querySelector(selector) as HTMLElement;
  if (root) new StrategicBlockBuilder(root);
}
