import fs from "fs";
import path from "path";
import sharp from "sharp";
import fse from "fs-extra";

import {
  FLOYD_STEINBERG,
  JARVIS_JUDICE_NINKE,
  ATKINSON,
  applyErrorDiffusion,
} from "./dither.js";
import { to7bitRaw } from "./inkplate.js";

const ditheringToStyle = {
  "floyd-steinberg": FLOYD_STEINBERG,
  "jarvis-judice-ninke": JARVIS_JUDICE_NINKE,
  atkinson: ATKINSON,
};

const openImage = (path) => {
  let openedImage;
  try {
    openedImage = sharp(path);
  } catch (error) {
    return false;
  }
  return openedImage;
};

export const img2inkplate = async (
  inPath,
  outPath,
  dithering,
  targetWidth = 800,
  targetHeight = 600
) => {
  const files = await fse.readdir(inPath, {withFileTypes: true});

  for (const file of files) {
    const inputFile = `${inPath}/${file.name}`;
    console.log(`Reading ${inputFile}...`);
    const openedImage = openImage(inputFile);
    if (openedImage === false) {
      console.log(`Could not open ${inputFile} as image. Skipping...`);
      continue;
    }
    const data = await openedImage
      // .gamma(2.2)
      .greyscale()
      .rotate()
      .resize(targetWidth, targetHeight)
      .raw()
      .toBuffer();

    const img = {
      data: [],
      height: targetHeight,
      width: targetWidth,
    };

    for (let idx = 0; idx < data.length; idx++) {
      img.data[idx] = data[idx];
    }

    if (dithering !== undefined) {
      console.log("Dithering...");
      applyErrorDiffusion(img, ditheringToStyle[dithering]);
    }

    console.log("Converting to 3-bit inkplate grayscale...");
    const output = to7bitRaw(img);

    const outputFile = `${outPath}/${path.parse(inputFile).name}.ink`;
    console.log(`Writing ${outputFile}...`);
    fs.writeFileSync(`${outputFile}`, output);
  }
  console.log("Everything done! Have fun!");
};
