'use client'

import React from 'react'
import { Dialog, DialogContent } from '../../ui'
import { useVoiceCall } from '../../hooks/use-voice-call'
import type { VoiceCallEndResult } from '../../types/voice.types'
import { VoiceCallHeader } from './voice-call-header'
import { VoiceAudioVisualizerCard } from './voice-audio-visualizer-card'
import { VoiceTranscriptList } from './voice-transcript-list'
import { VoiceCallControls } from './voice-call-controls'
import { VoiceCallConnecting } from './voice-call-connecting'
import { VoiceCallEndedSummary } from './voice-call-ended-summary'
import { VoiceMinimizedIsland } from './voice-minimized-island'

export interface VoiceCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  conversationId?: string | number
  userId?: string | number
  userAuthId?: string | number
  senderMessengerId?: string | number
  wsUrl?: string
  onCallEnded?: (result: VoiceCallEndResult) => void
}

export function VoiceCallDialog({
  open,
  onOpenChange,
  sessionId,
  conversationId,
  userId,
  userAuthId,
  senderMessengerId,
  wsUrl,
  onCallEnded
}: VoiceCallDialogProps) {
  const voice = useVoiceCall({
    open,
    sessionId,
    conversationId,
    userId,
    userAuthId,
    senderMessengerId,
    wsUrl,
    onOpenChange,
    onCallEnded
  })


  if (!open) return null

  return (
    <>
      <Dialog open={open && !voice.isMinimized} onOpenChange={voice.handleDialogCloseAttempt}>
        <DialogContent
          showClose={false}
          className='sm:max-w-xl w-full p-0 flex flex-col overflow-hidden bg-white text-neutral-900 border border-neutral-200 shadow-2xl rounded-3xl'
        >
          <VoiceCallHeader
            callState={voice.callState}
            isConnecting={voice.isConnecting}
            isEnded={voice.isEnded}
            formattedDuration={voice.formattedDuration}
            contextBadges={voice.contextBadges}
            onMinimize={() => voice.setIsMinimized(true)}
          />

          {voice.isEnded ? (
            <VoiceCallEndedSummary
              formattedDuration={voice.formattedDuration}
              transcriptsCount={voice.transcripts.length}
              outcomeType={voice.outcomeType}
              contextBadges={voice.contextBadges}
              onClose={voice.handleDismissEndedCall}
            />
          ) : voice.isConnecting ? (
            <VoiceCallConnecting
              statusText={voice.statusText}
              onCancel={voice.handleHangup}
            />
          ) : (
            <>
              <VoiceAudioVisualizerCard
                callState={voice.callState}
                statusText={voice.statusText}
                isMuted={voice.isMuted}
                hasPermission={voice.hasPermission}
                analyserNode={voice.analyserNode}
                outputAnalyserNode={voice.outputAnalyserNode}
                userRms={voice.userRms}
                botRms={voice.botRms}
                activeVUSegments={voice.activeVUSegments}
                activeTool={voice.activeTool}
                onRequestMicrophone={voice.requestMicrophone}
              />

              <VoiceTranscriptList
                transcripts={voice.transcripts}
                matchedArticle={voice.matchedArticle}
                noticeBanner={voice.noticeBanner}
              />

              <VoiceCallControls
                isMuted={voice.isMuted}
                hasPermission={voice.hasPermission}
                userRms={voice.userRms}
                textInput={voice.textInput}
                isCapturingScreen={voice.isCapturingScreen}
                onTextInputChange={voice.setTextInput}
                onSendTextPrompt={voice.handleSendTextPrompt}
                onCaptureScreen={voice.handleCaptureScreen}
                onPhotoUpload={voice.handlePhotoUpload}
                onToggleMute={voice.handleToggleMute}
                onHeroMicClick={voice.handleHeroMicClick}
                onRequestMicrophone={voice.requestMicrophone}
                onMinimize={() => voice.setIsMinimized(true)}
                onHangup={voice.handleHangup}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <VoiceMinimizedIsland
        visible={open && voice.isMinimized}
        callState={voice.callState}
        formattedDuration={voice.formattedDuration}
        isMuted={voice.isMuted}
        hasPermission={voice.hasPermission}
        onToggleMute={voice.handleToggleMute}
        onMaximize={() => voice.setIsMinimized(false)}
        onHangup={voice.handleHangup}
      />
    </>
  )
}
