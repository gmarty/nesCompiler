///<reference path='../../declarations/Buffer.d.ts'/>

'use strict';

function Mapper(rawRom) {
  /** @const **/ var headerLength = 16;

  this.romCount = rawRom[4];
  this.vromCount = rawRom[5] * 2;

  this.rom = new Array(this.romCount);
  for (var i = 0; i < this.romCount; i++) {
    this.rom[i] = new Buffer(0x4000);
    rawRom.copy(this.rom[i], 0, headerLength + (i * 0x4000));
  }

  // cpu.mem
  this.mem = new Buffer(0x10000);
  for (var i = 0; i < 0x10000; i++) {
    this.mem[i] = 0;
  }

  // Load PRG-ROM.
  this.loadRomBank(0 % this.romCount, 0x8000);
  this.loadRomBank(1 % this.romCount, 0xC000);

  // Load CHR-ROM.
  this.vrom = new Array(this.vromCount);
  for (i = 0; i < this.vromCount; i++) {
    this.vrom[i] = new Buffer(0x1000);
    rawRom.copy(this.vrom[i], 0, headerLength + (this.romCount * 0x4000) + (i * 0x1000));
  }
}

export = Mapper;

Mapper.prototype = {
  rom: [],
  mem: null,
  vrom: [],
  romCount: 0,
  vromCount: 0,

  name: 'Direct Access',

  // Loads a ROM bank into the specified address.
  loadRomBank: function(bank, address) {
    bank %= this.romCount;
    this.rom[bank].copy(this.mem, address);
  },

  load: function(address) {
    // Wrap around:
    address &= 0xFFFF;

    // Check address range:
    if (address > 0x4017) {
      // ROM:
      return this.mem[address];
    } else if (address >= 0x2000) {
      // I/O Ports.
      console.log('I/O Ports address $%s', (address).toString(16));
      return null;
    } else {
      // RAM (mirrored)
      return this.mem[address & 0x7FF];
    }
  },

  regLoad: function(address) {
    switch (address >> 12) { // use fourth nibble (0xF000)
      case 0:
      case 1:
        break;

      case 2:
      // Fall through to case 3
      case 3:
        // PPU Registers
        switch (address & 0x7) {
          case 0x0:
            // 0x2000:
            // PPU Control Register 1.
            // (the value is stored both
            // in main memory and in the
            // PPU as flags):
            // (not in the real NES)
            return this.mem[0x2000];

          case 0x1:
            // 0x2001:
            // PPU Control Register 2.
            // (the value is stored both
            // in main memory and in the
            // PPU as flags):
            // (not in the real NES)
            return this.mem[0x2001];

          case 0x2:
            // 0x2002:
            // PPU Status Register.
            // The value is stored in
            // main memory in addition
            // to as flags in the PPU.
            // (not in the real NES)
            return this.nes.ppu.readStatusRegister();

          case 0x3:
            return 0;

          case 0x4:
            // 0x2004:
            // Sprite Memory read.
            return this.nes.ppu.sramLoad();

          case 0x5:
          case 0x6:
            return 0;

          case 0x7:
            // 0x2007:
            // VRAM read:
            return this.nes.ppu.vramLoad();
        }
        break;

      case 4:
        // Sound+Joypad registers
        switch (address - 0x4015) {
          case 0:
            // 0x4015:
            // Sound channel enable, DMC Status
            return this.nes.papu.readReg(address);

          case 1:
            // 0x4016:
            // Joystick 1 + Strobe
            return this.joy1Read();

          case 2:
            // 0x4017:
            // Joystick 2 + Strobe
            if (this.mousePressed) {

              // Check for white pixel nearby:
              var sx = Math.max(0, this.mouseX - 4);
              var ex = Math.min(256, this.mouseX + 4);
              var sy = Math.max(0, this.mouseY - 4);
              var ey = Math.min(240, this.mouseY + 4);
              var w = 0;

              for (var y = sy; y < ey; y++) {
                for (var x = sx; x < ex; x++) {

                  if (this.nes.ppu.buffer[(y << 8) + x] == 0xFFFFFF) {
                    w |= 0x1 << 3;
                    console.debug('Clicked on white!');
                    break;
                  }
                }
              }

              w |= (this.mousePressed ? (0x1 << 4) : 0);
              return (this.joy2Read() | w) & 0xFFFF;
            } else {
              return this.joy2Read();
            }
        }
        break;
    }
    return 0;
  }
};
