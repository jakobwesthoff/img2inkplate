import fs from "fs";
import path from "path";
import sharp from "sharp";
import fse from "fs-extra";

import {
  FLOYD_STEINBERG,
  JARVIS_JUDICE_NINKE,
  ATKINSON,
  applyErrorDiffusion,
  PALETTE_7_ACEP,
  PALETTE_8_GRAYSCALE,
} from "./dither.js";
import { to3bitRaw } from "./inkplate.js";

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
  targetHeight = 600,
  acep = false,
  png = false,
) => {
  const files = await fse.readdir(inPath, { withFileTypes: true });

  for (const file of files) {
    const inputFile = `${inPath}/${file.name}`;
    console.log(`Reading ${inputFile}...`);
    const openedImage = openImage(inputFile);
    if (openedImage === false) {
      console.log(`Could not open ${inputFile} as image. Skipping...`);
      continue;
    }
    let data;
    if (!acep) {
      data = await openedImage
        .greyscale(true)
        .rotate()
        .resize(targetWidth, targetHeight)
        .raw()
        .toBuffer();
    } else {
      data = await openedImage
        // .gamma(2.2)
        .toColorspace('srgb')
        .rotate()
        .resize(targetWidth, targetHeight)
        .raw()
        .toBuffer();
    }

    const img = {
      data: [],
      indexed: [],
      height: targetHeight,
      width: targetWidth,
    };

    if (!acep) {
      // Grayscale colorspace has only 1 color component per pixel
      // Our palette aware dithering however expects rgb color data.
      for (let idx = 0; idx < data.length; idx++) {
        img.data[idx * 3 + 0] = data[idx];
        img.data[idx * 3 + 1] = data[idx];
        img.data[idx * 3 + 2] = data[idx];
      }
    } else {
      for (let idx = 0; idx < data.length; idx++) {
        img.data[idx] = data[idx];
      }
    }

    if (dithering !== undefined) {
      console.log("Dithering...");
      applyErrorDiffusion(img, ditheringToStyle[dithering], acep ? PALETTE_7_ACEP : PALETTE_8_GRAYSCALE);
    }

    console.log("Converting to 3-bit raw format...");
    const inkplateFormat = to3bitRaw(img);
    const outputBase = `${outPath}/${path.parse(inputFile).name}`;
    const outputInkplate = acep
      ? `${outputBase}.acep.ink`
      : `${outputBase}.gray.ink`;

    console.log(`Writing ${outputInkplate}...`);
    fs.writeFileSync(outputInkplate, inkplateFormat);

    if (png) {
      const pngImage = sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 3 } });
      const outputPng = acep
        ? `${outputBase}.acep.png`
        : `${outputBase}.gray.png`;
      console.log(`Writing ${outputPng}...`);
      await pngImage.toFile(outputPng);
    }
  }
  console.log("Everything done! Have fun!");
};
