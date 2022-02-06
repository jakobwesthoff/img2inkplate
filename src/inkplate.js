export const to3bitRaw = (img) => {
  const bufferSize = img.height * Math.floor(img.width / 2) + (img.width & 1) * img.height;
  const output = Buffer.alloc(bufferSize);
  let offset = 0;
  for (let y = 0; y < img.height; y++) {
    let accumulator = 0;
    for (let x = 0; x < img.width; x++) {
      const idx = y * img.width + x;
      const indexedColor = img.indexed[idx];
      if (x % 2) {
        accumulator = indexedColor << 4 & 0xf0;
      } else {
        accumulator |= indexedColor & 0x0f;
        output.writeUInt8(accumulator, offset++);
        accumulator = 0;
      }
    }
    if (img.width & 1) {
      output.writeUInt8(accumulator << 4 & 0xf0, offset++);
    }
  }

  return output;
};
