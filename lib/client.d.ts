declare type onRecvCallback = (data: string) => void;
declare type onDisconnectedCallback = () => void;
export default class Client {
    private onRecv;
    private onDisconnected;
    private connected;
    private conn;
    private key;
    constructor(onRecv: onRecvCallback, onDisconnected: onDisconnectedCallback);
}
export {};
