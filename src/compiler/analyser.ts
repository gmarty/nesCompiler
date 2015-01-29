'use strict';

import opcodeTable = require('./opcodes');

function Analyser() {
}

export = Analyser;

Analyser.prototype = {
  bytecodes: null,
  missingOpcodes: {},

  analyse: function(bytecodes) {
    this.bytecodes = bytecodes;
    this.normalizeBytecode();
  },

  normalizeBytecode: function() {
    var self = this;

    this.bytecodes = this.bytecodes
      // Populate AST for each bytecode.
      .map(function(bytecode) {
        var opcode = opcodeTable[bytecode.opcode];

        if (opcode) {
          bytecode.code = opcode(bytecode.opaddr, bytecode.addrMode);
        } else {
          var i = bytecode.opcode;
          console.log('Missing opcode %d', i);
          self.missingOpcodes[i] = self.missingOpcodes[i] !== undefined ?
          self.missingOpcodes[i] + 1 : 1;
        }

        return bytecode;
      });
  }
};
