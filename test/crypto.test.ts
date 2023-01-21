import {aesDecrypt, aesEncrypt, newAESKey, newRSAKeys, rsaDecrypt, rsaEncrypt} from "../src/crypto";

/**
 * Test RSA keygen, encryption, and decryption.
 */
test("test RSA", async () => {
    const message = "Hello, RSA!";

    const {publicKey, privateKey} = await newRSAKeys();
    const encrypted = rsaEncrypt(publicKey, Buffer.from(message));
    const decrypted = rsaDecrypt(privateKey, encrypted);
    const decryptedMessage = decrypted.toString();

    expect(decryptedMessage).toBe(message);
    expect(encrypted.toString()).not.toBe(message);
});

/**
 * Test AES keygen, encryption, and decryption.
 */
test("test AES", () => {
    const message = "Hello, AES!";

    const key = newAESKey();
    const encrypted = aesEncrypt(key, Buffer.from(message));
    const decrypted = aesDecrypt(key, encrypted);
    const decryptedMessage = decrypted.toString();

    expect(decryptedMessage).toBe(message);
    expect(encrypted.toString()).not.toBe(message);
});

/**
 * Test encrypting/decrypting AES key with RSA.
 */
test("test encrypting AES key with RSA", async () => {
    const {publicKey, privateKey} = await newRSAKeys();
    const key = newAESKey();

    const encryptedKey = rsaEncrypt(publicKey, key);
    const decryptedKey = rsaDecrypt(privateKey, encryptedKey);

    expect(decryptedKey.toString()).toBe(key.toString());
    expect(encryptedKey.toString()).not.toBe(key.toString());
});
