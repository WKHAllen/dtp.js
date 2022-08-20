import * as net from "net";
import * as crypto from "crypto";
import {TypedEmitter} from "tiny-typed-emitter";
import {Address, BACKLOG, DEFAULT_PORT, DEFAULT_SERVER_HOST, encodeMessageSize} from "./util";
import {MessageStream} from "./message-stream";
import {aesDecrypt, aesEncrypt, newRSAKeys} from "./crypto";
import {WaitGroup} from "./wait";

/**
 * A callback for when data is received from a client. `R` is the type of data received.
 */
type onReceiveCallback<R> = (clientID: number, data: R) => void;

/**
 * A callback for when a client connects to the server.
 */
type onConnectCallback = (clientID: number) => void;

/**
 * A callback for when a client disconnects from the server.
 */
type onDisconnectCallback = (clientID: number) => void;

/**
 * Events emitted by the server.
 */
interface ServerEvents<R> {
    /**
     * Emitted when data is received from a client.
     */
    receive: onReceiveCallback<R>;

    /**
     * Emitted when a client connects to the server.
     */
    connect: onConnectCallback;

    /**
     * Emitted when a client disconnects from the server.
     */
    disconnect: onDisconnectCallback;
}

/**
 * A mapping of client IDs to client sockets.
 */
interface ClientMap {
    [clientID: number]: net.Socket;
}

/**
 * A mapping of client IDs to client message streams.
 */
interface ClientMessageStreamMap {
    [clientID: number]: MessageStream;
}

/**
 * A mapping of client IDs to client AES keys.
 */
interface KeyMap {
    [clientID: number]: Buffer;
}

/**
 * A socket server. `S` is the type of data that will be sent, and `R` is the type of data that will be received.
 */
export class Server<S, R> extends TypedEmitter<ServerEvents<R>> {
    /**
     * Whether the server is serving.
     */
    private serving: boolean = false;

    /**
     * The server socket.
     */
    private server: net.Server | null = null;

    /**
     * The mapping of client IDs to their sockets.
     */
    private clients: ClientMap = {};

    /**
     * A mapping of client IDs to their message streams.
     */
    private messageStreams: ClientMessageStreamMap = {};

    /**
     * A mapping of client IDs to their AES keys.
     */
    private keys: KeyMap = {};

    /**
     * The next available client ID.
     */
    private nextClientID: number = 0;

    constructor() {
        super();
    }

    /**
     * Start the server.
     *
     * @param address The server's address.
     */
    public async start(address?: Partial<Address>): Promise<void> {
        const host = address?.host ?? DEFAULT_SERVER_HOST;
        const port = address?.port ?? DEFAULT_PORT;

        return new Promise((resolve, reject) => {
            if (this.serving) {
                reject(new Error("server is already serving"));
            }

            this.server = net.createServer((conn) => {
                const newClientID = this.nextClientID++;

                this.exchangeKeys(newClientID, conn)
                    .then(() => {
                        this.clients[newClientID] = conn;
                        this.messageStreams[newClientID] = new MessageStream();

                        this.emit("connect", newClientID);
                        conn.on("data", (data) => {
                            const messages = this.messageStreams[newClientID].received(data);

                            for (const message of messages) {
                                this.onData(newClientID, message);
                            }
                        });
                        conn.on("end", () => {
                            this.removeClient(newClientID);
                            this.emit("disconnect", newClientID);
                        });
                    })
                    .catch((err) => {
                        throw err;
                    });
            });

            this.serving = true;
            this.server.listen(port, host, BACKLOG, resolve);
        });
    }

    /**
     * Stop the server.
     */
    public async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.serving) {
                reject(new Error("server is not serving"));
            }

            this.serving = false;

            for (const clientID in this.clients) {
                this.clients[clientID].destroy();
            }

            this.clients = {};
            this.keys = {};

            if (this.server !== null) {
                this.server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject(new Error("server has not been started"));
            }
        });
    }

    /**
     * Send data to clients.
     *
     * @param data The data to send.
     * @param clientIDs The client IDs to send the data to. If none are specified, data will be sent to all clients.
     */
    public async send(data: S, ...clientIDs: number[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.serving) {
                reject(new Error("server is not serving"));
            }

            if (clientIDs.length === 0) {
                clientIDs = Object.keys(this.clients).map((clientID) =>
                    parseInt(clientID)
                );
            }

            const wg = new WaitGroup();

            for (const clientID of clientIDs) {
                if (clientID in this.clients) {
                    const strData = JSON.stringify(data);
                    const bufData = Buffer.from(strData);
                    const encryptedData = aesEncrypt(this.keys[clientID], bufData);
                    const dataBuffer = Buffer.concat([
                        encodeMessageSize(encryptedData.length),
                        encryptedData,
                    ]);

                    wg.add();

                    this.clients[clientID].write(dataBuffer, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            wg.done();
                        }
                    });
                } else {
                    reject(new Error(`client ${clientID} does not exist`));
                }
            }

            wg.wait().then(resolve);
        });
    }

    /**
     * Check if the server is serving.
     *
     * @returns Whether the server is serving.
     */
    public isServing(): boolean {
        return this.serving;
    }

    /**
     * Get the server's address.
     *
     * @returns The server's address.
     */
    public getAddr(): Address {
        if (!this.serving) {
            throw new Error("server is not serving");
        }

        if (this.server !== null) {
            const addr = this.server.address();

            if (addr === null) {
                throw new Error("failed to get server address");
            } else if (typeof addr === "string") {
                return {
                    host: addr,
                    port: -1,
                };
            } else {
                return {
                    host: addr.address,
                    port: addr.port,
                };
            }
        } else {
            throw new Error("server has not been started");
        }
    }

    /**
     * Get a client's address.
     *
     * @param clientID The client's ID.
     * @returns The client's address.
     */
    public getClientAddr(clientID: number): Address {
        if (!this.serving) {
            throw new Error("server is not serving");
        }

        if (clientID in this.clients) {
            const host = this.clients[clientID].remoteAddress;
            const port = this.clients[clientID].remotePort;

            if (host !== undefined && port !== undefined) {
                return {
                    host,
                    port,
                };
            } else {
                throw new Error("failed to get client address");
            }
        } else {
            throw new Error(`client ${clientID} does not exist`);
        }
    }

    /**
     * Disconnect a client from the server.
     *
     * @param clientID The client's ID.
     */
    public removeClient(clientID: number): void {
        if (!this.serving) {
            throw new Error("server is not serving");
        }

        if (clientID in this.clients) {
            this.clients[clientID].destroy();
            delete this.clients[clientID];
            delete this.keys[clientID];
            delete this.messageStreams[clientID];
        } else {
            throw new Error(`client ${clientID} does not exist`);
        }
    }

    /**
     * Called when data has been received from a client.
     *
     * @param clientID The client's ID.
     * @param dataBuffer The data received.
     */
    private onData(clientID: number, dataBuffer: Buffer): void {
        const decryptedData = aesDecrypt(this.keys[clientID], dataBuffer);
        const data = JSON.parse(decryptedData.toString());
        this.emit("receive", clientID, data);
    }

    /**
     * Exchange keys with a client.
     *
     * @param clientID The client's ID.
     * @param conn The client socket.
     */
    private async exchangeKeys(
        clientID: number,
        conn: net.Socket
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            newRSAKeys()
                .then(({publicKey, privateKey}) => {
                    conn.write(Buffer.from(publicKey.toString()), (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            conn.once("data", (encryptedCipherData) => {
                                this.keys[clientID] = crypto.privateDecrypt(
                                    {
                                        key: privateKey,
                                        passphrase: "",
                                    },
                                    encryptedCipherData
                                );
                                resolve();
                            });
                        }
                    });
                })
                .catch(reject);
        });
    }
}
