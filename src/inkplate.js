export const to7bitRaw = (img) => {
  const output = Buffer.alloc(
    img.height * Math.floor(img.width / 2) + (img.width & 1) * img.height
  );
  let offset = 0;
  for (let y = 0; y < img.height; y++) {
    let accumulator = 0;
    for (let x = 0; x < img.width; x++) {
      const idx = y * img.width + x;
      const pixel = img.data[idx];
      if (x % 2) {
        accumulator = pixel & 0xf0;
      } else {
        accumulator |= (pixel >> 4) & 0x0f;
        output.writeUInt8(accumulator, offset++);
        accumulator = 0;
      }
    }
    if (img.width & (1 === 1)) {
      output.writeUInt8(accumulator, offset++);
    }
  }

  return output;
};
