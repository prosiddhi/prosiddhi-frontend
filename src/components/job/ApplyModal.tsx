'use client'

import { useState, useEffect } from 'react'
import { X, Mic, Square, Pause, Play, Trash2 } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

interface ApplyModalProps {
  isOpen: boolean
  onClose: () => void
  jobTitle: string
  companyName: string
}

export function ApplyModal({ isOpen, onClose, jobTitle, companyName }: ApplyModalProps) {
  const [textMessage, setTextMessage] = useState('')
  const {
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
  } = useAudioRecorder()

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle modal close
  const handleClose = () => {
    if (isRecording) {
      stopRecording()
    }
    setTextMessage('')
    deleteRecording()
    onClose()
  }

  // Handle submit
  const handleSubmit = () => {
    // Here you would send the data to your backend
    const applicationData = {
      jobTitle,
      companyName,
      textMessage,
      audioBlob,
      timestamp: new Date().toISOString()
    }
    
    console.log('Application submitted:', applicationData)
    
    // Show success message or navigate
    alert('Application submitted successfully!')
    handleClose()
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Additional Details
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              If you have any additional details to share through audio, please add them below
            </p>
          </div>

          {/* Audio Message Section */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg font-medium text-black mb-3 sm:mb-4">
              Audio Message (Optional)
            </label>

            {/* Audio Recorder */}
            <div className="bg-[#f0f9fc] border border-[#d0e8f0] rounded-lg p-4 sm:p-5">
              {!audioURL ? (
                <>
                  {/* Recording Controls */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Mic Button */}
                    {!isRecording ? (
                      <button
                        onClick={async () => {
                          console.log('Microphone button clicked')
                          try {
                            await startRecording()
                            console.log('Recording started successfully')
                          } catch (error) {
                            console.error('Failed to start recording:', error)
                          }
                        }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-50 rounded-full flex items-center justify-center hover:bg-primary-60 transition-colors flex-shrink-0"
                      >
                        <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                      >
                        <Square className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    )}

                    {/* Waveform/Progress */}
                    <div className="flex-1 flex items-center gap-2">
                      {isRecording || isPaused ? (
                        <>
                          {/* Animated waveform bars */}
                          <div className="flex items-center gap-1 flex-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 bg-primary-50 rounded-full transition-all duration-300 ${
                                  isRecording && !isPaused
                                    ? 'animate-pulse'
                                    : ''
                                }`}
                                style={{
                                  height: isRecording && !isPaused 
                                    ? `${Math.random() * 20 + 10}px` 
                                    : '10px',
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>

                          {/* Timer */}
                          <span className="text-sm sm:text-base font-medium text-black min-w-[50px] text-right">
                            {formatTime(recordingTime)}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 flex-1">
                          {[...Array(20)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 h-[10px] bg-gray-300 rounded-full"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pause/Resume Button */}
                    {isRecording && (
                      <button
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                      >
                        {isPaused ? (
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                          <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <p className="text-sm text-red-600 mt-2">{error}</p>
                  )}

                  {/* Recording Status */}
                  {isRecording && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-3">
                      {isPaused ? 'Recording paused...' : 'Recording in progress...'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Recorded Audio Playback */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    {/* Audio Player */}
                    <div className="flex-1">
                      <audio
                        src={audioURL}
                        controls
                        className="w-full h-10"
                        controlsList="nodownload"
                      />
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={deleteRecording}
                      className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Text Message Section */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg font-medium text-black mb-3 sm:mb-4">
              Text Message (Optional)
            </label>
            <textarea
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder="Write here..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-primary-50 text-white rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
            >
              Apply the Job
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
