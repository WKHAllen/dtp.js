const { decToAscii, asciiToDec } = require('../dist/util');

test('test decimal to ascii conversion', () => {
	expect(decToAscii(            0)).toBe(String.fromCharCode(  0,   0,   0,   0,   0));
	expect(decToAscii(            1)).toBe(String.fromCharCode(  0,   0,   0,   0,   1));
	expect(decToAscii(          255)).toBe(String.fromCharCode(  0,   0,   0,   0, 255));
	expect(decToAscii(          256)).toBe(String.fromCharCode(  0,   0,   0,   1,   0));
	expect(decToAscii(          257)).toBe(String.fromCharCode(  0,   0,   0,   1,   1));
	expect(decToAscii(   4311810305)).toBe(String.fromCharCode(  1,   1,   1,   1,   1));
	expect(decToAscii(   4328719365)).toBe(String.fromCharCode(  1,   2,   3,   4,   5));
	expect(decToAscii(  47362409218)).toBe(String.fromCharCode( 11,   7,   5,   3,   2));
	expect(decToAscii(1099511627775)).toBe(String.fromCharCode(255, 255, 255, 255, 255));
});

test('test ascii to decimal conversion', () => {
	expect(asciiToDec(String.fromCharCode(  0,   0,   0,   0,   0))).toBe(             0);
	expect(asciiToDec(String.fromCharCode(  0,   0,   0,   0,   1))).toBe(             1);
	expect(asciiToDec(String.fromCharCode(  0,   0,   0,   0, 255))).toBe(           255);
	expect(asciiToDec(String.fromCharCode(  0,   0,   0,   1,   0))).toBe(           256);
	expect(asciiToDec(String.fromCharCode(  0,   0,   0,   1,   1))).toBe(           257);
	expect(asciiToDec(String.fromCharCode(  1,   1,   1,   1,   1))).toBe(    4311810305);
	expect(asciiToDec(String.fromCharCode(  1,   2,   3,   4,   5))).toBe(    4328719365);
	expect(asciiToDec(String.fromCharCode( 11,   7,   5,   3,   2))).toBe(   47362409218);
	expect(asciiToDec(String.fromCharCode(255, 255, 255, 255, 255))).toBe( 1099511627775);
});
