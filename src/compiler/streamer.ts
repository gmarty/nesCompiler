'use strict';

/**
 * @param {Array.<Array|DataView>} rom
 * @param {Object} mapper
 * @constructor
 */
function Streamer(rom, mapper) {
  this.rom = rom;
  this.mapper = mapper;
}

export = Streamer;

Streamer.prototype = {
  pos: null, // Internal cursor

  /**
   * @return {?number}
   */
  get position() {
    return this.pos;
  },

  /**
   * @param {?number} pos
   */
  seek: function(pos) {
    this.pos = pos;
  },

  /**
   * Read an unsigned byte from ROM memory.
   *
   * @return {number} Value from memory location.
   */
  getUint8: function(address) {
    if (address === undefined) {
      address = this.pos;
    } else {
      this.pos = address;
    }

    if (address < 0x2000) {
      var value = this.rom[address & 0x7FF];
    } else {
      var value = this.mapper.load(address);
    }
    this.pos++;

    return value;
  },

  /**
   * Read an unsigned byte from ROM memory.
   *
   * @return {number} Value from memory location.
   */
  getUint8FromMapper: function(address) {
    if (address === undefined) {
      address = this.pos;
    } else {
      this.pos = address;
    }

    var value = this.mapper.load(address);
    this.pos++;

    return value;
  },

  /**
   * Read a signed byte from ROM memory.
   *
   * @return {number} Value from memory location.
   */
  getInt8: function(address) {
    var value = 0;

    if (address === undefined) {
      address = this.pos;
    } else {
      this.pos = address;
    }

    if (address < 0x2000) {
      value = this.rom[address & 0x7FF];
    } else {
      value = this.mapper.load(address);
    }
    this.pos++;

    if (value === null) {
      return null;
    }

    if (value >= 0x80) {
      value = value - 0x100;
    }

    return value;
  },

  /**
   * Read an unsigned word (two bytes) from ROM memory.
   *
   * @return {number} Value from memory location.
   */
  getUint16: function(address) {
    var hi = 0;
    var lo = 0;

    if (address === undefined) {
      address = this.pos;
    } else {
      this.pos = address;
    }

    if (address < 0x1FFF) {
      hi = this.rom[address & 0x7FF];
      lo = this.rom[(address + 1) & 0x7FF];
    } else {
      hi = this.mapper.load(address);
      lo = this.mapper.load(address + 1);
    }
    this.pos += 2;

    if (hi === null || lo === null) {
      return null;
    }

    return hi | (lo << 8);
  }
};
