export declare function wait(ms: number): Promise<void>;
export default class WaitGroup {
    private total;
    add(numToAdd?: number): void;
    done(numDone?: number): void;
    wait(waitMS?: number): Promise<void>;
    getTotal(): number;
}
