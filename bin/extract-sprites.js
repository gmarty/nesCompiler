#!/usr/bin/env node

// Extract the sprites from a NES rom and generate a PNG image.

'use strict';

var fs = require('fs');
var path = require('path');

var optimist = require('optimist');
var Compiler = require(__dirname + '/../dist/compiler/compiler');
var Canvas = require('canvas');

var cli = optimist
  .usage('Extract the sprites from a NES rom and generate a PNG image.' + '\n' +
  'Usage: $0 path/to/rom/file');
var romFilePath = cli.argv._[0];

// No param? Show help message then.
if (!romFilePath) {
  cli.showHelp();
  process.exit(0);
}

// Load the NES file.
var romFileName = path.basename(romFilePath, '.nes');
var romFileContent = fs.readFileSync(romFilePath);

var compiler = new Compiler(romFileContent);

if (!compiler.mapper.vrom.length) {
  console.log('Selected ROM has no CHR-ROM banks.');
  process.exit(0);
}

// @todo Make this a command line option.
var spriteSize = 0; // Sprite size. 0=8x8, 1=8x16
var spritesPerCol = 16;
var spritesPerRow = 256 / spritesPerCol;
var size = 32;
var spacing = 1;
var width = (size * spritesPerCol) + (spacing * (spritesPerCol - 1));
var height = (size * spritesPerRow) + (spacing * (spritesPerRow - 1));
var canvas = new Canvas(width, height);
var context = canvas.getContext('2d');

context.fillStyle = 'green';
context.fillRect(0, 0, width, height);

for (var vrom = 0, vromLen = compiler.mapper.vrom.length; vrom < vromLen; vrom++) {
  for (var i = 0, len = compiler.mapper.vrom[vrom].length / 16; i < len; i++) {
    var sprite_data = compiler.mapper.vrom[vrom].slice(i * 16, (i + 1) * 16);
    var sprite = renderSprite(sprite_data, size);
    var x = 0;
    var y = 0;

    if (spriteSize === 0) {
      x = (i % spritesPerCol) * (size + spacing);
      y = Math.floor(i / spritesPerCol) * (size + spacing);
    } else {
      x = (Math.floor(i / 2) % spritesPerCol) * (size + spacing);
      y = (Math.floor(i / (spritesPerCol * 2)) * 2 + (i % 2)) * (size + spacing);
    }

    context.drawImage(sprite, x, y);
  }

  fs.writeFileSync(path.resolve('./static/png/', romFileName + '-' + vrom + '.png'), canvas.toBuffer());
}

// Draw a sprite from its 16 byte representation, returns a canvas object.
function renderSprite(bytes, size) {
  var canvas = new Canvas(size, size);
  var context = canvas.getContext('2d');

  var channel_a_rows = bytes.slice(0, 8);
  var channel_b_rows = bytes.slice(8, 16);
  var px = size / 8;

  for (var row = 0; row < 8; row++) {
    var channel_a_row = channel_a_rows[row];
    var channel_b_row = channel_b_rows[row];

    for (var col = 0; col < 8; col++) {
      var bit1 = channel_a_row & (1 << (7 - col));
      var bit2 = channel_b_row & (1 << (7 - col));

      if (!bit1 && !bit2) {
        context.fillStyle = "rgb(255, 255, 255)";
      } else if (!bit1 && bit2) {
        context.fillStyle = "rgb(170, 170, 170)";
      } else if (bit1 && !bit2) {
        context.fillStyle = "rgb(85, 85, 85)";
      } else {
        context.fillStyle = "rgb(0, 0, 0)";
      }

      context.fillRect(col * px, row * px, px, px);
    }
  }

  return canvas;
}
