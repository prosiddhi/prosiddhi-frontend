'use client'

import { useState } from 'react'

export default function MicrophoneTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const testMicrophone = async () => {
    setLogs([])
    addLog('🔍 Starting microphone test...')

    // Check if running on secure context
    if (window.isSecureContext) {
      addLog('✅ Running in secure context (HTTPS or localhost)')
    } else {
      addLog('❌ NOT running in secure context! Microphone access requires HTTPS or localhost')
      return
    }

    // Check if getUserMedia is supported
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      addLog('✅ getUserMedia is supported')
    } else {
      addLog('❌ getUserMedia is NOT supported in this browser')
      return
    }

    // Try to get microphone access
    try {
      addLog('📝 Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      addLog('✅ Microphone permission GRANTED!')
      addLog(`📊 Stream active: ${stream.active}`)
      addLog(`🎤 Audio tracks: ${stream.getAudioTracks().length}`)
      
      setHasPermission(true)

      // Stop the stream
      stream.getTracks().forEach(track => {
        track.stop()
        addLog(`🛑 Stopped track: ${track.label}`)
      })

      addLog('✨ Test completed successfully!')
    } catch (error: any) {
      addLog(`❌ Error: ${error.name}`)
      addLog(`📝 Message: ${error.message}`)
      setHasPermission(false)

      if (error.name === 'NotAllowedError') {
        addLog('🚫 Permission denied by user or blocked in browser settings')
      } else if (error.name === 'NotFoundError') {
        addLog('🎤 No microphone found on this device')
      } else if (error.name === 'NotReadableError') {
        addLog('🔒 Microphone is already in use by another application')
      }
    }
  }

  const checkPermissionStatus = async () => {
    setLogs([])
    addLog('🔍 Checking permission status...')

    try {
      // @ts-ignore - permissions API
      const result = await navigator.permissions.query({ name: 'microphone' })
      addLog(`📊 Permission state: ${result.state}`)
      
      if (result.state === 'granted') {
        addLog('✅ Permission is GRANTED')
      } else if (result.state === 'denied') {
        addLog('❌ Permission is DENIED')
      } else {
        addLog('⏳ Permission is PROMPT (will ask when needed)')
      }
    } catch (error: any) {
      addLog(`⚠️ Cannot check permission status: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">🎤 Microphone Test Page</h1>
          <p className="text-gray-600 mb-8">
            Use this page to diagnose microphone access issues
          </p>

          {/* Current URL */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold mb-2">Current Page URL:</h2>
            <code className="text-sm">{typeof window !== 'undefined' ? window.location.href : 'Loading...'}</code>
            <div className="mt-2">
              <span className={`inline-block px-3 py-1 rounded text-sm ${
                typeof window !== 'undefined' && window.isSecureContext 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {typeof window !== 'undefined' && window.isSecureContext ? '✅ Secure Context' : '❌ Not Secure'}
              </span>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={testMicrophone}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🎤 Test Microphone Access
            </button>
            <button
              onClick={checkPermissionStatus}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              🔍 Check Permission Status
            </button>
          </div>

          {/* Permission Status */}
          {hasPermission !== null && (
            <div className={`mb-6 p-4 rounded-lg ${
              hasPermission ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
            }`}>
              <h3 className="font-semibold mb-2">
                {hasPermission ? '✅ Microphone Access Granted' : '❌ Microphone Access Denied'}
              </h3>
              {!hasPermission && (
                <div className="text-sm">
                  <p className="mb-2">To fix this:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Click the lock/info icon in the address bar</li>
                    <li>Change "Microphone" permission to "Ask" or "Allow"</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Logs */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            <div className="mb-2 text-gray-500">Console Output:</div>
            {logs.length === 0 ? (
              <div className="text-gray-600">Click "Test Microphone Access" to begin...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold mb-2">📝 Important Notes:</h3>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Microphone access requires HTTPS or localhost</li>
              <li>Access via http://localhost:3000 ✅</li>
              <li>Access via http://192.168.x.x ❌ (won't work)</li>
              <li>Check browser console (F12) for detailed errors</li>
              <li>Ensure microphone is not being used by another app</li>
            </ul>
          </div>

          {/* Browser Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
            <h3 className="font-semibold mb-2">Browser Info:</h3>
            <div className="space-y-1">
              <div>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'Loading...'}</div>
              <div>Language: {typeof navigator !== 'undefined' ? navigator.language : 'Loading...'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
