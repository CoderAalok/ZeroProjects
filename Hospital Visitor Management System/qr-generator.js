/**
 * Lightweight Standalone QR Code SVG Generator for Visitor Passes
 */
(function (global) {
  'use strict';

  // Minimal matrix representation generator for QR-like verification codes
  function generateQRCodeSVG(text, size = 150) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    const gridSize = 21; // standard QR version 1 grid
    const cellSize = size / gridSize;
    let rects = [];

    // Helper to add module rect
    const addRect = (x, y) => {
      rects.push(`<rect x="${(x * cellSize).toFixed(2)}" y="${(y * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#0a5c63" />`);
    };

    // Draw finder patterns at top-left, top-right, bottom-left
    const drawFinder = (startX, startY) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            (r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            addRect(startX + c, startY + r);
          }
        }
      }
    };

    drawFinder(0, 0); // Top-left
    drawFinder(gridSize - 7, 0); // Top-right
    drawFinder(0, gridSize - 7); // Bottom-left

    // Deterministic pseudo-random pattern based on text hash for the data area
    let currentHash = Math.abs(hash);
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder areas
        if ((r < 7 && c < 7) || (r < 7 && c >= gridSize - 7) || (r >= gridSize - 7 && c < 7)) {
          continue;
        }
        currentHash = (currentHash * 1664525 + 1013904223) % 4294967296;
        if (currentHash % 3 === 0) {
          addRect(c, r);
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="QR Code: ${text}">
        <rect width="100%" height="100%" fill="#ffffff" rx="4" />
        ${rects.join('')}
      </svg>
    `;
  }

  global.generateQRCodeSVG = generateQRCodeSVG;
})(typeof window !== 'undefined' ? window : global);
