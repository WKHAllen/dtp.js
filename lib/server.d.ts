declare type onRecvCallback = (clientID: number, data: string) => void;
declare type onConnectCallback = (clientID: number) => void;
declare type onDisconnectCallback = (clientID: number) => void;
export default class Server {
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
}
export {};
