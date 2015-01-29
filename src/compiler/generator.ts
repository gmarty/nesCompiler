'use strict';

import utils = require('../utils');

var toHex = utils.toHex;

function Generator() {
}

export = Generator;

Generator.prototype = {
  // Switch based compiler.
  generate: function(bytecodes) {
    var self = this;
    var fns = Object.create(null);
    var startAddr = null;

    bytecodes.forEach(function(bytecode, addr) {
      if (!bytecode) {
        return;
      }

      startAddr = addr;
      fns[startAddr] = '';

      fns[startAddr] += '// $' + toHex(bytecode.address) + ' ' +
      '/ ' + self.opcodes[bytecode.opcode] +
      ' (' + bytecode.opcode + ') ' +
      '/ Addr mode: ' + bytecode.addrMode + ' ' +
      (bytecode.isJumpTarget ? '/ jumpTarget ' + bytecode.jumpTargetNb : '') + '\n';
      fns[startAddr] += 'var cycleCount = ' + bytecode.cycleCount + ';' + '\n';
      fns[startAddr] += 'var cycleAdd = 0;' + '\n';
      fns[startAddr] += bytecode.addrModeCode + '\n';
      fns[startAddr] += bytecode.code + '\n';
      if (bytecode.nextAddress) {
        fns[startAddr] += 'this.REG_PC = ' + (bytecode.nextAddress) + ';' + '\n';
      }
      fns[startAddr] += 'return cycleCount;' + '\n';
    });

    return fns;
  },

  opcodes: [
    'ADC',
    'AND',
    'ASL',
    'BCC',
    'BCS',
    'BEQ',
    'BIT',
    'BMI',
    'BNE',
    'BPL',
    'BRK',
    'BVC',
    'BVS',
    'CLC',
    'CLD',
    'CLI',
    'CLV',
    'CMP',
    'CPX',
    'CPY',
    'DEC',
    'DEX',
    'DEY',
    'EOR',
    'INC',
    'INX',
    'INY',
    'JMP',
    'JSR',
    'LDA',
    'LDX',
    'LDY',
    'LSR',
    'NOP',
    'ORA',
    'PHA',
    'PHP',
    'PLA',
    'PLP',
    'ROL',
    'ROR',
    'RTI',
    'RTS',
    'SBC',
    'SEC',
    'SED',
    'SEI',
    'STA',
    'STX',
    'STY',
    'TAX',
    'TAY',
    'TSX',
    'TXA',
    'TXS',
    'TYA'
  ]
};
