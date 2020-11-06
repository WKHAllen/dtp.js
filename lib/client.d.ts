import { TypedEmitter } from 'tiny-typed-emitter';
import { Address } from './defs';
declare type onRecvCallback = (data: string) => void;
declare type onDisconnectedCallback = () => void;
interface ClientEvents {
    'recv': onRecvCallback;
    'disconnected': onDisconnectedCallback;
}
export declare class Client extends TypedEmitter<ClientEvents> {
    private connected;
    private conn;
    private key;
    constructor();
    connect(): Promise<void>;
    connect(host: string): Promise<void>;
    connect(port: number): Promise<void>;
    connect(host: string, port: number): Promise<void>;
    disconnect(): Promise<void>;
    send(data: string): Promise<void>;
    isConnected(): boolean;
    getAddr(): Address;
    getServerAddr(): Address;
    private onData;
    private exchangeKeys;
}
export {};
