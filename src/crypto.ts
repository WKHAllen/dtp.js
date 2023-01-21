import * as crypto from "crypto";

/**
 * The size in bytes of an RSA key.
 */
export const RSA_KEY_SIZE = 4096;

/**
 * The size in bytes of an AES key.
 */
export const AES_KEY_SIZE = 32;

/**
 * The size in bytes of an AES nonce.
 */
export const AES_NONCE_SIZE = 16;

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
export async function newRSAKeys(length: number = RSA_KEY_SIZE): Promise<RSAKeys> {
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
    return crypto.randomBytes(AES_KEY_SIZE);
}

/**
 * Encrypt data with AES.
 *
 * @param key The AES key.
 * @param plaintext The data to encrypt.
 * @returns The encrypted data.
 */
export function aesEncrypt(key: Buffer, plaintext: Buffer): Buffer {
    const nonce = crypto.randomBytes(AES_NONCE_SIZE);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, nonce);
    const ciphertext = cipher.update(plaintext);
    return Buffer.concat([nonce, ciphertext, cipher.final()]);
}

/**
 * Decrypt data with AES.
 *
 * @param key The AES key.
 * @param ciphertextWithNonce The data to decrypt.
 * @returns The decrypted data.
 */
export function aesDecrypt(key: Buffer, ciphertextWithNonce: Buffer): Buffer {
    const nonce = ciphertextWithNonce.slice(0, AES_NONCE_SIZE);
    const ciphertext = ciphertextWithNonce.slice(AES_NONCE_SIZE);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, nonce);
    const plaintext = decipher.update(ciphertext);
    return Buffer.concat([plaintext, decipher.final()]);
}
