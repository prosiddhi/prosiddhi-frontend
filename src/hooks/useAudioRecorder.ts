import { useState, useRef, useEffect } from 'react'

interface UseAudioRecorderReturn {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  audioURL: string | null
  audioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  deleteRecording: () => void
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
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
      console.log('Starting recording...')
      setError(null)
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser')
      }
      
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted', stream)
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      console.log('MediaRecorder created', mediaRecorder)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('Audio chunk received, size:', event.data.size)
        }
      }

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, creating blob...')
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        console.log('Audio blob created, size:', blob.size)
        setAudioURL(url)
        setAudioBlob(blob)
        cleanup()
      }

      mediaRecorder.start()
      console.log('MediaRecorder started')
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      const errorMessage = `Failed to access microphone: ${err.message || err}`
      setError(errorMessage)
      console.error('Error accessing microphone:', err)
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
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
    setRecordingTime(0)
    chunksRef.current = []
  }

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
    audioURL,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    error
  }
}
