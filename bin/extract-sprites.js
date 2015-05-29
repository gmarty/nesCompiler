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
var romFileBaseName = path.basename(romFilePath, '.nes');
var romFileContent = fs.readFileSync(romFilePath);

var compiler = new Compiler(romFileContent);

if (!compiler.mapper.vrom.length) {
  console.log('Selected ROM has no CHR-ROM banks.');
  process.exit(0);
}

compiler.renderer.generateSprite(romFileBaseName);
