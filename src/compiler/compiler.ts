'use strict';

import Mapper000 = require('./mappers/000');
import Mapper001 = require('./mappers/001');
import Mapper002 = require('./mappers/002');
import Mapper004 = require('./mappers/004');
import Parser = require('./parser');
import Analyser = require('./analyser');
import Generator = require('./generator');
import Renderer = require('./renderer');

/** @const **/ var HEADER_LENGTH = 16;

class Compiler {
  private rom;
  mapper;
  parser;
  analyser;
  generator;
  renderer;

  constructor(rom) {
    if (!this.isValidRom(rom)) {
      throw new Error('Not a valid NES ROM.');
    }

    this.rom = rom;
    this.mapper = this.instantiateMapper();
    this.parser = new Parser(this.mapper, rom);
    this.analyser = new Analyser();
    this.generator = new Generator();
    this.renderer = new (<any>Renderer)(this);
  }

  // One function per instruction based compiler.
  compile() {
    try {
      this.parser.parse();
    } catch (e) {
      console.log('The ROM could not be parsed.', e);
    }

    this.analyser.analyse(this.parser.bytecodes);

    var fns = this.generator.generate(this.analyser.bytecodes);

    var ret = '\'use strict\';' + '\n' +
      '' + '\n' +
      'var branches = {' + '\n';
    for (var addr in fns) {
      ret += addr + ': function(self) {' + '\n' +
        fns[addr]
          .replace(/this\./g, 'self.') +
        '},' + '\n';
    }
    ret += '};' + '\n';

    return ret;
  }

  isValidRom(rom) {
    var valid = true;
    [78, 69, 83, 26].forEach((b, i) => {
      if (b != rom[i]) {
        valid = false;
      }
    });

    return valid;
  }

  instantiateMapper() {
    var romCount = this.rom[4];
    var vromCount = this.rom[5] * 2;
    var mapperType = (this.rom[6] >> 4) | (this.rom[7] & 0xF0);
    var mapper = null;

    switch (mapperType) {
      case 0:
        mapper = new Mapper000(this.rom);
        break;
      case 1:
        mapper = new Mapper001(this.rom);
        break;
      case 2:
        mapper = new Mapper002(this.rom);
        break;
      case 4:
        mapper = new Mapper004(this.rom);
        break;
      default:
        throw new Error('Unsupported mapper ' + mapperType);
        break;
    }

    console.log('Rom size: %sKB (raw: %sB)',
      (this.rom.length - HEADER_LENGTH) / 1024, this.rom.length);
    console.log('Mapper: %d (%s), PRG-ROM Pages: %d × 16kB, CHR-ROM Pages: %d × 4kB',
      mapperType, mapper.name, romCount, vromCount);

    return mapper;
  }
}

export = Compiler;
