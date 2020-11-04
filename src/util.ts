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

export async function wait(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

export class WaitGroup {
	private total: number = 0;

	public add(numToAdd: number = 1): void {
		this.total += numToAdd;
	}

	public done(numDone: number = 1): void {
		this.total -= numDone;
	}

	public async wait(waitMS: number = 10): Promise<void> {
		while (this.total > 0) {
			await wait(waitMS);
		}
	}

	public getTotal(): number {
		return this.total;
	}
}
