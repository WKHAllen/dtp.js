/**
 * Wait asynchronously for an interval of time.
 *
 * @param ms Number of milliseconds to wait.
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A wait group.
 */
export class WaitGroup {
  /**
   * The number of entities being waited on.
   */
  private total: number = 0;

  /**
   * Add entities to the wait group.
   *
   * @param numToAdd The number of entities to add to the wait group.
   */
  public add(numToAdd: number = 1): void {
    this.total += numToAdd;
  }

  /**
   * Mark entities as being completed.
   *
   * @param numDone The number of entities to be marked as completed.
   */
  public done(numDone: number = 1): void {
    this.total -= numDone;
  }

  /**
   * Wait for the wait group to complete.
   *
   * @param waitMS The number of milliseconds to wait between each check operation.
   */
  public async wait(waitMS: number = 10): Promise<void> {
    while (this.total > 0) {
      await wait(waitMS);
    }
  }

  /**
   * Get the number of entities still being waited on.
   *
   * @returns The total number of entities that have not been marked completed.
   */
  public getTotal(): number {
    return this.total;
  }
}
