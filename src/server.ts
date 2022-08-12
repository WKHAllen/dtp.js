import * as net from "net";
import * as crypto from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  BACKLOG,
  DEFAULT_SERVER_HOST,
  DEFAULT_PORT,
  Address,
  encode_message_size,
  MessageStream,
  newRSAKeys,
  newAESCipherFromKeyIV,
} from "./util";
import { WaitGroup } from "./wait";

type onRecvCallback<R> = (clientID: number, data: R) => void;
type onConnectCallback = (clientID: number) => void;
type onDisconnectCallback = (clientID: number) => void;

interface ClientMap {
  [clientID: number]: net.Socket;
}

interface ClientMessageStreamMap {
  [clientID: number]: MessageStream;
}

interface CipherMap {
  [clientID: number]: crypto.Cipher | crypto.Decipher;
}

interface ServerEvents<R> {
  recv: onRecvCallback<R>;
  connect: onConnectCallback;
  disconnect: onDisconnectCallback;
}

export class Server<S, R> extends TypedEmitter<ServerEvents<R>> {
  private serving: boolean = false;
  private server: net.Server | null = null;
  private clients: ClientMap = {};
  private messageStreams: ClientMessageStreamMap = {};
  private ciphers: CipherMap = {};
  private deciphers: CipherMap = {};
  private nextClientID: number = 0;

  constructor() {
    super();
  }

  public async start(): Promise<void>;
  public async start(host: string): Promise<void>;
  public async start(port: number): Promise<void>;
  public async start(host: string, port: number): Promise<void>;
  public async start(
    host: any = DEFAULT_SERVER_HOST,
    port: any = DEFAULT_PORT
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.serving) {
        reject(new Error("server is already serving"));
      }

      this.server = net.createServer((conn) => {
        const newClientID = this.nextClientID++;

        this.exchangeKeys(newClientID, conn).then(() => {
          this.clients[newClientID] = conn;
          this.messageStreams[newClientID] = new MessageStream();

          this.emit("connect", newClientID);
          conn.on("data", (data) => {
            const msgs = this.messageStreams[newClientID].received(data);

            for (const msg of msgs) {
              this.onData(newClientID, msg);
            }
          });
          conn.on("end", () => {
            this.removeClient(newClientID);
            this.emit("disconnect", newClientID);
          });
        });
      });

      this.serving = true;
      this.server.listen(port, host, BACKLOG, resolve);
    });
  }

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
      this.ciphers = {};
      this.deciphers = {};

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

      const strData = JSON.stringify(data);
      const bufData = Buffer.from(strData);
      const dataBuffer = Buffer.concat([
        encode_message_size(bufData.length),
        bufData,
      ]);

      for (const clientID of clientIDs) {
        if (clientID in this.clients) {
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

  public isServing(): boolean {
    return this.serving;
  }

  public getAddr(): Address | null {
    if (!this.serving) {
      throw new Error("server is not serving");
    }

    if (this.server !== null) {
      const addr = this.server.address();

      if (addr === null) {
        return null;
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

  public getClientAddr(clientID: number): Address | null {
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
        return null;
      }
    } else {
      throw new Error(`client ${clientID} does not exist`);
    }
  }

  public removeClient(clientID: number): void {
    if (!this.serving) {
      throw new Error("server is not serving");
    }

    if (clientID in this.clients) {
      this.clients[clientID].destroy();
      delete this.clients[clientID];
      delete this.ciphers[clientID];
      delete this.deciphers[clientID];
    } else {
      throw new Error(`client ${clientID} does not exist`);
    }
  }

  private onData(clientID: number, dataBuffer: Buffer): void {
    // TODO: parse data received
    const data = JSON.parse(dataBuffer.toString());
    this.emit("recv", clientID, data);
  }

  private async exchangeKeys(
    clientID: number,
    conn: net.Socket
  ): Promise<void> {
    // return new Promise((resolve, reject) => {
    //   console.log("BEGINNING KEY EXCHANGE");
    //   newRSAKeys().then(({ publicKey, privateKey }) => {
    //     conn.write(publicKey.toString(), (err) => {
    //       console.log("WROTE PUBLIC KEY TO SOCKET");
    //       if (err) {
    //         reject(err);
    //       } else {
    //         conn.once("data", (encryptedCipherData) => {
    //           console.log("SYMMETRIC KEY RECEIVED FROM SOCKET");
    //           const cipherData = crypto.privateDecrypt(
    //             privateKey,
    //             encryptedCipherData
    //           );
    //           const { key, iv } = JSON.parse(cipherData.toString());
    //           const { cipher, decipher } = newAESCipherFromKeyIV(
    //             Buffer.from(key),
    //             Buffer.from(iv)
    //           );
    //           this.ciphers[clientID] = cipher;
    //           this.deciphers[clientID] = decipher;
    //           resolve();
    //         });
    //       }
    //     });
    //   });
    // });
  }
}
