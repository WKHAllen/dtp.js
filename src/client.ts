import * as net from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import { DEFAULT_HOST, DEFAULT_PORT, Address } from './defs';

type onRecvCallback         = (data: any) => void;
type onDisconnectedCallback = () => void;

interface ClientEvents {
	'recv':         onRecvCallback;
	'disconnected': onDisconnectedCallback;
}

export class Client extends TypedEmitter<ClientEvents> {
	private connected:      boolean = false;
	private conn:           net.Socket;
	private key:            string;

	constructor() {
		super();
	}

	public async connect(): Promise<void>;
	public async connect(host: string): Promise<void>;
	public async connect(port: number): Promise<void>;
	public async connect(host: string, port: number): Promise<void>;
	public async connect(host: any = DEFAULT_HOST, port: any = DEFAULT_PORT): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.connected) {
				reject(new Error('client is already connected to a server'));
			}

			this.conn = net.connect(port, host, resolve);
			this.conn.on('data', (data) => this.onData(data));
			this.conn.on('end', () => {
				this.connected = false;
				this.emit('disconnected');
			});

			this.exchangeKeys(this.conn)
				.then(() => {
					this.connected = true;
					resolve();
				})
				.catch(reject);
		});
	}

	public async disconnect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.connected) {
				reject(new Error('client is not connected to a server'));
			}

			this.connected = false;
			this.conn.destroy();
			resolve();
		});
	}

	public async send(data: any): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.connected) {
				reject(new Error('client is not connected to a server'));
			}

			const strData = JSON.stringify(data);
			this.conn.write(strData, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	public isConnected(): boolean {
		return this.connected;
	}

	public getAddr(): Address {
		if (!this.connected) {
			throw new Error('client is not connected to a server');
		}

		const addr = this.conn.address();
		if (Object.keys(addr).length === 0) {
			return {
				host: this.conn.localAddress,
				port: this.conn.localPort
			}
		} else {
			return {
				host: (addr as net.AddressInfo).address,
				port: (addr as net.AddressInfo).port
			}
		}
	}

	public getServerAddr(): Address {
		if (!this.connected) {
			throw new Error('client is not connected to a server');
		}

		return {
			host: this.conn.remoteAddress,
			port: this.conn.remotePort
		};
	}

	private onData(dataBuffer: Buffer): void {
		// TODO: parse data received
		const data = JSON.parse(dataBuffer.toString());
		this.emit('recv', data);
	}

	private async exchangeKeys(conn: net.Socket): Promise<void> {
		return new Promise((resolve, reject) => {
			// TODO: do handshake, exchange keys, and add key record to this.key
			resolve();
		});
	}
}
