/**
 * Audio playback manager that uses Web Audio API with AudioWorklet for PCM playback.
 * @module AudioPlaybackManager
 * @example
 * const audioManager = create();
 * await audioManager.start();
 * audioManager.enqueueChunk(pcmData);
 * await audioManager.stop();
 */
export function create() {
    let context = null;
    let playbackNode = null;

    /**
     * Disposes of all audio resources and cleans up.
     * @async
     * @private
     */
    async function dispose() {
        if (context) {
            // 1. Disconnect all audio nodes first
            if (playbackNode) {
                playbackNode.disconnect();
                playbackNode.port.onmessage = null; // Remove message handler
                playbackNode = null;
            }

            // 2. Close the AudioContext
            try {
                // Safari requires special handling
                if (context && typeof context.close === 'function') {
                    await context.close();
                } else if (context && context.suspend === 'function') {
                    await context.suspend();
                }
            } catch (error) {
                console.error('Error closing AudioContext:', error);
            }
            context = null;
        }
    }

    return {
        /**
         * Initializes the audio playback system.
         * Creates an AudioContext and loads the AudioWorklet processor.
         * @async
         * @throws {Error} If the AudioWorklet module fails to load
         */
        async start() {
            if (context) return;
            context = new AudioContext({ sampleRate: 48000 });
            await context.audioWorklet.addModule('./_content/Snail.Toolkit.Blazor.Extensions.Microphone/audio-worklet-playback-processor.js');

            playbackNode = new AudioWorkletNode(context, 'pcm-playback');
            playbackNode.connect(context.destination);
        },

        /**
         * Enqueues a chunk of PCM audio data for playback.
         * The data should be in 16-bit little-endian PCM format.
         * @param {Uint8Array} pcmBytes - The raw PCM audio data bytes
         */
        enqueueChunk(pcmBytes) {
            if (playbackNode) {
                const buffer = new Int16Array(pcmBytes.length / 2);
                const view = new DataView(Uint8Array.from(pcmBytes).buffer);
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = view.getInt16(i * 2, true); // little-endian
                }
                playbackNode.port.postMessage(buffer);
            }
        },

        /**
         * Stops playback and cleans up all audio resources.
         * @async
         */
        async stop() {
            await dispose();
        }
    }
}