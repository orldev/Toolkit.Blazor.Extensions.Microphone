class PCMPlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array(48000 * 2); // 2 sec buffer
        this.writePtr = 0;
        this.readPtr = 0;
        this.available = 0;

        this.port.onmessage = (e) => {
            const int16 = new Int16Array(e.data);
            for (let i = 0; i < int16.length; i++) {
                const sample = int16[i] / 32767;
                if (this.available < this.buffer.length) {
                    this.buffer[this.writePtr] = sample;
                    this.writePtr = (this.writePtr + 1) % this.buffer.length;
                    this.available++;
                }
            }
        };
    }

    process(_, outputs) {
        const output = outputs[0][0];
        for (let i = 0; i < output.length; i++) {
            if (this.available > 0) {
                output[i] = this.buffer[this.readPtr];
                this.readPtr = (this.readPtr + 1) % this.buffer.length;
                this.available--;
            } else {
                output[i] = 0.0; // underrun = silence
            }
        }
        return true;
    }
}

registerProcessor('pcm-playback', PCMPlaybackProcessor);
