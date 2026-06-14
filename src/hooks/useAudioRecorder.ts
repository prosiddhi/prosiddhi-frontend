import { useState, useRef, useEffect } from 'react'

// Application voice cover-letter cap (Q10, revised 2026-05-09): 2 minutes,
// standard across web + mobile. The recorder hard-stops here client-side; the
// BE re-measures with ffprobe and rejects anything over 120s as a backstop.
export const MAX_RECORDING_SECONDS = 120

// MIME types the BE accepts for apply + chat audio (exact match, no codecs suffix).
const ALLOWED_AUDIO_MIMES = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/opus']

/** File extension to pair with a recorded-audio MIME so the upload name is sane. */
export function audioExtForMime(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg'
  return 'webm'
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  maxDuration: number
  audioURL: string | null
  audioBlob: Blob | null
  /** Clean base MIME of the recorded blob (in the BE allowlist), e.g. 'audio/webm' | 'audio/mp4'. */
  audioMimeType: string
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  deleteRecording: () => void
  error: string | null
}

export function useAudioRecorder(maxSeconds: number = MAX_RECORDING_SECONDS): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Clean up function
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Derive a clean base MIME from the recorder (strip the ";codecs=..." suffix
        // so it exactly matches the BE allowlist). Falls back to webm for anything
        // unexpected. Fixes Safari (audio/mp4) being mislabeled as webm.
        const base = (mediaRecorderRef.current?.mimeType || '').split(';')[0].trim()
        const type = ALLOWED_AUDIO_MIMES.includes(base) ? base : 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
        setAudioBlob(blob)
        setAudioMimeType(type)
        cleanup()
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err: unknown) {
      setError(`Failed to access microphone: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
  }

  // Delete recording
  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
    }
    setAudioURL(null)
    setAudioBlob(null)
    setAudioMimeType('audio/webm')
    setRecordingTime(0)
    chunksRef.current = []
  }

  // Hard stop at the 2-minute cap (Q10). Auto-stops while actively recording so
  // the seeker can never exceed the cap, which the BE would otherwise reject.
  useEffect(() => {
    if (isRecording && !isPaused && recordingTime >= maxSeconds) {
      stopRecording()
    }
    // stopRecording is stable enough for this guard; re-running on time tick is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingTime, isRecording, isPaused, maxSeconds])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
    }
  }, [audioURL])

  return {
    isRecording,
    isPaused,
    recordingTime,
    maxDuration: maxSeconds,
    audioURL,
    audioBlob,
    audioMimeType,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    error
  }
}
