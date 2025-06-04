class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const channel = input[0];
            const pcm = new Int16Array(channel.length);
            for (let i = 0; i < channel.length; i++) {
                pcm[i] = Math.max(-1, Math.min(1, channel[i])) * 32767; // 32767 = 2^15 - 1 (16-bit signed max)
            }
            this.port.postMessage(pcm.buffer, [pcm.buffer]);
        }
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);