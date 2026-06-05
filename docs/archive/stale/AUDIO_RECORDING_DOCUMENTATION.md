# Apply Modal with Audio Recording - Documentation

## 📁 Files Created

### 1. Audio Recorder Hook
```
/apps/web/src/hooks/useAudioRecorder.ts
```

### 2. Apply Modal Component
```
/apps/web/src/components/job/ApplyModal.tsx
```

### 3. Updated Job Details Page
```
/apps/web/src/app/job-details/[id]/page.tsx
```

---

## 🎯 Features Implemented

### 1. Audio Recording Functionality

#### Browser MediaRecorder API

```typescript
// Request microphone access
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// Create MediaRecorder instance
const mediaRecorder = new MediaRecorder(stream)

// Handle recorded data
mediaRecorder.ondataavailable = (event) => {
  chunks.push(event.data)
}
```

#### Recording Controls

- ✅ **Start Recording** - Click microphone button
- ✅ **Stop Recording** - Click square button
- ✅ **Pause Recording** - Click pause button
- ✅ **Resume Recording** - Click play button
- ✅ **Delete Recording** - Click trash button

#### Features

- Real-time recording timer (MM:SS format)
- Animated waveform visualization during recording
- Audio playback with native browser controls
- Error handling for microphone permissions
- Automatic cleanup on component unmount

---

### 2. Modal Components

#### Header Section
- Title: "Additional Details"
- Subtitle: Instructions for audio/text
- Close button (X icon)

#### Audio Message Section (Optional)
- Microphone button to start recording
- Animated waveform bars (20 bars)
- Recording timer
- Pause/Resume controls
- Stop button
- Delete recorded audio
- Audio player for playback

#### Text Message Section (Optional)
- Multi-line textarea
- Placeholder: "Write here..."
- 6 rows height
- Responsive sizing

#### Action Buttons
- **Close** - Cancel and close modal
- **Apply the Job** - Submit application

---

### 3. Modal Behavior

#### Opening/Closing
- Opens when clicking "Apply" button
- Closes on X button click
- Closes on backdrop click
- Closes on Escape key press
- Closes after successful submission

#### Scroll Lock
- Prevents body scroll when modal is open
- Restores scroll when modal closes

#### Cleanup
- Stops recording if modal closes while recording
- Clears text message
- Deletes audio recording
- Releases microphone access

---

## 🎨 Design Elements

### Modal
- **Width:** Full width with max-w-[640px]
- **Max height:** 90vh with scroll
- **Background:** White with rounded-2xl
- **Shadow:** 2xl for elevation
- **Backdrop:** Black/50 with blur

### Audio Recorder
- **Background:** #f0f9fc (light blue)
- **Border:** #d0e8f0
- **Rounded:** lg
- **Padding:** 16px → 20px

### Buttons
- **Microphone:** Primary blue circular
- **Stop:** Red square/circular
- **Pause:** Dark gray
- **Play:** Dark gray
- **Delete:** Red rectangular
- **Submit:** Primary blue

### Colors
- **Primary:** #5cc2ed
- **Red:** #ef4444
- **Gray:** #374151
- **Background Blue:** #f0f9fc

---

## 🎤 Audio Recording API Usage

### Browser Compatibility

The audio recording uses standard Web APIs:

```typescript
// MediaRecorder API
navigator.mediaDevices.getUserMedia({ audio: true })
new MediaRecorder(stream)
```

#### Supported Browsers
- ✅ Chrome 49+
- ✅ Firefox 25+
- ✅ Safari 14.1+
- ✅ Edge 79+
- ✅ Opera 36+

#### Mobile Support
- ✅ iOS Safari 14.5+
- ✅ Chrome Android
- ✅ Firefox Android

---

### How It Works

#### 1. Request Permissions
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: true 
})
```
- Browser shows permission prompt
- User grants/denies microphone access
- Stream contains audio track

#### 2. Create MediaRecorder
```typescript
const mediaRecorder = new MediaRecorder(stream)
mediaRecorder.start() // Start recording
```

#### 3. Collect Audio Data
```typescript
mediaRecorder.ondataavailable = (event) => {
  chunks.push(event.data) // Collect audio chunks
}
```

#### 4. Stop and Create Blob
```typescript
mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' })
  const url = URL.createObjectURL(blob)
}
```

#### 5. Playback
```tsx
<audio src={url} controls />
```

---

## 📱 Responsive Design

### Mobile (< 640px)

```css
Modal:
- Padding: 24px
- Buttons: Stacked vertically
- Mic button: 40px
- Text: text-sm

Audio Controls:
- Compact layout
- Smaller buttons
- Waveform: 20 bars, narrow
```

### Tablet (640px - 1024px)

```css
Modal:
- Padding: 32px
- Buttons: Inline

Audio Controls:
- Standard size
- Better spacing
```

### Desktop (≥ 1024px)

```css
Modal:
- Padding: 40px
- Max width: 640px
- Centered

Audio Controls:
- Full size: 48px buttons
- Optimal spacing
```

---

## ⚡ Interactive Features

### Recording States

#### Idle State
- Blue mic button
- Static gray waveform
- "00:00" timer

#### Recording State
- Red stop button
- Animated waveform (pulse effect)
- Active timer counting up
- Pause button visible

#### Paused State
- Red stop button
- Frozen waveform at last state
- Paused timer
- Play button to resume

#### Recorded State
- Audio player visible
- Delete button to remove
- Can play/pause audio

---

### Visual Feedback

#### Waveform Animation

```tsx
{[...Array(20)].map((_, i) => (
  <div
    className={`animate-pulse ${isRecording ? 'h-random' : 'h-[10px]'}`}
    style={{ animationDelay: `${i * 0.1}s` }}
  />
))}
```

#### Timer Display

```typescript
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
```

---

## 🔧 Custom Hook: useAudioRecorder

### API

```typescript
const {
  isRecording,      // boolean - Is currently recording
  isPaused,         // boolean - Is recording paused
  recordingTime,    // number - Seconds recorded
  audioURL,         // string | null - Playback URL
  audioBlob,        // Blob | null - Audio data
  startRecording,   // () => Promise<void>
  stopRecording,    // () => void
  pauseRecording,   // () => void
  resumeRecording,  // () => void
  deleteRecording,  // () => void
  error             // string | null - Error message
} = useAudioRecorder()
```

### Error Handling

```typescript
try {
  await startRecording()
} catch (error) {
  // User denied microphone access
  // or microphone not available
  setError('Failed to access microphone')
}
```

---

## 💾 Data Submission

### Application Data Structure

```typescript
{
  jobTitle: string,
  companyName: string,
  textMessage: string,
  audioBlob: Blob | null,
  timestamp: string // ISO format
}
```

### Backend Integration

```typescript
// Convert audio blob to form data
const formData = new FormData()
formData.append('audioMessage', audioBlob, 'audio.webm')
formData.append('textMessage', textMessage)
formData.append('jobId', jobId)

// Send to API
await fetch('/api/applications', {
  method: 'POST',
  body: formData
})
```

---

## 🎯 Usage Flow

### User Journey

```
Job Details Page
    ↓ [Click "Apply" button]
    ↓
Apply Modal Opens
    ↓ [User records audio OR writes text OR both]
    ↓ [Can pause, resume, delete recording]
    ↓ [Click "Apply the Job"]
    ↓
Application Submitted
    ↓
Modal Closes
    ↓
Success Message
```

---

## ✨ Key Features

- ✅ **Full audio recording** with MediaRecorder API
- ✅ **Pause/Resume** functionality
- ✅ **Real-time timer** display
- ✅ **Animated waveform** visualization
- ✅ **Audio playback** with browser controls
- ✅ **Delete recording** option
- ✅ **Text message** as alternative/addition
- ✅ **Responsive design** (mobile → desktop)
- ✅ **Keyboard shortcuts** (Escape to close)
- ✅ **Backdrop click** to close
- ✅ **Scroll lock** when open
- ✅ **Error handling** for permissions
- ✅ **Automatic cleanup** on unmount
- ✅ **Browser compatibility** checks

---

## 🚀 Browser Permissions

### First Time Use

1. User clicks "Apply"
2. Modal opens
3. User clicks microphone button
4. Browser shows permission prompt:
   ```
   "Allow example.com to use your microphone?"
   [Block] [Allow]
   ```
5. User clicks "Allow"
6. Recording starts

### After Permission Granted
- Recording starts immediately
- No further prompts needed
- Permission persists for the domain

### If Permission Denied
- Error message shown: "Failed to access microphone"
- User can still use text message
- User can change permissions in browser settings

---

## 🎨 Audio Format

### Recorded Format
- **Type:** `audio/webm` (WebM container)
- **Codec:** Opus (typically)
- **Sample rate:** 48kHz (browser default)
- **Channels:** 1 (mono) or 2 (stereo)

### File Size
- ~1 MB per minute (approximate)
- Compressed format
- Good quality for voice

---

## 📋 Testing Checklist

- ✅ Microphone permission request
- ✅ Start recording
- ✅ Pause recording
- ✅ Resume recording
- ✅ Stop recording
- ✅ Play recorded audio
- ✅ Delete recorded audio
- ✅ Submit with audio only
- ✅ Submit with text only
- ✅ Submit with both
- ✅ Close modal (X button)
- ✅ Close modal (backdrop click)
- ✅ Close modal (Escape key)
- ✅ Close while recording (stops recording)
- ✅ Responsive on mobile
- ✅ Responsive on tablet
- ✅ Responsive on desktop

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Microphone Permission Denied
**Problem:** User clicks record but nothing happens
**Solution:**
- Check browser permissions
- Look for blocked icon in address bar
- Guide user to Settings → Privacy → Microphone

#### 2. No Audio in Recording
**Problem:** Recording completes but no sound
**Solution:**
- Check if microphone is muted
- Verify correct input device selected
- Test with other apps (e.g., voice recorder)

#### 3. Waveform Not Animating
**Problem:** Waveform stays static during recording
**Solution:**
- Verify `isRecording` state is true
- Check CSS animations are enabled
- Ensure `animate-pulse` class is applied

#### 4. Audio Not Playing Back
**Problem:** Audio player shows but no playback
**Solution:**
- Verify audioURL is set correctly
- Check browser console for errors
- Ensure Blob was created successfully

---

## 🔐 Security Considerations

### Microphone Access
- Always request permission before accessing microphone
- Clearly explain why audio is needed
- Provide text alternative for users who decline

### Data Privacy
- Audio recordings contain sensitive data
- Always use HTTPS in production
- Encrypt audio files during transmission
- Store securely on backend
- Delete after processing (optional)
- Comply with GDPR/privacy laws

### Best Practices
```typescript
// Always check for permission status
if (navigator.permissions) {
  const result = await navigator.permissions.query({ name: 'microphone' })
  if (result.state === 'denied') {
    // Show alternative input method
  }
}

// Always cleanup resources
useEffect(() => {
  return () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  }
}, [])
```

---

## 📚 Additional Resources

### Web APIs Documentation
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Browser Support
- [Can I Use - MediaRecorder](https://caniuse.com/mediarecorder)
- [Can I Use - getUserMedia](https://caniuse.com/stream)

### Audio Processing
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API)
- [Audio Formats on the Web](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs)

---

## 🎓 Learning Resources

### Implementing Audio Recording in React
```typescript
// Basic pattern for audio recording
const [isRecording, setIsRecording] = useState(false)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)
  mediaRecorderRef.current = mediaRecorder
  
  mediaRecorder.ondataavailable = (event) => {
    // Handle audio chunks
  }
  
  mediaRecorder.start()
  setIsRecording(true)
}
```

### Visualizing Audio
```typescript
// Create audio context for visualization
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
const source = audioContext.createMediaStreamSource(stream)
source.connect(analyser)

// Get frequency data for waveform
const dataArray = new Uint8Array(analyser.frequencyBinCount)
analyser.getByteFrequencyData(dataArray)
```

---

## 💡 Future Enhancements

### Potential Features
- [ ] Audio visualization (real waveform)
- [ ] Multiple audio recordings
- [ ] Audio editing (trim, cut)
- [ ] Noise cancellation
- [ ] Audio compression options
- [ ] File format selection
- [ ] Transcription service integration
- [ ] Audio quality settings
- [ ] Multiple language support for voice
- [ ] Voice activity detection

### Code Examples

#### Audio Compression
```typescript
// Compress audio before upload
const compressAudio = async (blob: Blob) => {
  const audioContext = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  // Reduce sample rate or channels
  // Re-encode at lower bitrate
  
  return compressedBlob
}
```

#### Transcription Integration
```typescript
// Send audio to transcription service
const transcribeAudio = async (audioBlob: Blob) => {
  const formData = new FormData()
  formData.append('audio', audioBlob)
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData
  })
  
  const { transcript } = await response.json()
  return transcript
}
```

---

## 🤝 Contributing

If you'd like to enhance the audio recording functionality:

1. Test thoroughly across browsers
2. Ensure mobile compatibility
3. Add error handling
4. Update documentation
5. Consider accessibility
6. Add unit tests

---

## 📄 License

This implementation uses standard Web APIs and is compatible with any project license.

---

## 🆘 Support

For issues or questions:
1. Check browser console for errors
2. Verify microphone permissions
3. Test in different browsers
4. Review this documentation
5. Contact development team

---

**Last Updated:** 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
