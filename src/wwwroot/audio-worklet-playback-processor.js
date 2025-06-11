class PCMPlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 32KB chunk = 16384 Int16 samples (since 32KB = 32768 bytes ÷ 2 bytes per Int16)
        this.BUFFER_SIZE = 16384; // Matches 32KB input chunks

        // Double-buffer setup (front for reading, back for writing)
        this.frontBuffer = new Float32Array(this.BUFFER_SIZE); // Active read buffer
        this.backBuffer = new Float32Array(this.BUFFER_SIZE);  // Background write buffer
        this.readPtr = 0; // Only need to track read position
        this.writePtr = 0;
        this.underrunCount = 0;

        this.port.onmessage = (e) => {
            const int16Data = new Int16Array(e.data);
            // Ensure back buffer is large enough
            if (this.backBuffer.length < int16Data.length) {
                this.backBuffer = new Float32Array(int16Data.length);
            }
            // Convert and copy all received samples
            for (let i = 0; i < int16Data.length; i++) {
                this.backBuffer[i] = int16Data[i] / 32767;
            }
            // Swap buffers
            [this.frontBuffer, this.backBuffer] = [this.backBuffer, this.frontBuffer];
            this.readPtr = 0; // Reset read position after swap
        };
    }

    process(_, outputs) {
        const output = outputs[0]; // Get first output bus
        const outputLen = output[0].length; // Length of first channel

        for (let i = 0; i < outputLen; i++) {
            if (this.readPtr < this.frontBuffer.length) {
                // Handle mono/stereo dynamically
                output[0][i] = this.frontBuffer[this.readPtr]; // Write to left channel

                // Only write to right channel if it exists
                if (output.length > 1) {
                    output[1][i] = this.frontBuffer[this.readPtr]; // Copy to right channel
                }

                this.readPtr++;
            } else {
                // Underrun: fade-out both channels if they exist
                output[0][i] *= 0.95;
                if (output.length > 1) output[1][i] *= 0.95;
                this.underrunCount++;
            }
        }
        return true;
    }
}

registerProcessor('pcm-playback', PCMPlaybackProcessor);
