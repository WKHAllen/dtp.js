import * as net from 'net';
import { DEFAULT_HOST, DEFAULT_PORT, Address } from './defs';

type onRecvCallback         = (data: string) => void;
type onDisconnectedCallback = () => void;

export class Client {
	private onRecv:         onRecvCallback;
	private onDisconnected: onDisconnectedCallback;
	private connected:      boolean;
	private conn:           net.Socket;
	private key:            string;

	constructor(onRecv: onRecvCallback, onDisconnected: onDisconnectedCallback) {
		this.onRecv         = onRecv;
		this.onDisconnected = onDisconnected;
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
			this.conn.on('data', data => this.onData(data));
			this.conn.on('end', () => this.onDisconnected());

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

	public async send(data: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.connected) {
				reject(new Error('client is not connected to a server'));
			}

			this.conn.write(data, err => {
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
				host: null,
				port: null
			}
		} else {
			return {
				host: (addr as net.AddressInfo).address,
				port: (addr as net.AddressInfo).port
			}
		}
	}

	public getServerAddr(): string {
		if (!this.connected) {
			throw new Error('client is not connected to a server');
		}

		return this.conn.remoteAddress;
	}

	private onData(data: Buffer): void {
		// TODO: parse data received
		this.onRecv(data.toString());
	}

	private async exchangeKeys(conn: net.Socket): Promise<void> {
		return new Promise((resolve, reject) => {
			// TODO: do handshake, exchange keys, and add key record to this.key
			resolve();
		});
	}
}
