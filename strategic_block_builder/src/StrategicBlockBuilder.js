import React, { useState, useCallback, useEffect } from "react";

// Main container React component for the Strategic Block Builder game.
// Implements game logic: grid, drag-and-drop, score, line clearing, game over state, and restart.
// Uses a dark theme and the provided color palette.

const GRID_SIZE = 9;
const BLOCK_COLORS = [
  "#4100a3", // primary
  "#f5246d", // accent
  "#32cafe",
  "#e1ea13",
  "#56fa52",
  "#fa5757",
  "#f7b82d",
];
const DARK_BG = "#181622";
const GRID_BG = "#272640";
const CELL_EMPTY_COLOR = "#22213a";
const SELECTION_BG = "#252338";
const BORDER_COLOR = "#544293";
const DROP_VALID_COLOR = "#4ff58c";
const DROP_INVALID_COLOR = "#f5246d";

// Each piece is a set of {row, col} relative coords
const ALL_BLOCK_SHAPES = [
  // Basic blocks
  [{ row: 0, col: 0 }],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 3, col: 0 },
    { row: 4, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  [
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
  ],
  [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
  ],
];

function getRandomBlocks() {
  // Get 3 random block shapes with IDs & colors
  const chosen = [];
  const pool = ALL_BLOCK_SHAPES.slice();
  while (chosen.length < 3 && pool.length > 0) {
    const ix = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(ix, 1)[0]);
  }
  return chosen.map((sh, i) => ({
    id: Math.random().toString(36).slice(2) + "-" + Date.now() + "-" + i,
    shape: sh,
    color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
  }));
}

function canPlaceBlock(grid, block, startRow, startCol) {
  for (let i = 0; i < block.length; ++i) {
    const { row, col } = block[i];
    const r = startRow + row;
    const c = startCol + col;
    if (
      r < 0 ||
      r >= GRID_SIZE ||
      c < 0 ||
      c >= GRID_SIZE ||
      grid[r][c] !== null
    ) {
      return false;
    }
  }
  return true;
}

function placeBlock(grid, block, startRow, startCol, marker) {
  const newGrid = grid.map((row) => row.slice());
  for (let i = 0; i < block.length; ++i) {
    const { row, col } = block[i];
    newGrid[startRow + row][startCol + col] = marker;
  }
  return newGrid;
}

function clearCompletedLines(grid) {
  const fullRows = [];
  const fullCols = [];
  for (let r = 0; r < GRID_SIZE; ++r) {
    if (grid[r].every((cell) => cell !== null)) fullRows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; ++c) {
    let colFull = true;
    for (let r = 0; r < GRID_SIZE; ++r)
      if (grid[r][c] === null) {
        colFull = false;
        break;
      }
    if (colFull) fullCols.push(c);
  }
  const newGrid = grid.map((row, ri) =>
    row.map((cell, ci) =>
      fullRows.includes(ri) || fullCols.includes(ci) ? null : cell
    )
  );
  return {
    newGrid,
    linesCleared: fullRows.length + fullCols.length,
    clearedRows: fullRows,
    clearedCols: fullCols,
  };
}

function anyMovePossible(grid, availableBlocks) {
  for (let b = 0; b < availableBlocks.length; ++b) {
    const block = availableBlocks[b];
    for (let r = 0; r < GRID_SIZE; ++r) {
      for (let c = 0; c < GRID_SIZE; ++c) {
        if (canPlaceBlock(grid, block.shape, r, c)) return true;
      }
    }
  }
  return false;
}

function GameGrid(props) {
  const {
    grid,
    draggingBlock,
    dropTarget,
    canDrop,
    handleDragEnter,
    handleDrop,
    clearedRows,
    clearedCols,
  } = props;

  let previewCells = new Set();
  if (draggingBlock && dropTarget && canDrop) {
    for (let i = 0; i < draggingBlock.shape.length; ++i) {
      const { row, col } = draggingBlock.shape[i];
      const r = dropTarget.row + row;
      const c = dropTarget.col + col;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        previewCells.add(`${r},${c}`);
      }
    }
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: `repeat(${GRID_SIZE}, 32px)`,
        gridTemplateColumns: `repeat(${GRID_SIZE}, 32px)`,
        background: GRID_BG,
        padding: 8,
        borderRadius: 18,
        boxShadow: "0 4px 30px #0008",
        border: `2.5px solid ${BORDER_COLOR}`,
        gap: 2,
        userSelect: "none",
        marginBottom: 24,
        position: "relative",
      }}
    >
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const cellKey = `${r},${c}`;
          let baseColor =
            cell === null
              ? CELL_EMPTY_COLOR
              : BLOCK_COLORS[cell % BLOCK_COLORS.length];
          let style = {
            background: baseColor,
            borderRadius: 6,
            border: "1px solid #221a44",
            transition: "background .12s, box-shadow .12s",
            boxShadow: previewCells.has(cellKey)
              ? `0 0 0 2px ${canDrop ? DROP_VALID_COLOR : DROP_INVALID_COLOR}`
              : undefined,
            opacity:
              clearedRows.includes(r) || clearedCols.includes(c)
                ? 0.35
                : 1,
          };
          if (previewCells.has(cellKey)) {
            style.background = canDrop
              ? DROP_VALID_COLOR
              : DROP_INVALID_COLOR;
            style.opacity = 0.8;
          }
          return (
            <div
              key={cellKey}
              onDragEnter={
                draggingBlock
                  ? (e) => {
                      e.preventDefault();
                      handleDragEnter(r, c);
                    }
                  : undefined
              }
              onDragOver={
                draggingBlock
                  ? (e) => {
                      e.preventDefault();
                      handleDragEnter(r, c);
                    }
                  : undefined
              }
              onDrop={
                draggingBlock
                  ? (e) => {
                      e.preventDefault();
                      handleDrop(r, c);
                    }
                  : undefined
              }
              style={style}
              tabIndex={-1}
            />
          );
        })
      )}
    </div>
  );
}

function BlockDraggable(props) {
  const { block, disabled, onDragStart, onDragEnd } = props;
  const minR = Math.min(...block.shape.map((b) => b.row));
  const minC = Math.min(...block.shape.map((b) => b.col));
  const maxR = Math.max(...block.shape.map((b) => b.row));
  const maxC = Math.max(...block.shape.map((b) => b.col));
  const dimRows = maxR - minR + 1;
  const dimCols = maxC - minC + 1;
  return (
    <div
      draggable={!disabled}
      onDragStart={
        disabled
          ? undefined
          : (e) => {
              e.dataTransfer.effectAllowed = "move";
              onDragStart(block);
            }
      }
      onDragEnd={onDragEnd}
      tabIndex={-1}
      style={{
        display: "inline-block",
        minWidth: dimCols * 20 + 8 + "px",
        minHeight: dimRows * 20 + 8 + "px",
        padding: 8,
        borderRadius: 8,
        background: disabled ? "#444551" : block.color,
        opacity: disabled ? 0.25 : 0.94,
        margin: "0 12px",
        cursor: disabled ? "not-allowed" : "grab",
        boxShadow: !disabled
          ? `0 2px 12px 0 ${block.color}44`
          : "none",
        outline: "none",
        border: `2.5px solid ${
          disabled ? "#383859" : BORDER_COLOR
        }`,
        transition: "opacity 0.13s, border 0.13s",
      }}
      aria-label="Draggable block"
    >
      <div
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${dimRows}, 20px)`,
          gridTemplateColumns: `repeat(${dimCols}, 20px)`,
          gap: 1.5,
        }}
      >
        {Array.from({ length: dimRows * dimCols }).map((_, i) => {
          const r = Math.floor(i / dimCols) + minR;
          const c = (i % dimCols) + minC;
          const isFilled = block.shape.some(
            (pt) => pt.row === r && pt.col === c
          );
          return (
            <div
              key={i}
              style={{
                background: isFilled
                  ? disabled
                    ? "#f7b82d"
                    : "#fff"
                  : "transparent",
                opacity: isFilled ? (disabled ? 0.5 : 1) : 0,
                borderRadius: 4,
                width: 20,
                height: 20,
                boxShadow:
                  isFilled && !disabled
                    ? `0 1px 3px #0e0e1b77`
                    : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SelectionArea(props) {
  const {
    blocks,
    grid,
    draggingBlock,
    setDraggingBlock,
    placedBlockIds,
    gameOver,
  } = props;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "18px 0 12px 0",
        background: SELECTION_BG,
        borderRadius: 14,
        margin: "0 auto 12px auto",
        justifyContent: "center",
        alignItems: "center",
        width: "fit-content",
        minHeight: 60,
        boxShadow: "0 2px 18px #0d001955",
        opacity: gameOver ? 0.4 : 1,
      }}
    >
      {blocks.map((block, i) => {
        let canPlaceSomewhere = false;
        for (let r = 0; r < GRID_SIZE; ++r)
          for (let c = 0; c < GRID_SIZE; ++c)
            if (canPlaceBlock(grid, block.shape, r, c)) canPlaceSomewhere = true;
        const wasPlaced = placedBlockIds.includes(block.id);

        return (
          <BlockDraggable
            key={block.id}
            block={block}
            disabled={wasPlaced || gameOver || !canPlaceSomewhere}
            onDragStart={(blk) => setDraggingBlock(blk)}
            onDragEnd={() => setDraggingBlock(null)}
          />
        );
      })}
    </div>
  );
}

const StrategicBlockBuilder = () => {
  const [grid, setGrid] = useState(
    Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(null)
    )
  );
  const [score, setScore] = useState(0);
  const [blocks, setBlocks] = useState(getRandomBlocks());
  const [placedBlockIds, setPlacedBlockIds] = useState([]);
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [canDrop, setCanDrop] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [clearedRows, setClearedRows] = useState([]);
  const [clearedCols, setClearedCols] = useState([]);
  // const [lineClearAnim, setLineClearAnim] = useState(false);

  const handleDragEnter = useCallback(
    (r, c) => {
      if (!draggingBlock) return;
      setDropTarget({ row: r, col: c });
      const valid = canPlaceBlock(grid, draggingBlock.shape, r, c);
      setCanDrop(valid);
    },
    [draggingBlock, grid]
  );

  const handleDrop = (r, c) => {
    if (!draggingBlock) return;
    if (!canPlaceBlock(grid, draggingBlock.shape, r, c)) {
      setCanDrop(false);
      setDropTarget({ row: r, col: c });
      return;
    }
    const marker =
      blocks.findIndex((b) => b.id === draggingBlock.id) %
      BLOCK_COLORS.length;
    const newGrid = placeBlock(
      grid,
      draggingBlock.shape,
      r,
      c,
      marker
    );
    const { newGrid: afterClearGrid, linesCleared, clearedRows, clearedCols } =
      clearCompletedLines(newGrid);
    const addScore =
      draggingBlock.shape.length + (linesCleared > 0 ? linesCleared * 10 : 0);
    setGrid(afterClearGrid);
    setScore((s) => s + addScore);
    setPlacedBlockIds([...placedBlockIds, draggingBlock.id]);
    setDropTarget(null);
    setCanDrop(null);
    setDraggingBlock(null);
    setClearedRows(clearedRows);
    setClearedCols(clearedCols);

    setTimeout(() => {
      setClearedRows([]);
      setClearedCols([]);
      if (placedBlockIds.length + 1 >= 3) {
        setBlocks(getRandomBlocks());
        setPlacedBlockIds([]);
      }
      setGameOver(
        !anyMovePossible(
          afterClearGrid,
          placedBlockIds.length + 1 >= 3
            ? getRandomBlocks()
            : blocks.filter(
                (b) =>
                  ![...placedBlockIds, draggingBlock.id].includes(b.id)
              )
        )
      );
    }, linesCleared > 0 ? 650 : 180);
  };

  const handleRestart = () => {
    setGrid(
      Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(null)
      )
    );
    setBlocks(getRandomBlocks());
    setPlacedBlockIds([]);
    setScore(0);
    setGameOver(false);
    setDraggingBlock(null);
    setDropTarget(null);
    setCanDrop(null);
    setClearedRows([]);
    setClearedCols([]);
  };

  useEffect(() => {
    if (
      !anyMovePossible(
        grid,
        blocks.filter((b) => !placedBlockIds.includes(b.id))
      )
    ) {
      setGameOver(true);
    }
  }, [grid, blocks, placedBlockIds]);

  return (
    <div
      style={{
        background: DARK_BG,
        minHeight: "100vh",
        color: "#FFF",
        fontFamily: "'Inter', 'Roboto', 'Helvetica', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 88px 0",
      }}
    >
      <header
        style={{
          display: "flex",
          flexDirection: "row",
          padding: "32px 0 8px 0",
          justifyContent: "space-between",
          alignItems: "center",
          width: 390,
          maxWidth: "95vw",
        }}
      >
        <span
          style={{
            fontSize: "1.44rem",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "1px",
            textShadow: "0 2px 9px #4100a355",
          }}
        >
          Strategic Block Builder
        </span>
        <button
          aria-label="Restart Game"
          title="Restart"
          style={{
            background: "none",
            border: "2px solid #993dfc",
            borderRadius: 26,
            color: "#be8cff",
            padding: "6px 18px",
            fontSize: ".98rem",
            fontWeight: 600,
            marginLeft: 8,
            letterSpacing: ".12em",
            cursor: "pointer",
            boxShadow: "0 0 8px #4100a344",
            outline: "none",
            transition: "background 0.12s, color 0.12s, border 0.12s",
          }}
          onClick={handleRestart}
        >
          Restart
        </button>
      </header>

      <div
        style={{
          textAlign: "center",
          marginBottom: 10,
          fontSize: "1.24rem",
        }}
      >
        <span
          style={{
            background:
              "linear-gradient(90deg,#e1ea13,#f5246d 60%,#4100a3 100%)",
            color: "#181622",
            fontWeight: 900,
            borderRadius: 8,
            letterSpacing: ".08em",
            fontSize: "1.66rem",
            padding: "2px 22px",
            boxShadow: "0 2px 8px #4100a3bb",
            lineHeight: "2.1rem",
          }}
        >
          Score: {score}
        </span>
      </div>

      <main
        style={{
          width: "fit-content",
          margin: "0 auto",
          background: "#161525",
          borderRadius: 24,
          padding: 25,
          boxShadow: "0 4px 40px #1e153a",
          minWidth: 375,
          maxWidth: "100vw",
          position: "relative",
        }}
      >
        <GameGrid
          grid={grid}
          draggingBlock={draggingBlock}
          dropTarget={dropTarget}
          canDrop={canDrop}
          handleDragEnter={handleDragEnter}
          handleDrop={handleDrop}
          clearedRows={clearedRows}
          clearedCols={clearedCols}
        />
        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 0,
              right: 0,
              margin: "auto",
              background: "rgba(17,8,20,0.98)",
              zIndex: 10,
              borderRadius: 16,
              padding: "36px 18px 28px 18px",
              textAlign: "center",
              color: "#fff",
              boxShadow: "0 3px 20px #0a002b88",
              border: `2.5px solid #ff185d`,
              fontSize: "1.38rem",
            }}
          >
            <div style={{ fontSize: "2.0rem", fontWeight: 900, color: "#f5246d", marginBottom: 6 }}>
              Game Over
            </div>
            <div style={{ color: "#eee", fontWeight: 700 }}>
              Final Score:{" "}
              <span style={{ color: "#e1ea13", fontWeight: 900 }}>
                {score}
              </span>
            </div>
            <button
              style={{
                margin: "26px auto 0 auto",
                display: "block",
                background: "linear-gradient(90deg,#4100a3,#f5246d 90%)",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontWeight: 700,
                letterSpacing: ".03em",
                padding: "8px 32px",
                fontSize: "1.09rem",
                cursor: "pointer",
              }}
              onClick={handleRestart}
            >
              Restart
            </button>
          </div>
        )}
        <SelectionArea
          blocks={blocks}
          grid={grid}
          draggingBlock={draggingBlock}
          setDraggingBlock={setDraggingBlock}
          placedBlockIds={placedBlockIds}
          gameOver={gameOver}
        />
      </main>
      <footer style={{ marginTop: 35, fontSize: "1.09rem", color: "#aaa" }}>
        <span style={{ color: "#4100a3", fontWeight: 900 }}>TIP:</span>{" "}
        Drag a block onto the big grid to play! Fill lines across or down to clear them. Aim high!
      </footer>
    </div>
  );
};

export default StrategicBlockBuilder;
