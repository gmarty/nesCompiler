/// <reference path="../declarations/node-canvas.d.ts" />
/// <reference path="../declarations/node-0.10.d.ts" />

'use strict';

// Extract the sprites from a NES rom and generate a PNG image.

import Canvas = require('canvas');
import fs = require('fs');
import path = require('path');

// Background colour if there is padding in the generated image.
/** @const **/ var PADDING_COLOUR = 'green';

// Default sprite colours.
var Colours: string[] = [
  'rgb(255, 255, 255)',
  'rgb(170, 170, 170)',
  'rgb(85, 85, 85)',
  'rgb(0, 0, 0)'
];

// Sprite size. 0=8x8, 1=8x16
enum SpriteSize { Sprite8x8, Sprite8x16 }

class Renderer {
  private compiler: any;

  spriteSize: SpriteSize = SpriteSize.Sprite8x8;
  spritesPerCol = 16;
  spritesPerRow = 256 / 16;
  size = 8; // The size of a sprite in pixel.
  spacing = 0;
  width = 0;
  height = 0;
  private canvas: Canvas;
  private context;
  private palettes = [];

  constructor(compiler) {
    this.compiler = compiler;

    this.spritesPerRow = 256 / this.spritesPerCol;
    this.width = (this.size * this.spritesPerCol) + (this.spacing * (this.spritesPerCol - 1));
    this.height = (this.size * this.spritesPerRow) + (this.spacing * (this.spritesPerRow - 1));
    this.canvas = new (<any>Canvas)(this.width, this.height);
    this.context = this.canvas.getContext('2d');
  }

  generateSprite(fileBaseName) {
    this.context.fillStyle = PADDING_COLOUR;
    this.context.fillRect(0, 0, this.width, this.height);

    if (!this.palettes.length) {
      this.generateSpriteForPalette(fileBaseName, []);
      return;
    }

    var paletteNumber = 0;
    this.palettes.forEach(palette => {
      for (var i = 0; i < 16; i += 4) {
        var subPalette = palette.slice(i, i + 4);
        this.generateSpriteForPalette(fileBaseName, subPalette, paletteNumber);
        paletteNumber++;
      }
    });
  }

  generateSpriteForPalette(fileBaseName, palette, paletteNumber = 0) {
    var vrom = this.compiler.mapper.vrom;

    for (var vromNumber = 0; vromNumber < vrom.length; vromNumber++) {
      var length = vrom[vromNumber].length / 16;

      for (var i = 0; i < length; i++) {
        var sprite_data = vrom[vromNumber].slice(i * 16, (i + 1) * 16);
        var sprite = this.renderSprite(sprite_data, this.size, palette);
        var x = 0;
        var y = 0;

        if (this.spriteSize === SpriteSize.Sprite8x8) {
          x = (i % this.spritesPerCol) * (this.size + this.spacing);
          y = Math.floor(i / this.spritesPerCol) * (this.size + this.spacing);
        } else {
          x = (Math.floor(i / 2) % this.spritesPerCol) * (this.size + this.spacing);
          y = (Math.floor(i / (this.spritesPerCol * 2)) * 2 + (i % 2)) * (this.size + this.spacing);
        }

        this.context.drawImage(sprite, x, y);
      }

      fs.writeFileSync(path.resolve('./static/png/', fileBaseName + '-' + vromNumber + '-' + paletteNumber + '.png'), this.canvas.toBuffer());
    }
  }

  // Draw a sprite from its 16 byte representation, returns a canvas object.
  renderSprite(bytes, size, palette): Canvas {
    var canvas: Canvas = new (<any>Canvas)(size, size);
    var context = canvas.getContext('2d');

    var channel_a_rows = bytes.slice(0, 8);
    var channel_b_rows = bytes.slice(8, 16);
    var px = size / 8;

    var colour0 = Colours[0];
    var colour1 = Colours[1];
    var colour2 = Colours[2];
    var colour3 = Colours[3];

    if (palette && palette.length) {
      colour0 = this.getCanvasColour(palette[0]);
      colour1 = this.getCanvasColour(palette[2]);
      colour2 = this.getCanvasColour(palette[1]);
      colour3 = this.getCanvasColour(palette[3]);
    }

    for (var row = 0; row < 8; row++) {
      var channel_a_row = channel_a_rows[row];
      var channel_b_row = channel_b_rows[row];

      for (var col = 0; col < 8; col++) {
        var bit1 = channel_a_row & (1 << (7 - col));
        var bit2 = channel_b_row & (1 << (7 - col));

        if (!bit1 && !bit2) {
          context.fillStyle = colour0;
        } else if (!bit1 && bit2) {
          context.fillStyle = colour1;
        } else if (bit1 && !bit2) {
          context.fillStyle = colour2;
        } else {
          context.fillStyle = colour3;
        }

        context.fillRect(col * px, row * px, px, px);
      }
    }

    return canvas;
  }

  addPalette(palette: number[]) {
    this.palettes.push(palette);
  }

  getCanvasColour(colour = 0) {
    var r = colour & 0xFF;
    var g = (colour >> 8) & 0xFF;
    var b = (colour >> 16) & 0xFF;

    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
}

export = Renderer;
