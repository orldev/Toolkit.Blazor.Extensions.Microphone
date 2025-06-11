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
    let audioUnlocked = false;

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
        audioUnlocked = false;
    }

    /**
     * Unlocks the audio context by playing a silent buffer.
     * Required to bypass browser autoplay restrictions.
     * @private
     */
    function unlockAudio() {
        if (audioUnlocked || !context) return;
        
        // Play silent buffer to unlock audio
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        source.onended = () => {
            source.disconnect();
            audioUnlocked = true;
        };
    }
    
    return {
        /**
         * Initializes the audio playback system.
         * Creates an AudioContext and loads the AudioWorklet processor.
         * Implements retry logic for module loading.
         * @async
         * @throws {Error} If the AudioWorklet module fails to load after retries
         * @throws {Error} If the AudioContext cannot be created
         */
        async start() {
            if (context) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext({ sampleRate: 48000 });
            
            let attempts = 0;
            while (attempts < 3) {
                try {
                    await context.audioWorklet.addModule(
                        './_content/Snail.Toolkit.Blazor.Extensions.Microphone/audio-worklet-playback-processor.js');
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts >= 3) throw error;
                    await new Promise(resolve => setTimeout(resolve, 300 * attempts));
                }
            }
            
            playbackNode = new AudioWorkletNode(context, 'pcm-playback');
            playbackNode.connect(context.destination);
        },

        /**
         * Enqueues a chunk of PCM audio data for playback.
         * The data should be in 16-bit little-endian PCM format.
         * Automatically unlocks audio if not already unlocked.
         * @param {Uint8Array} pcmBytes - The raw PCM audio data bytes
         */
        enqueueChunk(pcmBytes) {
            if (playbackNode) {
                if (!audioUnlocked) {
                    unlockAudio();   
                }
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
        },

        /**
         * Manually triggers audio context unlocking.
         * Typically called in response to user interaction to satisfy autoplay policies.
         */
        unlockAudio() {
            unlockAudio();
        }
    }
}