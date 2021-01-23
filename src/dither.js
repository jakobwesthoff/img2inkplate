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

const toIndex = (img, x, y) => y * img.width + x;
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

export const applyErrorDiffusion = (img, style) => {
  const { normalization, matrix } = style;
  const [rows, columns] = assertErrorDiffusionMatrix(matrix);

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let idx = toIndex(img, x, y);
      let original = img.data[idx];
      let quantizedPixel = original & 0xe0; // Only look at the highest 3-bits
      let quantizationError = original - quantizedPixel;

      img.data[idx] = quantizedPixel;

      for (let dy = ((rows - 1) / 2) * -1; dy <= (rows - 1) / 2; dy++) {
        for (let dx = ((columns - 1) / 2) * -1; dx <= (columns - 1) / 2; dx++) {
          const matrixValue = matrixByDelta(matrix, dx, dy);
          if (matrixValue !== 0 && isInsideImage(img, x + dx, y + dy)) {
            idx = toIndex(img, x + dx, y + dy);
            img.data[idx] = clampPixel(
              img.data[idx] +
                Math.floor((quantizationError * matrixValue) / normalization)
            );
          }
        }
      }
    }
  }
};
