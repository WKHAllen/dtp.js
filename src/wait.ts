export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
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
