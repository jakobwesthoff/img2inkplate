#!/usr/bin/env node
import meow from "meow";
import { img2inkplate } from "./img2inkplate.js";

const cli = meow(
  `
	Usage
	  $ img2inkplate [options] <input-dir> <output-dir>

	Options
    --dither=<DITHERING>  Select a dithering style to be used
                          Choose between the following:
                          * floyd-steinberg
                          * jarvis-judice-ninke
                          * atkinson

    --resolution=<width>x<height> Target resolution to scale the output to.
                                  (Default: 800x600)
`,
  {
    flags: {
      dither: {
        type: "string",
      },
      resolution: {
        type: "string",
      },
    },
  }
);

if (cli.input.length != 2) {
  console.error(`No input and output dir provided.`);
  cli.showHelp();
  process.exit(1);
}

const ditherOptions = ["floyd-steinberg", "jarvis-judice-ninke", "atkinson"];
if (cli.flags.dither !== undefined) {
  if (!ditherOptions.includes(cli.flags.dither)) {
    console.error(`Unknown dithering option ${cli.flags.dither}`);
    cli.showHelp();
    process.exit(1);
  }
}

let width, height;
if (cli.flags.resolution !== undefined) {
  [width, height] = cli.flags.resolution.split("x");
  if (width === undefined || height === undefined || width !== parseInt(width).toString() || height !== parseInt(height).toString()) {
    console.error(`Invalid resolution ${cli.flags.resolution}`);
    cli.showHelp();
    process.exit(1);
  }
}

await img2inkplate(cli.input[0], cli.input[1], cli.flags.dither, parseInt(width), parseInt(height));
