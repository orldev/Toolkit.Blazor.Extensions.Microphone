# Toolkit.Blazor.Extensions.Microphone

A comprehensive audio handling extension for Blazor applications, providing easy-to-use components for microphone capture and audio playback.

## Installation

```bash
dotnet add package Snail.Toolkit.Blazor.Extensions.Microphone
```

## Features

- **Microphone Capture**: Access device microphone with simple API
- **Audio Playback**: Stream PCM audio data to browser
- **Reactive Streams**: Observable-based audio data handling
- **Flexible Buffering**: Choose between streamed or complete audio capture
- **Cross-Platform**: Works in all modern browsers supporting Web Audio API

## Basic Usage

### Microphone Capture Component

```razor
<TMicrophone @ref="microphone" 
             StreamBytes="HandleAudioStream"
             Enable="@isRecording">
    <button @onclick="ToggleRecording">
        @(isRecording ? "Stop" : "Start") Recording
    </button>
</TMicrophone>

@code {
    private TMicrophone? microphone;
    private bool isRecording;
    
    private void HandleAudioStream(IObservable<byte[]> audioStream)
    {
        audioStream.Subscribe(chunk => {
            // Process audio chunks in real-time
        });
    }
    
    private async Task ToggleRecording()
    {
        isRecording = !isRecording;
        await microphone?.Process();
    }
}
```

### Audio Playback Component

```razor
<TAudioPlayback Bytes="@audioData" AutoPlay="true"/>

@code {
    private byte[] audioData = /* your PCM audio data */;
}
```

## Advanced Usage

### Complete Audio Capture with Buffer

```razor
<TMicrophone Bytes="HandleCompleteRecording" 
             Enable="@isRecording">
    <!-- Custom UI with recording indicator -->
    <div class="@(isRecording ? "recording" : "")">
        <span>@duration.ToString(@"mm\:ss")</span>
    </div>
</TMicrophone>

@code {
    private TimeSpan duration;
    private bool isRecording;
    
    private async Task HandleCompleteRecording(byte[] completeAudio)
    {
        // Process full audio recording
        duration = CalculateAudioDuration(completeAudio);
    }
}
```

### Custom Audio Processing Pipeline

```razor
<TMicrophone @ref="microphone" 
             StreamBytes="ConfigureProcessing">
    <!-- Custom controls -->
</TMicrophone>

@code {
    private TMicrophone? microphone;
    
    private void ConfigureProcessing(IObservable<byte[]> audioStream)
    {
        audioStream
            .Buffer(TimeSpan.FromMilliseconds(500))
            .Subscribe(bufferedChunks => {
                // Process buffered audio
            });
    }
}
```

## Component API Reference

### TMicrophone

| Property | Type | Description |
|----------|------|-------------|
| StreamBytes | EventCallback<IObservable<byte[]>> | Callback providing audio data stream |
| Bytes | EventCallback<byte[]> | Callback for complete audio buffer |
| Enable | bool | Controls microphone state |
| ChildContent | RenderFragment<(EventCallback, bool)> | Template with (toggle callback, current state) |

### TAudioPlayback

| Property | Type | Description |
|----------|------|-------------|
| StreamBytes | IObservable<byte[]> | Observable stream of audio data |
| Bytes | byte[] | Complete audio data for playback |
| AutoPlay | bool | Automatically start playback |
| ChildContent | RenderFragment<(EventCallback, bool)> | Template with playback controls |

## Best Practices

1. **Audio Formats**: Use 16-bit PCM @ 48kHz for best compatibility
2. **Memory Management**:
    - Dispose components properly
    - Use streaming for long recordings
3. **Permissions**: Handle microphone permission prompts gracefully
4. **Error Handling**: Implement error callbacks for device access issues

## Browser Support

Requires browsers with:
- Web Audio API support
- MediaDevices.getUserMedia() support
- ES6 modules

## License

Toolkit.Blazor.Extensions.Microphone is a free and open source project, released under the permissible [MIT license](LICENSE).