'use strict';

import Streamer = require('./streamer');
import Bytecode = require('./bytecode');
import utils = require('../utils');

var toHex = utils.toHex;

function Parser(mapper, rawRom) {
  this.codeLogger = new Array(rawRom.length - 16);

  for (var i = 0; i < this.codeLogger.length; i++) {
    this.codeLogger[i] = 0;
  }

  this.streamer = new Streamer(rawRom, mapper);
  this.mapper = mapper;
  this.rom = this.mapper.mem;

  this.opdata = new OpData().opdata;

  this.addresses = [];
  this.bytecodes = [];

  this.nmi_routine_addr = this.streamer.getUint16(0xfffa) - 1;
  this.reset_routine_addr = this.streamer.getUint16(0xfffc) - 1;
  this.irq_routine_addr = this.streamer.getUint16(0xfffe) - 1;

  this.addJumpTarget(this.nmi_routine_addr);
  this.addJumpTarget(this.reset_routine_addr);
  this.addJumpTarget(this.irq_routine_addr);

  console.log('NMI:   $%s', toHex(this.nmi_routine_addr));
  console.log('Reset: $%s', toHex(this.reset_routine_addr));
  console.log('IRQ:   $%s', toHex(this.irq_routine_addr));
}

export = Parser;

Parser.prototype = {
  streamer: null,
  mapper: null,
  rom: null,

  opdata: null,

  codeLogger: [],

  nmi_routine_addr: 0,
  reset_routine_addr: 0,
  irq_routine_addr: 0,

  addresses: [],
  jumpTargets: [],
  bytecodes: [],

  addAddress: function(address) {
    this.addresses.push(address);
  },

  /**
   * Same as addAddress but will mark the address as a jump target.
   * @param address
   */
  addJumpTarget: function(address) {
    this.addresses.push(address);
    this.jumpTargets.push(address);
  },

  parse: function() {
    while (this.addresses.length) {
      var currentAddress = this.addresses.shift();

      if (currentAddress < 0/* || currentAddress > this.rom.length */) {
        //throw new Error('Address out of bound: ' + (currentAddress));
        console.log('Address out of bound: ' + (currentAddress));
        continue;
      }

      // Make sure bytecodes are only parsed once.
      if (this.bytecodes[currentAddress]) {
        continue;
      }

      var bytecode = new Bytecode(currentAddress);
      bytecode = this.disassemble(bytecode);

      if (!bytecode) {
        continue;
      }

      this.bytecodes[currentAddress] = bytecode;

      var nextAddress = this.bytecodes[currentAddress].nextAddress;
      if (nextAddress !== null && typeof nextAddress === 'number') {
        this.addAddress(nextAddress);
      }

      nextAddress = this.bytecodes[currentAddress].target;
      if (nextAddress !== null && typeof nextAddress === 'number') {
        this.addAddress(nextAddress);
      }
    }

    // Mark jump targets.
    this.jumpTargets.forEach(address => {
      this.bytecodes[address].isJumpTarget = true;
    });

    for (var address = 0, length = this.bytecodes.length; address < length; address++) {
      if (!this.bytecodes[address]) {
        continue;
      }
      // Comparing with null is important here as `0` is a valid address (0x00).
      if (this.bytecodes[address].target !== null) {
        var targetAddress = this.bytecodes[address].target;
        if (this.bytecodes[targetAddress]) {
          this.bytecodes[targetAddress].isJumpTarget = true;
          this.bytecodes[targetAddress].jumpTargetNb++;
        } else {
          //throw new Error('Invalid target address: $' + toHex(this.bytecodes[address].target));
          console.log('Invalid target address: $%s', toHex(this.bytecodes[address].target));
        }
      }
    }
  },

  /**
   * Returns the bytecode associated to an opcode.
   *
   * @param {Bytecode} bytecode
   * @return {Bytecode}
   */
  disassemble: function(bytecode) {
    this.streamer.seek(bytecode.address + 1);
    var op = this.streamer.getUint8FromMapper();
    //var opinf = this.opdata[this.mapper.load(this.streamer.position + 1)];
    var opinf = this.opdata[op];

    if (opinf === undefined) {
      console.log('Invalid opcode details at address $%s', toHex(this.streamer.position - 1));
      return null;
    }

    var addrMode = (opinf >> 8) & 0xFF;
    var opaddr = bytecode.address;
    //this.streamer.seek(this.streamer.position);
    var cycleCount = (opinf >> 24);

    var operand = null;
    var target = null;
    var nextAddress = bytecode.address + ((opinf >> 16) & 0xFF);
    var endBranch = false; // Whether the branch stops at this instruction.
    var canEnd = false; // ???
    var cycleAdd = 0;
    var addr = null;
    var addrModeCode = null;

    switch (addrMode) {
      case 0:
        // Zero Page mode. Use the address given after the opcode,
        // but without high byte.
        addr = this.streamer.getUint8();
        nextAddress = this.streamer.position - 1;
        break;

      case 1:
        // Relative mode.
        addr = this.streamer.position + this.streamer.getInt8();
        nextAddress = this.streamer.position - 1;
        break;

      case 2:
        // Ignore. Address is implied in instruction.
        addrModeCode = '';
        break;

      case 3:
        // Absolute mode. Use the two bytes following the opcode as an address.
        addr = this.streamer.getUint16();
        nextAddress = this.streamer.position - 1;
        break;

      case 4:
        // Can't statically determine this address.
        addr = 'this.REG_ACC';
        break;

      case 5:
        // Immediate mode. The value is given after the opcode.
        addr = this.streamer.position;
        break;

      case 6:
        addr = '(' + this.streamer.getUint8() + ' + this.REG_X) & 0xFF';
        nextAddress = this.streamer.position - 1;
        break;

      case 7:
        addr = '(' + this.streamer.getUint8() + ' + this.REG_Y) & 0xFF';
        nextAddress = this.streamer.position - 1;
        break;

      case 8:
        addr = '0x' + toHex(this.streamer.getUint16()) + ' + this.REG_X';
        nextAddress = this.streamer.position - 1;
        addrModeCode = 'var addr = ' + addr + ';' + '\n' +
        'if ((addr & 0xFF00) !== ((addr + this.REG_X) & 0xFF00)) {' + '\n' +
        '  cycleAdd = 1;' + '\n' +
        '}';
        break;

      case 9:
        addr = '0x' + toHex(this.streamer.getUint16()) + ' + this.REG_Y';
        nextAddress = this.streamer.position - 1;
        addrModeCode = 'var addr = ' + addr + ';' + '\n' +
        'if ((addr & 0xFF00) !== ((addr + this.REG_Y) & 0xFF00)) {' + '\n' +
        '  cycleAdd = 1;' + '\n' +
        '}';
        break;

      case 10:
        addr = 'this.load16bit(0x' + toHex(this.streamer.getUint8()) + ') + this.REG_X';
        nextAddress = this.streamer.position - 1;
        addrModeCode = 'var addr = ' + addr + ';' + '\n' +
        'if ((addr & 0xFF00) !== ((addr + this.REG_X) & 0xFF00)) {' + '\n' +
        '  cycleAdd = 1;' + '\n' +
        '}';
        break;

      case 11:
        addr = 'this.load16bit(0x' + toHex(this.streamer.getUint8()) + ') + this.REG_Y';
        nextAddress = this.streamer.position - 1;
        addrModeCode = 'var addr = ' + addr + ';' + '\n' +
        'if ((addr & 0xFF00) !== ((addr + this.REG_Y) & 0xFF00)) {' + '\n' +
        '  cycleAdd = 1;' + '\n' +
        '}';
        break;

      case 12:
        // Indirect Absolute mode. Find the address indicated by the pointer.
        var pointer = this.streamer.getUint16();
        nextAddress = this.streamer.position - 1;
        if (pointer < 0x1FFF) {
          addr = 'this.mem[' + pointer + '] + (this.mem[' + ((pointer & 0xFF00) | (((pointer & 0xFF) + 1) & 0xFF)) + '] << 8)'; // Read from address given in op
        } else {
          addr = 'this.mapper.load(' + pointer + ') + (this.mapper.load(' + ((pointer & 0xFF00) | ((( pointer & 0xFF) + 1) & 0xFF)) + ') << 8)';
        }
        break;

      default:
        //throw new Error('Invalid addressing mode $' + toHex(addrMode) + ' at address $' + toHex(opaddr) + ' (value: ' + toHex(op) + ')');
        console.log('Invalid addressing mode $%s at address $%s (value: %s)', toHex(addrMode), toHex(opaddr), toHex(op));
        return null;
        break;
    }

    if (addrModeCode === null) {
      addrModeCode = 'var addr = ' + addr + ';';
    }

    this.streamer.seek(nextAddress);

    switch (opinf & 0xFF) {
      case 0:
      case 1:
      case 2:
        break;

      case 3:
      case 4:
      case 5:
        target = addr;
        break;

      case 6:
        break;

      case 7:
      case 8:
      case 9:
        target = addr;
        break;

      case 10:
        endBranch = true;
        break;

      case 11:
      case 12:
        target = addr;
        break;

      case 13:
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 23:
      case 24:
      case 25:
      case 26:
        break;

      case 27:
        this.streamer.seek(null);
        target = typeof addr === 'number' ? addr - 1 : null;
        endBranch = true;
        break;

      case 28:
        target = typeof addr === 'number' ? addr - 1 : null;
        endBranch = true;
        break;

      case 29:
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
        break;

      case 41:
        endBranch = true;
        this.streamer.seek(null);
        break;

      case 42:
        endBranch = true;
        this.streamer.seek(null);
        break;

      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
        break;

      default:
        //throw new Error('Invalid opcode $' + toHex(opinf & 0xFF) + ' at address $' + toHex(opaddr) + ' (value: ' + toHex(op) + ')');
        console.log('Invalid opcode $%s at address $%s (value: %s)', toHex(opinf & 0xFF), toHex(opaddr), toHex(op));
        return null;
        break;
    }

    bytecode.opcode = opinf & 0xFF;
    bytecode.nextAddress = this.streamer.position;
    bytecode.operand = operand;
    bytecode.addr = addr;
    bytecode.target = typeof target === 'number' ? target : null;
    bytecode.endBranch = endBranch;
    bytecode.canEnd = canEnd; // ???
    bytecode.cycleAdd = cycleAdd;
    bytecode.opaddr = opaddr;
    bytecode.addrMode = addrMode;
    bytecode.cycleCount = cycleCount;
    bytecode.addrModeCode = addrModeCode;

    return bytecode;
  }
};

/**
 * Generates and provides an array of details about instructions.
 *
 * @constructor
 */
function OpData() {
  this.opdata = new Uint32Array(0xFF);

  // Set all to invalid instruction (to detect crashes):
  for (var i = 0; i < 0xFF; i++) {
    this.opdata[i] = 0xFF;
  }

  // Now fill in all valid opcodes:

  // ADC:
  this.setOp(this.INS_ADC, 0x69, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_ADC, 0x65, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_ADC, 0x75, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_ADC, 0x6D, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_ADC, 0x7D, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_ADC, 0x79, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_ADC, 0x61, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_ADC, 0x71, this.ADDR_POSTIDXIND, 2, 5);

  // AND:
  this.setOp(this.INS_AND, 0x29, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_AND, 0x25, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_AND, 0x35, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_AND, 0x2D, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_AND, 0x3D, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_AND, 0x39, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_AND, 0x21, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_AND, 0x31, this.ADDR_POSTIDXIND, 2, 5);

  // ASL:
  this.setOp(this.INS_ASL, 0x0A, this.ADDR_ACC, 1, 2);
  this.setOp(this.INS_ASL, 0x06, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_ASL, 0x16, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_ASL, 0x0E, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_ASL, 0x1E, this.ADDR_ABSX, 3, 7);

  // BCC:
  this.setOp(this.INS_BCC, 0x90, this.ADDR_REL, 2, 2);

  // BCS:
  this.setOp(this.INS_BCS, 0xB0, this.ADDR_REL, 2, 2);

  // BEQ:
  this.setOp(this.INS_BEQ, 0xF0, this.ADDR_REL, 2, 2);

  // BIT:
  this.setOp(this.INS_BIT, 0x24, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_BIT, 0x2C, this.ADDR_ABS, 3, 4);

  // BMI:
  this.setOp(this.INS_BMI, 0x30, this.ADDR_REL, 2, 2);

  // BNE:
  this.setOp(this.INS_BNE, 0xD0, this.ADDR_REL, 2, 2);

  // BPL:
  this.setOp(this.INS_BPL, 0x10, this.ADDR_REL, 2, 2);

  // BRK:
  this.setOp(this.INS_BRK, 0x00, this.ADDR_IMP, 1, 7);

  // BVC:
  this.setOp(this.INS_BVC, 0x50, this.ADDR_REL, 2, 2);

  // BVS:
  this.setOp(this.INS_BVS, 0x70, this.ADDR_REL, 2, 2);

  // CLC:
  this.setOp(this.INS_CLC, 0x18, this.ADDR_IMP, 1, 2);

  // CLD:
  this.setOp(this.INS_CLD, 0xD8, this.ADDR_IMP, 1, 2);

  // CLI:
  this.setOp(this.INS_CLI, 0x58, this.ADDR_IMP, 1, 2);

  // CLV:
  this.setOp(this.INS_CLV, 0xB8, this.ADDR_IMP, 1, 2);

  // CMP:
  this.setOp(this.INS_CMP, 0xC9, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_CMP, 0xC5, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_CMP, 0xD5, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_CMP, 0xCD, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_CMP, 0xDD, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_CMP, 0xD9, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_CMP, 0xC1, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_CMP, 0xD1, this.ADDR_POSTIDXIND, 2, 5);

  // CPX:
  this.setOp(this.INS_CPX, 0xE0, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_CPX, 0xE4, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_CPX, 0xEC, this.ADDR_ABS, 3, 4);

  // CPY:
  this.setOp(this.INS_CPY, 0xC0, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_CPY, 0xC4, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_CPY, 0xCC, this.ADDR_ABS, 3, 4);

  // DEC:
  this.setOp(this.INS_DEC, 0xC6, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_DEC, 0xD6, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_DEC, 0xCE, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_DEC, 0xDE, this.ADDR_ABSX, 3, 7);

  // DEX:
  this.setOp(this.INS_DEX, 0xCA, this.ADDR_IMP, 1, 2);

  // DEY:
  this.setOp(this.INS_DEY, 0x88, this.ADDR_IMP, 1, 2);

  // EOR:
  this.setOp(this.INS_EOR, 0x49, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_EOR, 0x45, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_EOR, 0x55, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_EOR, 0x4D, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_EOR, 0x5D, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_EOR, 0x59, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_EOR, 0x41, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_EOR, 0x51, this.ADDR_POSTIDXIND, 2, 5);

  // INC:
  this.setOp(this.INS_INC, 0xE6, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_INC, 0xF6, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_INC, 0xEE, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_INC, 0xFE, this.ADDR_ABSX, 3, 7);

  // INX:
  this.setOp(this.INS_INX, 0xE8, this.ADDR_IMP, 1, 2);

  // INY:
  this.setOp(this.INS_INY, 0xC8, this.ADDR_IMP, 1, 2);

  // JMP:
  this.setOp(this.INS_JMP, 0x4C, this.ADDR_ABS, 3, 3);
  this.setOp(this.INS_JMP, 0x6C, this.ADDR_INDABS, 3, 5);

  // JSR:
  this.setOp(this.INS_JSR, 0x20, this.ADDR_ABS, 3, 6);

  // LDA:
  this.setOp(this.INS_LDA, 0xA9, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_LDA, 0xA5, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_LDA, 0xB5, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_LDA, 0xAD, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_LDA, 0xBD, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_LDA, 0xB9, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_LDA, 0xA1, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_LDA, 0xB1, this.ADDR_POSTIDXIND, 2, 5);


  // LDX:
  this.setOp(this.INS_LDX, 0xA2, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_LDX, 0xA6, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_LDX, 0xB6, this.ADDR_ZPY, 2, 4);
  this.setOp(this.INS_LDX, 0xAE, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_LDX, 0xBE, this.ADDR_ABSY, 3, 4);

  // LDY:
  this.setOp(this.INS_LDY, 0xA0, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_LDY, 0xA4, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_LDY, 0xB4, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_LDY, 0xAC, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_LDY, 0xBC, this.ADDR_ABSX, 3, 4);

  // LSR:
  this.setOp(this.INS_LSR, 0x4A, this.ADDR_ACC, 1, 2);
  this.setOp(this.INS_LSR, 0x46, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_LSR, 0x56, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_LSR, 0x4E, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_LSR, 0x5E, this.ADDR_ABSX, 3, 7);

  // NOP:
  this.setOp(this.INS_NOP, 0xEA, this.ADDR_IMP, 1, 2);

  // ORA:
  this.setOp(this.INS_ORA, 0x09, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_ORA, 0x05, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_ORA, 0x15, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_ORA, 0x0D, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_ORA, 0x1D, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_ORA, 0x19, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_ORA, 0x01, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_ORA, 0x11, this.ADDR_POSTIDXIND, 2, 5);

  // PHA:
  this.setOp(this.INS_PHA, 0x48, this.ADDR_IMP, 1, 3);

  // PHP:
  this.setOp(this.INS_PHP, 0x08, this.ADDR_IMP, 1, 3);

  // PLA:
  this.setOp(this.INS_PLA, 0x68, this.ADDR_IMP, 1, 4);

  // PLP:
  this.setOp(this.INS_PLP, 0x28, this.ADDR_IMP, 1, 4);

  // ROL:
  this.setOp(this.INS_ROL, 0x2A, this.ADDR_ACC, 1, 2);
  this.setOp(this.INS_ROL, 0x26, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_ROL, 0x36, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_ROL, 0x2E, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_ROL, 0x3E, this.ADDR_ABSX, 3, 7);

  // ROR:
  this.setOp(this.INS_ROR, 0x6A, this.ADDR_ACC, 1, 2);
  this.setOp(this.INS_ROR, 0x66, this.ADDR_ZP, 2, 5);
  this.setOp(this.INS_ROR, 0x76, this.ADDR_ZPX, 2, 6);
  this.setOp(this.INS_ROR, 0x6E, this.ADDR_ABS, 3, 6);
  this.setOp(this.INS_ROR, 0x7E, this.ADDR_ABSX, 3, 7);

  // RTI:
  this.setOp(this.INS_RTI, 0x40, this.ADDR_IMP, 1, 6);

  // RTS:
  this.setOp(this.INS_RTS, 0x60, this.ADDR_IMP, 1, 6);

  // SBC:
  this.setOp(this.INS_SBC, 0xE9, this.ADDR_IMM, 2, 2);
  this.setOp(this.INS_SBC, 0xE5, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_SBC, 0xF5, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_SBC, 0xED, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_SBC, 0xFD, this.ADDR_ABSX, 3, 4);
  this.setOp(this.INS_SBC, 0xF9, this.ADDR_ABSY, 3, 4);
  this.setOp(this.INS_SBC, 0xE1, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_SBC, 0xF1, this.ADDR_POSTIDXIND, 2, 5);

  // SEC:
  this.setOp(this.INS_SEC, 0x38, this.ADDR_IMP, 1, 2);

  // SED:
  this.setOp(this.INS_SED, 0xF8, this.ADDR_IMP, 1, 2);

  // SEI:
  this.setOp(this.INS_SEI, 0x78, this.ADDR_IMP, 1, 2);

  // STA:
  this.setOp(this.INS_STA, 0x85, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_STA, 0x95, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_STA, 0x8D, this.ADDR_ABS, 3, 4);
  this.setOp(this.INS_STA, 0x9D, this.ADDR_ABSX, 3, 5);
  this.setOp(this.INS_STA, 0x99, this.ADDR_ABSY, 3, 5);
  this.setOp(this.INS_STA, 0x81, this.ADDR_PREIDXIND, 2, 6);
  this.setOp(this.INS_STA, 0x91, this.ADDR_POSTIDXIND, 2, 6);

  // STX:
  this.setOp(this.INS_STX, 0x86, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_STX, 0x96, this.ADDR_ZPY, 2, 4);
  this.setOp(this.INS_STX, 0x8E, this.ADDR_ABS, 3, 4);

  // STY:
  this.setOp(this.INS_STY, 0x84, this.ADDR_ZP, 2, 3);
  this.setOp(this.INS_STY, 0x94, this.ADDR_ZPX, 2, 4);
  this.setOp(this.INS_STY, 0x8C, this.ADDR_ABS, 3, 4);

  // TAX:
  this.setOp(this.INS_TAX, 0xAA, this.ADDR_IMP, 1, 2);

  // TAY:
  this.setOp(this.INS_TAY, 0xA8, this.ADDR_IMP, 1, 2);

  // TSX:
  this.setOp(this.INS_TSX, 0xBA, this.ADDR_IMP, 1, 2);

  // TXA:
  this.setOp(this.INS_TXA, 0x8A, this.ADDR_IMP, 1, 2);

  // TXS:
  this.setOp(this.INS_TXS, 0x9A, this.ADDR_IMP, 1, 2);

  // TYA:
  this.setOp(this.INS_TYA, 0x98, this.ADDR_IMP, 1, 2);
}

OpData.prototype = {
  opdata: null,

  INS_ADC: 0,
  INS_AND: 1,
  INS_ASL: 2,

  INS_BCC: 3,
  INS_BCS: 4,
  INS_BEQ: 5,
  INS_BIT: 6,
  INS_BMI: 7,
  INS_BNE: 8,
  INS_BPL: 9,
  INS_BRK: 10,
  INS_BVC: 11,
  INS_BVS: 12,

  INS_CLC: 13,
  INS_CLD: 14,
  INS_CLI: 15,
  INS_CLV: 16,
  INS_CMP: 17,
  INS_CPX: 18,
  INS_CPY: 19,

  INS_DEC: 20,
  INS_DEX: 21,
  INS_DEY: 22,

  INS_EOR: 23,

  INS_INC: 24,
  INS_INX: 25,
  INS_INY: 26,

  INS_JMP: 27,
  INS_JSR: 28,

  INS_LDA: 29,
  INS_LDX: 30,
  INS_LDY: 31,
  INS_LSR: 32,

  INS_NOP: 33,

  INS_ORA: 34,

  INS_PHA: 35,
  INS_PHP: 36,
  INS_PLA: 37,
  INS_PLP: 38,

  INS_ROL: 39,
  INS_ROR: 40,
  INS_RTI: 41,
  INS_RTS: 42,

  INS_SBC: 43,
  INS_SEC: 44,
  INS_SED: 45,
  INS_SEI: 46,
  INS_STA: 47,
  INS_STX: 48,
  INS_STY: 49,

  INS_TAX: 50,
  INS_TAY: 51,
  INS_TSX: 52,
  INS_TXA: 53,
  INS_TXS: 54,
  INS_TYA: 55,

  INS_DUMMY: 56, // dummy instruction used for 'halting' the processor some cycles

  // -------------------------------- //

  // Addressing modes:
  ADDR_ZP: 0,
  ADDR_REL: 1,
  ADDR_IMP: 2,
  ADDR_ABS: 3,
  ADDR_ACC: 4,
  ADDR_IMM: 5,
  ADDR_ZPX: 6,
  ADDR_ZPY: 7,
  ADDR_ABSX: 8,
  ADDR_ABSY: 9,
  ADDR_PREIDXIND: 10,
  ADDR_POSTIDXIND: 11,
  ADDR_INDABS: 12,

  setOp: function(inst, op, addr, size, cycles) {
    this.opdata[op] =
      ((inst & 0xFF)) |
      ((addr & 0xFF) << 8) |
      ((size & 0xFF) << 16) |
      ((cycles & 0xFF) << 24);
  }
};
