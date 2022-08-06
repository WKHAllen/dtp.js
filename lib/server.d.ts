import { TypedEmitter } from "tiny-typed-emitter";
import { Address } from "./util";
declare type onRecvCallback = (clientID: number, data: any) => void;
declare type onConnectCallback = (clientID: number) => void;
declare type onDisconnectCallback = (clientID: number) => void;
interface ServerEvents {
    recv: onRecvCallback;
    connect: onConnectCallback;
    disconnect: onDisconnectCallback;
}
export declare class Server extends TypedEmitter<ServerEvents> {
    private serving;
    private server;
    private clients;
    private ciphers;
    private deciphers;
    private nextClientID;
    constructor();
    start(): Promise<void>;
    start(host: string): Promise<void>;
    start(port: number): Promise<void>;
    start(host: string, port: number): Promise<void>;
    stop(): Promise<void>;
    send(data: any, ...clientIDs: number[]): Promise<void>;
    isServing(): boolean;
    getAddr(): Address;
    getClientAddr(clientID: number): Address | string;
    removeClient(clientID: number): void;
    private onData;
    private exchangeKeys;
}
export {};
