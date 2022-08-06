/// <reference types="node" />
/// <reference types="node" />
import * as crypto from "crypto";
export declare const BACKLOG = 16;
export declare const DEFAULT_HOST = "0.0.0.0";
export declare const DEFAULT_PORT = 29275;
export interface Address {
    host: string;
    port: number;
}
interface RSAKeys {
    publicKey: string | Buffer | crypto.KeyObject;
    privateKey: string | Buffer | crypto.KeyObject;
}
interface AESCipher {
    key: Buffer;
    iv: Buffer;
    cipher: crypto.Cipher;
    decipher: crypto.Decipher;
}
interface AESCipherDecipher {
    cipher: crypto.Cipher;
    decipher: crypto.Decipher;
}
export declare function newRSAKeys(length?: number): Promise<RSAKeys>;
export declare function newAESCipher(): AESCipher;
export declare function newAESCipherFromKeyIV(key: Buffer, iv: Buffer): AESCipherDecipher;
export {};
