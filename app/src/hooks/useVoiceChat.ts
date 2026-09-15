import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../api/client';
import { requestRecordingPermissionsAsync, setAudioModeAsync, createAudioPlayer, useAudioRecorder, RecordingPresets, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

interface VoiceMessage {
  type: 'transcription' | 'text_stream' | 'tts_audio' | 'generation_done' | 'error';
  text?: string;
  audioBase64?: string;
  index?: number;
  message?: string;
}

export function useVoiceChat(userId: string, lang: string = 'hi') {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiText, setAiText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'session_init',
        userId,
        lang
      }));
    }
  }, [lang, userId]);

  const recorder = useAudioRecorder({
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 16000,
    extension: '.m4a',
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
    ios: {
      audioQuality: 0,
      outputFormat: 'aac ',
    },
    web: {
      mimeType: 'audio/webm',
    },
    isMeteringEnabled: true,
  });
  const soundQueueRef = useRef<AudioPlayer[]>([]);
  const isPlayingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);

  // Initialize WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/voice-chat';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🗣️ [VoiceChat] WebSocket Connected');
      setIsConnected(true);
      setError(null);
      ws.send(JSON.stringify({
        type: 'session_init',
        userId,
        lang: langRef.current
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data) as VoiceMessage;
        
        switch (data.type) {
          case 'transcription':
            console.log('🗣️ [VoiceChat] Received Transcription (STT):', data.text);
            setTranscription(data.text || '');
            setAiText(''); // Clear previous AI text
            break;
          case 'text_stream':
            console.log('🗣️ [VoiceChat] Received AI Text Stream chunk');
            setAiText((prev) => prev + data.text);
            break;
          case 'tts_audio':
            console.log('🗣️ [VoiceChat] Received Audio Response (TTS)');
            if (data.audioBase64) {
              await queueAudioPlayback(data.audioBase64);
            }
            break;
          case 'generation_done':
            console.log('🗣️ [VoiceChat] AI Response Generation Done');
            // Generation finished
            break;
          case 'error':
            console.error('🗣️ [VoiceChat] Server Error:', data.message);
            setError(data.message || 'Unknown server error');
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto reconnect could be implemented here
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setError("Connection lost");
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
      stopAllAudio();
    };
  }, [connectWebSocket]);

  // Keep connection alive to prevent Cloudflare from dropping idle WebSockets
  useEffect(() => {
    let pingInterval: ReturnType<typeof setInterval>;
    if (isConnected) {
      pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000); // Send ping every 25 seconds
    }
    return () => clearInterval(pingInterval);
  }, [isConnected]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      silenceStartRef.current = null;
      interval = setInterval(() => {
        const status = recorder.getStatus();
        if (status.metering !== undefined) {
          // -45 dB is a good baseline for silence, though this might need tuning
          if (status.metering < -45) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > 1500) {
              // 1.5 seconds of silence -> cut recording
              stopRecording();
            }
          } else {
            silenceStartRef.current = null; // reset if sound detected
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const queueAudioPlayback = async (base64Audio: string) => {
    try {
      const uri = FileSystem.cacheDirectory + `temp_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(uri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });
      
      const sound = createAudioPlayer(uri);
      soundQueueRef.current.push(sound);
      
      playNextAudio();
    } catch (err) {
      console.error("Failed to queue audio", err);
    }
  };

  const playNextAudio = async () => {
    if (isPlayingRef.current || soundQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const sound = soundQueueRef.current.shift();
    
    if (sound) {
      sound.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.remove();
          isPlayingRef.current = false;
          playNextAudio();
        }
      });
      sound.play();
    }
  };

  const stopAllAudio = async () => {
    for (const sound of soundQueueRef.current) {
      sound.remove();
    }
    soundQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const startRecording = async () => {
    try {
      console.log('🗣️ [VoiceChat] startRecording called');
      
      // Auto-reconnect if the connection was dropped
      if (wsRef.current?.readyState !== WebSocket.OPEN && wsRef.current?.readyState !== WebSocket.CONNECTING) {
        console.log('🗣️ [VoiceChat] WebSocket dropped, reconnecting...');
        connectWebSocket();
      }

      await requestRecordingPermissionsAsync();
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      
      setIsRecording(true);
      stopAllAudio(); // Stop AI if speaking
    } catch (err) {
      console.error('🗣️ [VoiceChat] Failed to start recording', err);
      setError('Recording failed');
    }
  };

  const stopRecording = async () => {
    console.log('🗣️ [VoiceChat] stopRecording called');
    setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      
      console.log('🗣️ [VoiceChat] Recording stopped. URI:', uri);

      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🗣️ [VoiceChat] Sending audio to backend for STT...');
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          userId,
          lang: langRef.current,
          audioBase64: base64
        }));
      }
    } catch (err) {
      console.error('🗣️ [VoiceChat] Failed to stop recording', err);
    }
  };

  return {
    isConnected,
    isRecording,
    transcription,
    aiText,
    error,
    startRecording,
    stopRecording,
    reconnect: connectWebSocket
  };
}
