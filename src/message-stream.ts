import {decodeMessageSize, LEN_SIZE} from "./util";

/**
 * A stream of messages from a socket.
 */
export class MessageStream {
    /**
     * The currently unprocessed, incomplete message.
     */
    private message: Buffer = Buffer.from("");

    /**
     * The expected length of the current message.
     */
    private messageLength: number = 0;

    /**
     * Read messages from the stream.
     *
     * @param messageSegment The next segment of the message.
     * @returns All recent, fully-processed messages.
     */
    public received(messageSegment?: Buffer): Buffer[] {
        if (messageSegment !== undefined) {
            if (this.message.length === 0) {
                this.messageLength = decodeMessageSize(
                    messageSegment.slice(0, LEN_SIZE)
                );
                this.message = messageSegment.slice(LEN_SIZE);
            } else {
                this.message = Buffer.concat([this.message, messageSegment]);
            }
        }

        if (
            this.message.length > 0 &&
            this.messageLength > 0 &&
            this.message.length >= this.messageLength
        ) {
            const msg = this.message.slice(0, this.messageLength);
            const nextMessage = this.message.slice(this.messageLength);

            if (nextMessage.length >= LEN_SIZE) {
                this.messageLength = decodeMessageSize(nextMessage.slice(0, LEN_SIZE));
                this.message = nextMessage.slice(LEN_SIZE);

                return [msg, ...this.received()];
            } else if (nextMessage.length === 0) {
                this.messageLength = 0;
                this.message = Buffer.from("");

                return [msg];
            } else {
                throw new Error("message segment incomplete");
            }
        } else {
            return [];
        }
    }
}
