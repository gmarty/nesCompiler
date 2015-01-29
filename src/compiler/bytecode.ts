'use strict';

/**
 * A bytecode is made of:
 *  * at least one and at most 3 opcodes
 *  * an operand (defaults to null, can be 8 or 16 bits)
 *  * a next address (defaults to null)
 *  * a jump target (defaults to null)
 *
 * @param {number} address
 * @constructor
 */
function Bytecode(address) {
  this.address = address;
  this.opcode = null;
  this.opaddr = null;
  this.addr = null;
  this.operand = null;
  this.nextAddress = null;
  this.target = null;
  this.endBranch = false; // isFunctionEnder
  this.cycleAdd = 0;
  this.addrMode = null;
  this.isJumpTarget = false;
  this.jumpTargetNb = 0; // Number of bytecodes targeting there.
  this.code = '';
  this.cycleCount = 0;
  this.addrModeCode = null;
}

export = Bytecode;

Bytecode.prototype = {};
