import React, { useCallback, useEffect, useMemo, useState } from "react";

const GRID_SIZE = 9;
const BLOCKS_PER_PICK = 3;
const COLORS = {
  background: "#18042c",
  cell: "#2e165b",
  filled: "#4100a3",
  accent: "#f5246d",
  white: "#FFFFFF",
  valid: "#10e752",
  invalid: "#f5246d",
  gridBorder: "#3c2c65",
  selectionBg: "#1e0c3e",
};

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(0)
  );
}

const BLOCK_SHAPES = [
  [[1]],
  [[1], [1], [1]],
  [[1, 1, 1]],
  [
    [1, 0],
    [1, 0],
    [1, 1]
  ],
  [
    [1, 1],
    [1, 1]
  ],
  [
    [1, 1, 1],
    [0, 1, 0]
  ],
  [
    [0, 1, 1],
    [1, 1, 0]
  ],
  [[1, 1]],
  [[1],[1]],
];

const BLOCK_PICK_COLORS = [COLORS.filled, COLORS.accent, "#33c7e7", "#dea51b", "#06e362", "#ff5733", "#ffb3b3"];

function getRandomBlocks(n) {
  const picks = [];
  const used = new Set();
  while (picks.length < n) {
    const idx = Math.floor(Math.random() * BLOCK_SHAPES.length);
    if (!used.has(idx)) {
      picks.push(BLOCK_SHAPES[idx]);
      used.add(idx);
    }
  }
  return picks;
}

function canPlaceBlock(grid, block, top, left) {
  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      if (block[r][c]) {
        const gr = top + r, gc = left + c;
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
        if (grid[gr][gc] !== 0) return false;
      }
    }
  }
  return true;
}

function hasAnyPlacement(grid, block) {
  for (let r = 0; r <= GRID_SIZE - block.length; r++) {
    for (let c = 0; c <= GRID_SIZE - block[0].length; c++) {
      if (canPlaceBlock(grid, block, r, c)) return true;
    }
  }
  return false;
}

function placeBlock(grid, block, top, left) {
  const newGrid = grid.map((row) => row.slice());
  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      if (block[r][c]) {
        newGrid[top + r][left + c] = 1;
      }
    }
  }
  return newGrid;
}

function getFilledRowsCols(grid) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((v) => v === 1)) rows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== 1) { full = false; break; }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

function clearLines(grid) {
  let { rows, cols } = getFilledRowsCols(grid);
  let cleared = 0;
  let newGrid = grid.map((row) => row.slice());
  for (const r of rows) {
    newGrid[r] = Array(GRID_SIZE).fill(0); cleared++;
  }
  for (const c of cols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r][c] = 0;
    }
    cleared++;
  }
  return { newGrid, linesCleared: cleared };
}

function StrategicBlockBuilder() {
  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [blockPicks, setBlockPicks] = useState(() => getRandomBlocks(BLOCKS_PER_PICK));
  const [usedPicks, setUsedPicks] = useState([false, false, false]);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState({
    hovering: false,
    valid: false,
    position: null,
    pickIdx: null
  });
  const [gameOver, setGameOver] = useState(false);

  const hasAnyValidMove = useCallback(() => {
    for (let i = 0; i < BLOCKS_PER_PICK; i++) {
      if (usedPicks[i]) continue;
      if (hasAnyPlacement(grid, blockPicks[i])) return true;
    }
    return false;
  }, [blockPicks, grid, usedPicks]);

  useEffect(() => {
    if (usedPicks.every(Boolean)) {
      setBlockPicks(getRandomBlocks(BLOCKS_PER_PICK));
      setUsedPicks([false, false, false]);
    }
  }, [usedPicks]);

  useEffect(() => {
    if (!gameOver && !hasAnyValidMove()) {
      setGameOver(true);
    }
  }, [grid, blockPicks, usedPicks, gameOver, hasAnyValidMove]);

  const onDragStart = (pickIdx) => {
    if (usedPicks[pickIdx] || gameOver) return;
    setDragged({ shape: blockPicks[pickIdx], pickIdx });
  };

  const onDragEnd = () => {
    setDragged(null);
    setDropTarget({
      hovering: false,
      valid: false,
      position: null,
      pickIdx: null
    });
  };

  const onCellDragEnter = (top, left) => {
    if (!dragged || usedPicks[dragged.pickIdx]) return;
    const { shape, pickIdx } = dragged;
    const valid = canPlaceBlock(grid, shape, top, left);
    setDropTarget({
      hovering: true,
      valid,
      position: { top, left },
      pickIdx
    });
  };

  const onCellDrop = (top, left) => {
    if (
      !dragged ||
      usedPicks[dragged.pickIdx] ||
      !canPlaceBlock(grid, dragged.shape, top, left)
    ) {
      onDragEnd();
      return;
    }
    let newGrid = placeBlock(grid, dragged.shape, top, left);

    const { newGrid: afterClear, linesCleared } = clearLines(newGrid);

    setUsedPicks((used) =>
      used.map((used, idx) =>
        idx === dragged.pickIdx ? true : used
      )
    );
    setGrid(afterClear);

    let added = countBlockCells(dragged.shape) * 10;
    if (linesCleared > 0) {
      added += linesCleared * 100;
    }
    setScore((prev) => prev + added);

    setDragged(null);
    setDropTarget({
      hovering: false, valid: false, position: null, pickIdx: null
    });
  };

  function countBlockCells(block) {
    return block.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
  }

  function handleRestart() {
    setGrid(createEmptyGrid());
    setScore(0);
    setBlockPicks(getRandomBlocks(BLOCKS_PER_PICK));
    setUsedPicks([false, false, false]);
    setDragged(null);
    setDropTarget({ hovering: false, valid: false, position: null, pickIdx: null });
    setGameOver(false);
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "r" && gameOver) handleRestart();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameOver]);

  const renderGrid = useMemo(() => {
    const cellSize = 32;
    let preview = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
    if (
      dragged &&
      dropTarget.hovering &&
      dropTarget.position &&
      dropTarget.pickIdx === dragged.pickIdx
    ) {
      const { top, left } = dropTarget.position;
      for (let r = 0; r < dragged.shape.length; r++) {
        for (let c = 0; c < dragged.shape[r].length; c++) {
          if (dragged.shape[r][c]) {
            const row = top + r, col = left + c;
            if (
              row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE
            ) {
              preview[row][col] = true;
            }
          }
        }
      }
    }

    return (
      <div
        className="sbb-board"
        style={{
          background: COLORS.background,
          borderRadius: 14,
          border: `2px solid ${COLORS.gridBorder}`,
          margin: "0 auto",
          width: GRID_SIZE * cellSize + 8,
          height: GRID_SIZE * cellSize + 8,
          display: "inline-block",
          boxShadow: "0 6px 32px 0 rgba(40,0,128,0.25)",
          position: "relative",
        }}
      >
        {Array(GRID_SIZE).fill(0).map((_, i) => (
          <div key={i} style={{ display: "flex" }}>
            {Array(GRID_SIZE).fill(0).map((_, j) => {
              let filled = grid[i][j] === 1;
              let inPreview = preview[i][j];
              let isDropHighlight =
                inPreview &&
                dragged &&
                dropTarget.hovering &&
                (dropTarget.valid
                  ? COLORS.valid
                  : COLORS.invalid);
              return (
                <div
                  key={j}
                  className="sbb-cell"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragged && !usedPicks[dragged.pickIdx])
                      onCellDragEnter(i - findShapeAnchor(dragged.shape).row, j - findShapeAnchor(dragged.shape).col);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragged && !usedPicks[dragged.pickIdx])
                      onCellDrop(i - findShapeAnchor(dragged.shape).row, j - findShapeAnchor(dragged.shape).col);
                  }}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    border:
                      "1px solid " + COLORS.gridBorder,
                    background: filled
                      ? COLORS.filled
                      : inPreview
                        ? isDropHighlight || COLORS.valid
                        : COLORS.cell,
                    transition: "background 0.14s",
                    boxSizing: "border-box",
                    borderRadius: 6,
                    margin: 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }, [grid, dragged, dropTarget, usedPicks]);

  function findShapeAnchor(shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) return { row: r, col: c };
    }
    return { row: 0, col: 0 };
  }
  function renderBlockPick(idx) {
    const shape = blockPicks[idx];
    const color = BLOCK_PICK_COLORS[idx % BLOCK_PICK_COLORS.length];
    const used = usedPicks[idx];
    const isBeingDragged = dragged && dragged.pickIdx === idx;

    return (
      <div
        key={idx}
        className="sbb-pick"
        style={{
          opacity: used ? 0.33 : 1,
          margin: "14px 20px 4px 20px",
          display: "inline-block",
          pointerEvents: used ? "none" : "auto",
          cursor: used || gameOver ? "not-allowed" : "grab",
          border: isBeingDragged ? `2px solid ${COLORS.accent}` : "2px solid transparent",
          borderRadius: 10,
          background: COLORS.selectionBg,
          transition: "opacity 0.2s, border 0.2s",
        }}
        draggable={!used && !gameOver}
        onDragStart={() => onDragStart(idx)}
        onDragEnd={onDragEnd}
        tabIndex={used || gameOver ? -1 : 0}
        aria-label={`Block shape ${idx + 1}`}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !used && !gameOver) onDragStart(idx);
        }}
      >
        <div style={{
          display: "inline-block",
          padding: 8,
          background: "transparent"
        }}>
          {shape.map((row, r) => (
            <div style={{ display: "flex" }} key={r}>
              {row.map((cell, c) => (
                <div key={c}
                  style={{
                    width: 22, height: 22,
                    margin: 2,
                    background: cell ? color : "transparent",
                    borderRadius: 5,
                    border: cell ? "2px solid #19063d" : "none",
                    boxShadow: cell ? `0 2px 6px 0 #1a33a729` : "none"
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="strategic-block-builder-container"
      style={{
        minHeight: "100vh",
        background: COLORS.background,
        color: COLORS.white,
        fontFamily: "Inter, Arial, sans-serif",
        padding: "0",
        margin: "0",
      }}
    >
      <header style={{
        padding: "24px 0 8px 0",
        textAlign: "center",
      }}>
        <div style={{ fontWeight: 600, fontSize: 32, marginBottom: 6, letterSpacing: 1, color: COLORS.primary }}>
          Strategic Block Builder
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 500,
          margin: "0 auto",
          color: COLORS.accent,
          display: "inline-block",
          padding: "5px 24px",
          background: "#291151",
          borderRadius: 12,
          border: "2px solid #2f1170"
        }}>
          Score: {score}
        </div>
        <button
          style={{
            background: COLORS.accent,
            color: COLORS.white,
            border: "none",
            borderRadius: 8,
            marginLeft: 30,
            padding: "9px 30px",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.5px",
            cursor: "pointer",
            boxShadow: "0 2px 8px 0 #8a12578e",
          }}
          onClick={handleRestart}
          aria-label="Restart Game"
        >Restart</button>
      </header>
      <main style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 28,
        paddingBottom: 32,
        minHeight: "600px"
      }}>
        {gameOver &&
          <div style={{
            position: "absolute",
            zIndex: 6,
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(30,0,60,0.82)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              fontSize: 44,
              fontWeight: 700,
              color: COLORS.accent,
              marginBottom: 16,
              textShadow: "0 3px 22px #000"
            }}>
              Game Over
            </div>
            <div style={{ fontSize: 24, color: COLORS.white, marginBottom: 24 }}>Final Score: {score}</div>
            <button
              style={{
                background: COLORS.primary,
                color: COLORS.white,
                border: "none",
                borderRadius: 10,
                padding: "16px 40px",
                fontSize: 20,
                marginTop: 10,
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 2px 10px 0 #1a0a2cdd",
              }}
              onClick={handleRestart}
              aria-label="Restart"
            >Restart</button>
            <div style={{
              marginTop: 10,
              fontSize: 14,
              color: "#dfd9ed",
              opacity: 0.66
            }}>Tip: Press <kbd>R</kbd> to restart</div>
          </div>
        }
        <section style={{ margin: "0 auto", marginTop: 22, marginBottom: 44, position: "relative" }}>
          {renderGrid}
        </section>
        <section style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "12px 20px 0 20px",
          background: COLORS.selectionBg,
          borderRadius: 18,
          border: `2px solid ${COLORS.gridBorder}`,
          minHeight: 80
        }}>
          {blockPicks.map((_, idx) => renderBlockPick(idx))}
        </section>
        <div style={{ height: 30 }} />
      </main>
      <footer style={{
        width: "100%",
        padding: "0 0 14px 0",
        textAlign: "center",
        fontSize: 14,
        color: "#b9b1e5",
        opacity: 0.6,
      }}>
        &copy; {new Date().getFullYear()} Strategic Block Builder &ndash; Block puzzle by KAVIA
      </footer>
    </div>
  );
}

export default StrategicBlockBuilder;
