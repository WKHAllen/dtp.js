import * as net from "net";
import * as crypto from "crypto";
import {TypedEmitter} from "tiny-typed-emitter";
import {Address, DEFAULT_CLIENT_HOST, DEFAULT_PORT, encodeMessageSize} from "./util";
import {MessageStream} from "./message-stream";
import {aesDecrypt, aesEncrypt, newAESKey} from "./crypto";

/**
 * A callback for when data is received from the server. `R` is the type of data received.
 */
type onReceiveCallback<R> = (data: R) => void;

/**
 * A callback for when the server has disconnected the client.
 */
type onDisconnectedCallback = () => void;

/**
 * Events emitted by the client.
 */
interface ClientEvents<R> {
    /**
     * Emitted when data has been received from the server.
     */
    receive: onReceiveCallback<R>;

    /**
     * Emitted when the server has disconnected the client.
     */
    disconnected: onDisconnectedCallback;
}

/**
 * A socket client. `S` is the type of data that will be sent, and `R` is the type of data that will be received.
 */
export class Client<S, R> extends TypedEmitter<ClientEvents<R>> {
    /**
     * Whether the client is connected to a server.
     */
    private connected: boolean = false;

    /**
     * The client socket.
     */
    private conn: net.Socket | null = null;

    /**
     * The message stream.
     */
    private messageStream: MessageStream = new MessageStream();

    /**
     * The AES key.
     */
    private key: Buffer | null = null;

    constructor() {
        super();
    }

    /**
     * Connect to a server.
     *
     * @param address The server's address.
     */
    public async connect(address?: Partial<Address>): Promise<void> {
        const host = address?.host ?? DEFAULT_CLIENT_HOST;
        const port = address?.port ?? DEFAULT_PORT;

        return new Promise((resolve, reject) => {
            if (this.connected) {
                reject(new Error("client is already connected to a server"));
            }

            this.conn = net.connect(port, host, () => {
                if (this.conn === null) {
                    throw new Error("client connection not established");
                } else {
                    this.exchangeKeys(this.conn)
                        .then(() => {
                            if (this.conn !== null) {
                                this.conn.on("data", (data) => {
                                    const messages = this.messageStream.received(data);

                                    for (const message of messages) {
                                        this.onData(message);
                                    }
                                });
                                this.conn.on("end", () => {
                                    this.connected = false;
                                    this.emit("disconnected");
                                });

                                this.connected = true;
                                resolve();
                            } else {
                                reject(new Error("client has not connected to a server"));
                            }
                        })
                        .catch(reject);
                }
            });
        });
    }

    /**
     * Disconnect from the server.
     */
    public async disconnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error("client is not connected to a server"));
            }

            if (this.conn !== null) {
                this.connected = false;
                this.conn.destroy();
                resolve();
            } else {
                reject(new Error("client has not connected to a server"));
            }
        });
    }

    /**
     * Send data to the server.
     *
     * @param data The data to send.
     */
    public async send(data: S): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error("client is not connected to a server"));
            }

            if (this.conn !== null && this.key !== null) {
                const strData = JSON.stringify(data);
                const bufData = Buffer.from(strData);
                const encryptedData = aesEncrypt(this.key, bufData);
                const dataBuffer = Buffer.concat([
                    encodeMessageSize(encryptedData.length),
                    encryptedData,
                ]);

                this.conn.write(dataBuffer, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject(new Error("client has not connected to a server"));
            }
        });
    }

    /**
     * Check if the client is connected to a server.
     *
     * @returns Whether the client is connected to a server.
     */
    public isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get the client's address.
     *
     * @returns The client's address.
     */
    public getAddr(): Address {
        if (!this.connected) {
            throw new Error("client is not connected to a server");
        }

        if (this.conn !== null) {
            const addr = this.conn.address();

            if (Object.keys(addr).length === 0) {
                return {
                    host: this.conn.localAddress,
                    port: this.conn.localPort,
                };
            } else {
                return {
                    host: (addr as net.AddressInfo).address,
                    port: (addr as net.AddressInfo).port,
                };
            }
        } else {
            throw new Error("client has not connected to a server");
        }
    }

    /**
     * Get the server's address.
     *
     * @returns The server's address.
     */
    public getServerAddr(): Address {
        if (!this.connected) {
            throw new Error("client is not connected to a server");
        }

        if (this.conn !== null) {
            const host = this.conn.remoteAddress;
            const port = this.conn.remotePort;

            if (host !== undefined && port !== undefined) {
                return {
                    host,
                    port,
                };
            } else {
                throw new Error("failed to get server address");
            }
        } else {
            throw new Error("client has not connected to a server");
        }
    }

    /**
     * Called when data has been received from the server.
     *
     * @param dataBuffer The data received.
     */
    private onData(dataBuffer: Buffer): void {
        if (this.key !== null) {
            const decryptedData = aesDecrypt(this.key, dataBuffer);
            const data = JSON.parse(decryptedData.toString());
            this.emit("receive", data);
        } else {
            throw new Error("received data but could not find decryption key");
        }
    }

    /**
     * Exchange keys with the server.
     *
     * @param conn The server socket.
     */
    private async exchangeKeys(conn: net.Socket): Promise<void> {
        return new Promise((resolve, reject) => {
            conn.once("data", (publicKey) => {
                const key = newAESKey();
                const encryptedCipherData = crypto.publicEncrypt(publicKey, key);

                conn.write(encryptedCipherData, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.key = key;
                        resolve();
                    }
                });
            });
        });
    }
}
