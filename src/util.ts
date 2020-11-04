const lenSize = 5;

export function decToAscii(dec: number): string {
	let ascii = '';
	for (let i = 0; i < lenSize; i++) {
		ascii = String.fromCharCode(dec % 256) + ascii;
		dec = Math.floor(dec / 256);
	}
	return ascii;
}

export function asciiToDec(ascii: string): number {
	let dec = 0;
	for (let i = 0; i < lenSize; i++) {
		dec *= 256;
		dec += ascii.charCodeAt(i);
	}
	return dec;
}
