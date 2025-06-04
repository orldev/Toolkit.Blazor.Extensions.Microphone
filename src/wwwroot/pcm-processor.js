/**
 * Microphone capture manager that uses Web Audio API with AudioWorklet for PCM processing.
 * Captures audio from the microphone and sends chunks to a .NET handler.
 * @module MicrophoneCaptureManager
 * @param {object} dotNetRef - Reference to the .NET instance for callback handling
 * @example
 * const microphoneManager = create(dotNetReference);
 * await microphoneManager.start();
 * // Audio chunks will be sent to .NET via OnPcmChunk
 * await microphoneManager.stop();
 */
export function create(dotNetRef) {
    let context = null;
    let processorNode = null;
    let stream = null;
    let chunkBuffer = new Uint8Array(0);
    const TARGET_SIZE = 32768; // 64KB chunks (32KB for 16-bit samples)

    /**
     * Disposes of all audio resources and cleans up.
     * @async
     * @private
     */
    async function dispose() {
        if (context) {
            // 1. Disconnect all audio nodes first
            if (processorNode) {
                processorNode.disconnect();
                processorNode.port.onmessage = null; // Remove message handler
                processorNode = null;
            }

            // 2. Stop all media tracks
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }

            // 3. Close the AudioContext
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
         * Initializes the microphone capture system.
         * Requests microphone permission, creates AudioContext, and sets up processing pipeline.
         * @async
         * @throws {Error} If microphone access is denied or AudioWorklet fails to load
         */
        async start() {
            try {
                if (context) return;

                // 1. Get microphone stream
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // 2. Set up audio processing
                context = new AudioContext({ sampleRate: 48000 });
                await context.audioWorklet.addModule(
                    './_content/Snail.Toolkit.Blazor.Extensions.Microphone/audio-worklet-processor.js'
                );

                // 3. Create processor node with chunk buffering
                processorNode = new AudioWorkletNode(context, 'pcm-processor');
                processorNode.port.onmessage = async (e) => {
                    const pcmBytes = new Uint8Array(e.data);
                    const newBuffer = new Uint8Array(chunkBuffer.length + pcmBytes.length);
                    newBuffer.set(chunkBuffer);
                    newBuffer.set(pcmBytes, chunkBuffer.length);
                    chunkBuffer = newBuffer;

                    // Send chunk to .NET when target size reached
                    if (chunkBuffer.length >= TARGET_SIZE) {
                        try {
                            await dotNetRef.invokeMethodAsync('OnPcmChunk', chunkBuffer);
                        } catch (e) {
                            console.error("Error invoking .NET method:", e);
                        }
                        chunkBuffer = new Uint8Array(0); // Reset buffer
                    }
                };

                // 4. Connect audio pipeline
                const source = context.createMediaStreamSource(stream);
                source.connect(processorNode);
            } catch (e) {
                await dispose();
                console.error("Microphone initialization failed:", e);
                throw e; // Re-throw for caller handling
            }
        },

        /**
         * Stops microphone capture and cleans up all resources.
         * @async
         */
        async stop() {
            await dispose();
        }
    };
}