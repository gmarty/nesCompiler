#!/usr/bin/env node

// Compile a NES rom to JavaScript.

'use strict';

var fs = require('fs');
var path = require('path');

var optimist = require('optimist');
var Compiler = require(__dirname + '/../dist/compiler/compiler');

var cli = optimist
  .usage('Compile a NES rom to JavaScript.' + '\n' +
  'Optionally place a JSON file containing entry points next to the ROM.' + '\n' +
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

// Look for a JSON file located in the same folder with the same name.
var tentativeJsonFilePath = path.resolve(romFilePath, '..', romFileName + '.json');

var jsonFileExists = fs.existsSync(tentativeJsonFilePath);

var json = null;
if (jsonFileExists) {
  console.log('JSON file found at:', tentativeJsonFilePath);
  json = require(tentativeJsonFilePath);
}

if (json && json.entry_points) {
  json.entry_points.forEach(function(entryPoint) {
    compiler.parser.addAddress(entryPoint);
  });
}

var branches = compiler.compile();

// Write the JavaScript file.
fs.writeFileSync(path.resolve('./static/', romFileName + '.js'), branches);
