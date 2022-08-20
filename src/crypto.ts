import * as crypto from "crypto";

/**
 * The size in bytes of AES keys.
 */
export const KEY_SIZE = 32;

/**
 * The size in bytes of AES IVs.
 */
export const IV_SIZE = 16;

/**
 * An RSA key pair.
 */
export interface RSAKeys {
    /**
     * The RSA public key.
     */
    publicKey: string | Buffer | crypto.KeyObject;

    /**
     * The RSA private key.
     */
    privateKey: string | Buffer | crypto.KeyObject;
}

/**
 * Generate a pair of RSA keys.
 *
 * @param length The size of the key.
 * @returns The generated RSA key pair.
 */
export async function newRSAKeys(length: number = 4096): Promise<RSAKeys> {
    return new Promise((resolve, reject) => {
        const rsaOptions = {
            modulusLength: length,
            publicKeyEncoding: {
                type: "spki",
                format: "pem",
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem",
                cipher: "aes-256-cbc",
                passphrase: "",
            },
        };

        crypto.generateKeyPair("rsa", rsaOptions, (err, publicKey, privateKey) => {
            if (err) {
                reject(err);
            } else {
                resolve({publicKey, privateKey});
            }
        });
    });
}

/**
 * Encrypt data with RSA.
 *
 * @param publicKey The RSA public key.
 * @param plaintext The data to encrypt.
 * @returns The encrypted data.
 */
export function rsaEncrypt(
    publicKey: string | Buffer | crypto.KeyObject,
    plaintext: Buffer
): Buffer {
    return crypto.publicEncrypt(publicKey, plaintext);
}

/**
 * Decrypt data with RSA.
 *
 * @param privateKey The RSA private key.
 * @param ciphertext The data to decrypt.
 * @returns The decrypted data.
 */
export function rsaDecrypt(
    privateKey: string | Buffer | crypto.KeyObject,
    ciphertext: Buffer
): Buffer {
    return crypto.privateDecrypt(
        {
            key: privateKey,
            passphrase: "",
        },
        ciphertext
    );
}

/**
 * Generate a new AES key.
 *
 * @returns The generated AES key.
 */
export function newAESKey(): Buffer {
    return crypto.randomBytes(KEY_SIZE);
}

/**
 * Encrypt data with AES.
 *
 * @param key The AES key.
 * @param plaintext The data to encrypt.
 * @returns The encrypted data.
 */
export function aesEncrypt(key: Buffer, plaintext: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_SIZE);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const ciphertext = cipher.update(plaintext);
    return Buffer.concat([iv, ciphertext, cipher.final()]);
}

/**
 * Decrypt data with AES.
 *
 * @param key The AES key.
 * @param ciphertextWithIV The data to decrypt.
 * @returns The decrypted data.
 */
export function aesDecrypt(key: Buffer, ciphertextWithIV: Buffer): Buffer {
    const iv = ciphertextWithIV.slice(0, IV_SIZE);
    const ciphertext = ciphertextWithIV.slice(IV_SIZE);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const plaintext = decipher.update(ciphertext);
    return Buffer.concat([plaintext, decipher.final()]);
}
