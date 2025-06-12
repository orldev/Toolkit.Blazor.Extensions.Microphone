class PCMPlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Jitter buffer configuration
        this.jitterBuffer = [];
        this.currentBuffer = null;
        this.readPtr = 0;
        this.lastChunkHash = null;
        this.underrunCount = 0;
        this.targetBufferSize = 3; // Target 3 chunks (~300-900ms buffer)
        this.sampleRate = 48000;
        this.isJitterBufferEmpty = false;
        
        // Smoothing filter for underruns
        this.lastSample = 0;

        this.port.onmessage = (e) => {
            // Create hash of incoming chunk to detect duplicates
            const chunkHash = this._createHash(e.data);
            if (chunkHash === this.lastChunkHash) {
                return; // Skip duplicate chunk
            }
            this.lastChunkHash = chunkHash;

            // Convert and store the new chunk
            const int16Data = new Int16Array(e.data);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 32767;
            }

            this.jitterBuffer.push({
                data: float32Data,
                timestamp: currentTime
            });
            this.isJitterBufferEmpty = false;
            
            // Maintain optimal buffer size
            this._optimizeBuffer();
        };
    }

    _createHash(buffer) {
        // Simple hash for duplicate detection (FNV-1a)
        let hash = 2166136261;
        const view = new Uint8Array(buffer);
        for (let i = 0; i < Math.min(view.length, 100); i++) {
            hash ^= view[i];
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash >>> 0;
    }

    _optimizeBuffer() {
        // Remove chunks older than 1 second
        const now = currentTime;
        this.jitterBuffer = this.jitterBuffer.filter(
            chunk => now - chunk.timestamp < 1.0
        );

        // If buffer is too large, remove oldest chunks
        while (this.jitterBuffer.length > this.targetBufferSize * 2) {
            this.jitterBuffer.shift();
        }
    }

    process(_, outputs) {
        const output = outputs[0];
        const outputLen = output[0].length;

        // Get new buffer if needed
        if ((!this.currentBuffer || this.readPtr >= this.currentBuffer.length) &&
            this.jitterBuffer.length > 0) {
            this.currentBuffer = this.jitterBuffer.shift().data;
            this.readPtr = 0;
        }

        // Process output frames
        for (let i = 0; i < outputLen; i++) {
            if (this.currentBuffer && this.readPtr < this.currentBuffer.length) {
                // Normal playback
                const sample = this.currentBuffer[this.readPtr++];
                this.lastSample = sample;

                for (let channel = 0; channel < output.length; channel++) {
                    output[channel][i] = sample;
                }
            } else {
                // Underrun handling
                this.underrunCount++;

                // Apply gentle fade-out using last good sample
                this.lastSample *= 0.97;
                for (let channel = 0; channel < output.length; channel++) {
                    output[channel][i] = this.lastSample;
                }

                // Request more data if buffer is empty
                if (this.jitterBuffer.length === 0 && this.isJitterBufferEmpty === false) {
                    this.port.postMessage({ type: 'bufferUnderrun' });
                    this.isJitterBufferEmpty = true;
                }
            }
        }

        // Dynamic buffer sizing based on network conditions
        if (this.underrunCount > 2) {
            this.targetBufferSize = Math.min(10, this.targetBufferSize + 1);
        } else if (this.underrunCount === 0 && this.targetBufferSize > 3) {
            this.targetBufferSize--;
        }

        return true;
    }
}

registerProcessor('pcm-playback', PCMPlaybackProcessor);
