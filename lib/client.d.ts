declare type onRecvCallback = (data: string) => void;
declare type onDisconnectedCallback = () => void;
export default class Client {
    private onRecv;
    private onDisconnected;
    private connected;
    private conn;
    private key;
    constructor(onRecv: onRecvCallback, onDisconnected: onDisconnectedCallback);
    connect(): Promise<void>;
    connect(host: string): Promise<void>;
    connect(port: number): Promise<void>;
    connect(host: string, port: number): Promise<void>;
    private onData;
    private exchangeKeys;
}
export {};
