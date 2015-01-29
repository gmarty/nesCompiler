'use strict';

/**
 * @todo
 *  * Implement cycleAdd (need to replicate addressing mode logic).
 */

var opcodeTable = [];

export = opcodeTable;

var returnFromFunctionSnippet = 'return cycleCount;';

opcodeTable[0] = function(opaddr, addrMode) {
  return ['var temp = this.REG_ACC + this.load(addr) + this.F_CARRY;',
    'this.F_OVERFLOW = ((!(((this.REG_ACC ^ this.load(addr)) & 0x80) !== 0) && (((this.REG_ACC ^ temp) & 0x80)) !== 0) ? 1 : 0);',
    'this.F_CARRY = (temp > 255 ? 1 : 0);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp & 0xFF;',
    'this.REG_ACC = (temp & 255);',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[1] = function(opaddr, addrMode) {
  return ['this.REG_ACC = this.REG_ACC & this.load(addr);',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;',
    'if (' + addrMode + ' !== 11) {',
    '  cycleCount += cycleAdd;',
    '}'].join('\n');
};

opcodeTable[2] = function(opaddr, addrMode) {
  return ['if (' + addrMode + ' === 4) {',
    '  this.F_CARRY = (this.REG_ACC >> 7) & 1;',
    '  this.REG_ACC = (this.REG_ACC << 1) & 255;',
    '  this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    '  this.F_ZERO = this.REG_ACC;',
    '} else {',
    '  var temp = this.load(addr);',
    '  this.F_CARRY = (temp >> 7) & 1;',
    '  temp = (temp << 1) & 255;',
    '  this.F_SIGN = (temp >> 7) & 1;',
    '  this.F_ZERO = temp;',
    '  this.write(addr, temp)',
    ';}'].join('\n');
};

opcodeTable[3] = function(opaddr, addrMode) {
  return ['if (this.F_CARRY === 0) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[4] = function(opaddr, addrMode) {
  return ['if (this.F_CARRY === 1) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[5] = function(opaddr, addrMode) {
  return ['if (this.F_ZERO === 0) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[6] = function(opaddr, addrMode) {
  return ['var temp = this.load(addr);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_OVERFLOW = (temp >> 6) & 1;',
    'temp &= this.REG_ACC;',
    'this.F_ZERO = temp;'].join('\n');
};

opcodeTable[7] = function(opaddr, addrMode) {
  return ['if (this.F_SIGN === 1) {',
    '  cycleCount++;',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[8] = function(opaddr, addrMode) {
  return ['if (this.F_ZERO !== 0) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[9] = function(opaddr, addrMode) {
  return ['if (this.F_SIGN === 0) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[10] = function(opaddr, addrMode) {
  return ['this.REG_PC += 2;',
    'this.push((this.REG_PC >> 8) & 255);',
    'this.push(this.REG_PC & 255);',
    'this.F_BRK = 1;',
    'this.push(',
    '  (this.F_CARRY) |',
    '  ((this.F_ZERO === 0 ? 1 : 0) << 1) |',
    '  (this.F_INTERRUPT << 2) |',
    '  (this.F_DECIMAL << 3) |',
    '  (this.F_BRK << 4) |',
    '  (this.F_NOTUSED << 5) |',
    '  (this.F_OVERFLOW << 6) |',
    '  (this.F_SIGN << 7)',
    ');',
    'this.F_INTERRUPT = 1;',
    'this.REG_PC = this.load16bit(0xFFFE);',
    'this.REG_PC--;',
    returnFromFunctionSnippet].join('\n');
};

opcodeTable[11] = function(opaddr, addrMode) {
  return ['if (this.F_OVERFLOW === 0) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[12] = function(opaddr, addrMode) {
  return ['if (this.F_OVERFLOW === 1) {',
    '  cycleCount += (' + (opaddr & 0xFF00) + ' !== (addr & 0xFF00) ? 2 : 1);',
    '  this.REG_PC = addr;',
    '  ' + returnFromFunctionSnippet,
    '}'].join('\n');
};

opcodeTable[13] = function(opaddr, addrMode) {
  return 'this.F_CARRY = 0;';
};

opcodeTable[14] = function(opaddr, addrMode) {
  return 'this.F_DECIMAL = 0;';
};

opcodeTable[15] = function(opaddr, addrMode) {
  return 'this.F_INTERRUPT = 0;';
};

opcodeTable[16] = function(opaddr, addrMode) {
  return 'this.F_OVERFLOW = 0;';
};

opcodeTable[17] = function(opaddr, addrMode) {
  return ['var temp = this.REG_ACC - this.load(addr);',
    'this.F_CARRY = (temp >= 0 ? 1 : 0);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp & 0xFF;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[18] = function(opaddr, addrMode) {
  return ['var temp = this.REG_X - this.load(addr);',
    'this.F_CARRY = (temp >= 0 ? 1 : 0);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp & 0xFF;'].join('\n');
};

opcodeTable[19] = function(opaddr, addrMode) {
  return ['var temp = this.REG_Y - this.load(addr);',
    'this.F_CARRY = (temp >= 0 ? 1 : 0);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp & 0xFF;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[20] = function(opaddr, addrMode) {
  return ['var temp = (this.load(addr) - 1) & 0xFF;',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp;',
    'this.write(addr, temp);'].join('\n');
};

opcodeTable[21] = function(opaddr, addrMode) {
  return ['this.REG_X = (this.REG_X - 1) & 0xFF;',
    'this.F_SIGN = (this.REG_X >> 7) & 1;',
    'this.F_ZERO = this.REG_X;'].join('\n');
};

opcodeTable[22] = function(opaddr, addrMode) {
  return ['this.REG_Y = (this.REG_Y - 1) & 0xFF;',
    'this.F_SIGN = (this.REG_Y >> 7) & 1;',
    'this.F_ZERO = this.REG_Y;'].join('\n');
};

opcodeTable[23] = function(opaddr, addrMode) {
  return ['this.REG_ACC = (this.load(addr) ^ this.REG_ACC) & 0xFF;',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[24] = function(opaddr, addrMode) {
  return ['var temp = (this.load(addr) + 1) & 0xFF;',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp;',
    'this.write(addr, temp & 0xFF);'].join('\n');
};

opcodeTable[25] = function(opaddr, addrMode) {
  return ['this.REG_X = (this.REG_X + 1) & 0xFF;',
    'this.F_SIGN = (this.REG_X >> 7) & 1;',
    'this.F_ZERO = this.REG_X;'].join('\n');
};

opcodeTable[26] = function(opaddr, addrMode) {
  return ['this.REG_Y++;',
    'this.REG_Y &= 0xFF;',
    'this.F_SIGN = (this.REG_Y >> 7) & 1;',
    'this.F_ZERO = this.REG_Y;'].join('\n');
};

opcodeTable[27] = function(opaddr, addrMode) {
  return [
    'this.REG_PC = addr - 1;',
    returnFromFunctionSnippet].join('\n');
};

opcodeTable[28] = function(opaddr, addrMode) {
  return ['this.push((this.REG_PC >> 8) & 255);',
    'this.push(this.REG_PC & 255);',
    'this.REG_PC = addr - 1;',
    returnFromFunctionSnippet].join('\n');
};

opcodeTable[29] = function(opaddr, addrMode) {
  return ['this.REG_ACC = this.load(addr);',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[30] = function(opaddr, addrMode) {
  return ['this.REG_X = this.load(addr);',
    'this.F_SIGN = (this.REG_X >> 7) & 1;',
    'this.F_ZERO = this.REG_X;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[31] = function(opaddr, addrMode) {
  return ['this.REG_Y = this.load(addr);',
    'this.F_SIGN = (this.REG_Y >> 7) & 1;',
    'this.F_ZERO = this.REG_Y;',
    'cycleCount += cycleAdd;'].join('\n');
};

opcodeTable[32] = function(opaddr, addrMode) {
  return ['var temp = 0;',
    'if (' + addrMode + ' === 4) {',
    '  temp = (this.REG_ACC & 0xFF);',
    '  this.F_CARRY = temp & 1;',
    '  temp >>= 1;',
    '  this.REG_ACC = temp;',
    '} else {',
    '  temp = this.load(addr) & 0xFF;',
    '  this.F_CARRY = temp & 1;',
    '  temp >>= 1;',
    '  this.write(addr, temp);',
    '}',
    'this.F_SIGN = 0;',
    'this.F_ZERO = temp;'].join('\n');
};

opcodeTable[33] = function() {
  return '';
};

opcodeTable[34] = function(opaddr, addrMode) {
  return ['var temp = (this.load(addr) | this.REG_ACC) & 255;',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp;',
    'this.REG_ACC = temp;',
    'if (' + addrMode + ' !== 11) {',
    '  cycleCount += cycleAdd;',
    '}'].join('\n');
};

opcodeTable[35] = function(opaddr, addrMode) {
  return 'this.push(this.REG_ACC);';
};

opcodeTable[37] = function(opaddr, addrMode) {
  return ['this.REG_ACC = this.pull();',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;'].join('\n');
};

opcodeTable[39] = function(opaddr, addrMode) {
  return ['var temp = 0;',
    'var add = 0;',
    'if (' + addrMode + ' === 4) {',
    '  temp = this.REG_ACC;',
    '  add = this.F_CARRY;',
    '  this.F_CARRY = (temp >> 7) & 1;',
    '  temp = ((temp << 1) & 0xFF) + add;',
    '  this.REG_ACC = temp;',
    '} else {',
    '  temp = this.load(addr);',
    '  add = this.F_CARRY;',
    '  this.F_CARRY = (temp >> 7) & 1;',
    '  temp = ((temp << 1) & 0xFF) + add;',
    '  this.write(addr, temp);',
    '}',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp;'].join('\n');
};

opcodeTable[40] = function(opaddr, addrMode) {
  return ['var temp = 0;',
    'var add = 0;',
    'if (' + addrMode + ' === 4) {',
    '  add = this.F_CARRY << 7;',
    '  this.F_CARRY = this.REG_ACC & 1;',
    '  temp = (this.REG_ACC >> 1) + add;',
    '  this.REG_ACC = temp;',
    '} else {',
    '  temp = this.load(addr);',
    '  add = this.F_CARRY << 7;',
    '  this.F_CARRY = temp & 1;',
    '  temp = (temp >> 1) + add;',
    '  this.write(addr, temp);',
    '}',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp;'].join('\n');
};

opcodeTable[41] = function(opaddr, addrMode) {
  return ['var temp = this.pull();',
    'this.F_CARRY = (temp) & 1;',
    'this.F_ZERO = ((temp >> 1) & 1) === 0 ? 1 : 0;',
    'this.F_INTERRUPT = (temp >> 2) & 1;',
    'this.F_DECIMAL = (temp >> 3) & 1;',
    'this.F_BRK = (temp >> 4) & 1;',
    'this.F_NOTUSED = (temp >> 5) & 1;',
    'this.F_OVERFLOW = (temp >> 6) & 1;',
    'this.F_SIGN = (temp >> 7) & 1;',
    '',
    'this.REG_PC = this.pull();',
    'this.REG_PC += (this.pull() << 8);',
    'if (this.REG_PC === 0xFFFF) {',
    '  return;', // return from NSF play routine (???)
    '}',
    'this.REG_PC--;',
    'this.F_NOTUSED = 1;',
    returnFromFunctionSnippet].join('\n');
};

opcodeTable[42] = function() {
  return ['this.REG_PC = this.pull();',
    'this.REG_PC += (this.pull() << 8);',
    'this.REG_PC += 3;',
    'if (this.REG_PC === 0xFFFF) {',
    '  return;', // return from NSF play routine (???)
    '}',
    returnFromFunctionSnippet].join('\n');
};

opcodeTable[43] = function(opaddr, addrMode) {
  return ['var temp = this.REG_ACC - this.load(addr) - (1 - this.F_CARRY);',
    'this.F_SIGN = (temp >> 7) & 1;',
    'this.F_ZERO = temp & 0xFF;',
    'this.F_OVERFLOW = ((((this.REG_ACC ^ temp) & 0x80) !== 0 && ((this.REG_ACC ^ this.load(addr)) & 0x80) !== 0) ? 1 : 0);',
    'this.F_CARRY = (temp < 0 ? 0 : 1);',
    'this.REG_ACC = (temp & 0xFF);',
    'if (' + addrMode + ' !== 11) {',
    '  cycleCount += cycleAdd;',
    '}'].join('\n');
};

opcodeTable[44] = function() {
  return 'this.F_CARRY = 1;';
};

opcodeTable[45] = function() {
  return 'this.F_DECIMAL = 1;';
};

opcodeTable[46] = function() {
  return 'this.F_INTERRUPT = 1;';
};

opcodeTable[47] = function() {
  return 'this.write(addr, this.REG_ACC);';
};

opcodeTable[48] = function() {
  return 'this.write(addr, this.REG_X);';
};

opcodeTable[49] = function() {
  return 'this.write(addr, this.REG_Y);';
};

opcodeTable[50] = function() {
  return ['this.REG_X = this.REG_ACC;',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;'].join('\n');
};

opcodeTable[51] = function() {
  return ['this.REG_Y = this.REG_ACC;',
    'this.F_SIGN = (this.REG_ACC >> 7) & 1;',
    'this.F_ZERO = this.REG_ACC;'].join('\n');
};

opcodeTable[53] = function() {
  return ['this.REG_ACC = this.REG_X;',
    'this.F_SIGN = (this.REG_X >> 7) & 1;',
    'this.F_ZERO = this.REG_X;'].join('\n');
};

opcodeTable[54] = function() {
  return ['this.REG_SP = (this.REG_X + 0x0100);',
    'this.stackWrap();'].join('\n');
};

opcodeTable[55] = function() {
  return ['this.REG_ACC = this.REG_Y;',
    'this.F_SIGN = (this.REG_Y >> 7) & 1;',
    'this.F_ZERO = this.REG_Y;'].join('\n');
};
