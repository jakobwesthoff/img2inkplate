export const FLOYD_STEINBERG = {
  normalization: 16,
  matrix: [
    [0, 0, 0],
    [0, 0, 7],
    [3, 5, 1],
  ],
};

export const JARVIS_JUDICE_NINKE = {
  normalization: 48,
  matrix: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 7, 5],
    [3, 5, 7, 5, 3],
    [1, 3, 5, 3, 1],
  ],
};

export const ATKINSON = {
  normalization: 8,
  matrix: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
};

export const PALETTE_8_GRAYSCALE = [
  0x000000,
  0x202020,
  0x404040,
  0x606060,
  0x808080,
  0xa0a0a0,
  0xc0c0c0,
  0xe0e0e0,
];

export const PALETTE_7_ACEP = [
  0x000000, // black
  0xFFFFFF, // white
  0x00FF00, // green
  0x0000FF, // blue
  0xFF0000, // red
  0xFFFF00, // yellow
  0xFF8000, // orange
];

const toIndex = (img, x, y, channels = 3) => (y * img.width * channels) + (x * channels);
const matrixByDelta = (matrix, dx, dy) =>
  matrix[dy + (matrix[0].length - 1) / 2][dx + (matrix.length - 1) / 2];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const clampPixel = (value) => clamp(value, 0, 255);
const isInsideImage = (img, x, y) => !(x < 0 || y < 0 || x > img.width - 1 || y > img.height - 1);

const assertErrorDiffusionMatrix = (matrix) => {
  if (matrix.length % 2 === 0) {
    throw new Error(
      `The given error diffusion matrix MUST have an odd number of rows`
    );
  }

  let columnCount = undefined;
  matrix.forEach((row) => {
    if (row.length % 2 === 0) {
      throw new Error(
        `The given error diffusion matrix MUST have an odd number of columns`
      );
    }

    if (columnCount !== undefined && columnCount !== row.length) {
      throw new Error(
        `The given error diffusion matrix must have the same number of columns in each row`
      );
    }
    columnCount = row.length;
  });

  return [matrix.length, columnCount];
};

const colorDistance = (color1, color2) => {
  const r1 = color1 >> 16;
  const r2 = color2 >> 16;
  const g1 = color1 >> 8 & 0xff;
  const g2 = color2 >> 8 & 0xff;
  const b1 = color1 & 0xff;
  const b2 = color2 & 0xff;

  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  return Math.sqrt(dr * dr + dg * dg + db * db);
};

let colorMappingCache = new Map();

const resetColorMappingCache = () => {
  colorMappingCache = new Map();
};

const mapColorToPalette = (color, palette) => {
  if (!colorMappingCache.has(color)) {
    let currentDistance = Infinity;
    let currentIndex;
    for (let i = 0; i < palette.length; i++) {
      const distance = colorDistance(color, palette[i]);
      if (distance < currentDistance) {
        currentDistance = distance;
        currentIndex = i;
      }
    }
    colorMappingCache.set(color, currentIndex);
  }
  return colorMappingCache.get(color);
};

const bytesToColor = (r8, g8, b8) => {
  const color = r8 << 16 | g8 << 8 | b8;
  if ((color & 0xffffff) != color) {
    throw new Error(`Color with more than 24 bits: 0x${color.toString(16)}`);
  }
  return color;

};
const colorToBytes = (color) => {
  if ((color & 0xffffff) != color) {
    throw new Error(`Color with more than 24 bits: 0x${color.toString(16)}`);
  }
  return [
    color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff
  ];
};

export const applyErrorDiffusion = (img, style, palette) => {
  resetColorMappingCache();

  const { normalization, matrix } = style;
  const [rows, columns] = assertErrorDiffusionMatrix(matrix);

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let idx = toIndex(img, x, y);

      // Original pixel
      let r = img.data[idx];
      let g = img.data[idx + 1];
      let b = img.data[idx + 2];

      // Quantized pixel
      let nearestPaletteIndex = mapColorToPalette(bytesToColor(r, g, b), palette);
      const [qr, qg, qb] = colorToBytes(palette[nearestPaletteIndex]);

      img.data[idx] = qr;
      img.data[idx + 1] = qg;
      img.data[idx + 2] = qb;
      img.indexed[toIndex(img, x, y, 1)] = nearestPaletteIndex;

      // Quantization error
      let er = r - qr;
      let eg = g - qg;
      let eb = b - qb;

      // Propagate and diffuse error
      for (let dy = ((rows - 1) / 2) * -1; dy <= (rows - 1) / 2; dy++) {
        for (let dx = ((columns - 1) / 2) * -1; dx <= (columns - 1) / 2; dx++) {
          const matrixValue = matrixByDelta(matrix, dx, dy);
          if (matrixValue !== 0 && isInsideImage(img, x + dx, y + dy)) {
            idx = toIndex(img, x + dx, y + dy);

            // Original not yet diffused pixel
            let r = img.data[idx];
            let g = img.data[idx + 1];
            let b = img.data[idx + 2];

            // Pixel with propagated error
            let dr = clampPixel(r + Math.floor((er * matrixValue) / normalization));
            let dg = clampPixel(g + Math.floor((eg * matrixValue) / normalization));
            let db = clampPixel(b + Math.floor((eb * matrixValue) / normalization));

            img.data[idx] = dr;
            img.data[idx + 1] = dg;
            img.data[idx + 2] = db;
          }
        }
      }
    }
  }
};
