/**
 * The length of the size portion of each message.
 */
export const LEN_SIZE = 5;

/**
 * The server backlog.
 */
export const BACKLOG = 16;

/**
 * The default server host address.
 */
export const DEFAULT_SERVER_HOST = "0.0.0.0";

/**
 * The default client host address.
 */
export const DEFAULT_CLIENT_HOST = "127.0.0.1";

/**
 * The default port number.
 */
export const DEFAULT_PORT = 29275;

/**
 * A socket address.
 */
export interface Address {
    /**
     * The host address.
     */
    host: string;

    /**
     * The port number.
     */
    port: number;
}

/**
 * Encode the size portion of a message.
 *
 * @param size The size of the message.
 * @returns The encoded message size.
 */
export function encodeMessageSize(size: number): Uint8Array {
    let big_size = BigInt(size);
    const encoded_size = new Uint8Array(LEN_SIZE);

    for (let i = 0; i < LEN_SIZE; i++) {
        encoded_size[LEN_SIZE - i - 1] = Number(big_size % BigInt(256));
        big_size >>= BigInt(8);
    }

    return encoded_size;
}

/**
 * Decode the size portion of a message.
 *
 * @param encodedSize The encoded message size.
 * @returns The size of the message.
 */
export function decodeMessageSize(encodedSize: Uint8Array): number {
    let size = BigInt(0);

    for (let i = 0; i < LEN_SIZE; i++) {
        size <<= BigInt(8);
        size += BigInt(encodedSize[i]);
    }

    return Number(size);
}
