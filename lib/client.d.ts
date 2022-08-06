import { TypedEmitter } from "tiny-typed-emitter";
import { Address } from "./util";
declare type onRecvCallback = (data: any) => void;
declare type onDisconnectedCallback = () => void;
interface ClientEvents {
    recv: onRecvCallback;
    disconnected: onDisconnectedCallback;
}
export declare class Client extends TypedEmitter<ClientEvents> {
    private connected;
    private conn;
    private cipher;
    private decipher;
    constructor();
    connect(): Promise<void>;
    connect(host: string): Promise<void>;
    connect(port: number): Promise<void>;
    connect(host: string, port: number): Promise<void>;
    disconnect(): Promise<void>;
    send(data: any): Promise<void>;
    isConnected(): boolean;
    getAddr(): Address;
    getServerAddr(): Address;
    private onData;
    private exchangeKeys;
}
export {};
