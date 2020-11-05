declare type onRecvCallback = (clientID: number, data: string) => void;
declare type onConnectCallback = (clientID: number) => void;
declare type onDisconnectCallback = (clientID: number) => void;
interface Address {
    host: string;
    port: number;
}
export declare class Server {
    private onRecv;
    private onConnect;
    private onDisconnect;
    private serving;
    private server;
    private clients;
    private keys;
    private nextClientID;
    constructor(onRecv: onRecvCallback, onConnect: onConnectCallback, onDisconnect: onDisconnectCallback);
    start(): Promise<void>;
    start(host: string): Promise<void>;
    start(port: number): Promise<void>;
    start(host: string, port: number): Promise<void>;
    stop(): Promise<void>;
    send(data: string, ...clientIDs: number[]): Promise<void>;
    isServing(): boolean;
    getAddr(): Address;
    getClientAddr(clientID: number): Address | string;
    removeClient(clientID: number): void;
    private onData;
    private exchangeKeys;
}
export {};
