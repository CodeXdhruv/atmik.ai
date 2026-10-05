import '../firebaseSilence';
import { useState, useEffect, useRef, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../api/client';
import { requestRecordingPermissionsAsync, setAudioModeAsync, createAudioPlayer, useAudioRecorder, RecordingPresets, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
}

interface VoiceMessage {
  type: 'transcription' | 'text_stream' | 'text_replace' | 'tts_audio' | 'tts_meta' | 'generation_done' | 'error';
  text?: string;
  audioBase64?: string;
  index?: number;
  skipped?: boolean;
  message?: string;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length)));
  }
  return btoa(binary);
}

export function useVoiceChat(userId: string, lang: string = 'hi') {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [aiText, setAiText] = useState('');
  const [spokenCaption, setSpokenCaption] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const aiTextRef = useRef('');

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranscription('');
    setAiText('');
    aiTextRef.current = '';
    setSpokenCaption('');
    setIsThinking(false);
    setIsSpeaking(false);
    stopAllAudio();
  }, []);
  
  const wsRef = useRef<WebSocket | null>(null);
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      auth().currentUser?.getIdToken(false).then((token) => {
        if (!token || wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({
          type: 'session_init',
          token,
          lang
        }));
      }).catch(() => {});
    }
  }, [lang, userId]);

  const recorder = useAudioRecorder({
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    extension: '.aac',
    android: {
      outputFormat: 'aac_adts',
      audioEncoder: 'aac',
    },
    ios: {
      audioQuality: 0,
      outputFormat: 'aac',
    },
    web: {
      mimeType: 'audio/webm',
    },
    isMeteringEnabled: true,
  });
  const soundQueueRef = useRef<Map<number, { player: AudioPlayer; text: string }>>(new Map());
  const skippedClipsRef = useRef<Map<number, string>>(new Map());
  const clipTextRef = useRef<Map<number, string>>(new Map());
  const revealedRef = useRef('');
  const nextClipRef = useRef(0);
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const activePlayerRef = useRef<AudioPlayer | null>(null);
  const generationDoneRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const stoppingRef = useRef(false);
  const capturingRef = useRef(false);
  const recordingRef = useRef(false);
  const startTaskRef = useRef<Promise<boolean> | null>(null);
  const preparedRef = useRef(false);
  const pendingClipRef = useRef<{ index: number; text: string } | null>(null);
  const silencedRef = useRef(false);

  // Initialize WebSocket
  const connectingRef = useRef(false);
  const connectWebSocket = useCallback(() => {
    const existing = wsRef.current;
    if (connectingRef.current) return;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    connectingRef.current = true;

    auth().currentUser?.getIdToken(false).then((token) => {
      if (!token) {
        connectingRef.current = false;
        setError('Sign in to use voice.');
        return;
      }
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        connectingRef.current = false;
        return;
      }

      const wsUrl = API_BASE_URL.replace('http', 'ws') + '/voice-chat?token=' + encodeURIComponent(token);
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (wsRef.current !== ws) {
          ws.close();
          return;
        }
        console.log('🗣️ [VoiceChat] WebSocket Connected');
        setIsConnected(true);
        setError(null);
        ws.send(JSON.stringify({
          type: 'session_init',
          token,
          lang: langRef.current
        }));
      };

    ws.onmessage = async (event) => {
      try {
        let binary: Uint8Array | null = null;
        if (event.data instanceof ArrayBuffer) binary = new Uint8Array(event.data);
        else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
          binary = new Uint8Array(await event.data.arrayBuffer());
        }
        if (binary) {
          const pending = pendingClipRef.current;
          pendingClipRef.current = null;
          if (pending) {
            await queueAudioPlayback(pending.index, uint8ToBase64(binary), pending.text);
            playNextAudio();
          }
          return;
        }

        if (wsRef.current !== ws) return;
        const data = JSON.parse(event.data) as VoiceMessage;
        
        switch (data.type) {
          case 'transcription':
            capturingRef.current = false;
            console.log('🗣️ [VoiceChat] Received Transcription (STT):', data.text);
            const userText = data.text || '';
            setTranscription(userText);
            setAiText('');
            aiTextRef.current = '';
            setSpokenCaption('');
            revealedRef.current = '';
            stopAllAudio();
            
            const userMsgId = Date.now().toString();
            const aiMsgId = (Date.now() + 1).toString();
            setMessages((prev) => [
              ...prev,
              { id: userMsgId, sender: 'user', text: userText },
              { id: aiMsgId, sender: 'ai', text: '', isStreaming: true }
            ]);
            break;
          case 'text_replace':
            if (capturingRef.current || silencedRef.current) break;
            aiTextRef.current = data.text || '';
            setAiText(aiTextRef.current);
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const next = [...prev];
              const lastIdx = next.length - 1;
              const lastMsg = next[lastIdx];
              if (lastMsg && lastMsg.sender === 'ai') {
                next[lastIdx] = { ...lastMsg, text: data.text || '' };
              }
              return next;
            });
            break;
          case 'text_stream':
            if (capturingRef.current || silencedRef.current) break;
            const chunk = data.text || '';
            aiTextRef.current += chunk;
            setAiText(aiTextRef.current);
            setMessages((prev) => {
              if (prev.length === 0) {
                return [{ id: Date.now().toString(), sender: 'ai', text: chunk, isStreaming: true }];
              }
              const next = [...prev];
              const lastIdx = next.length - 1;
              const lastMsg = next[lastIdx];
              if (lastMsg && lastMsg.sender === 'ai') {
                next[lastIdx] = {
                  ...lastMsg,
                  text: lastMsg.text + chunk
                };
              } else {
                next.push({ id: Date.now().toString(), sender: 'ai', text: chunk, isStreaming: true });
              }
              return next;
            });
            break;
          case 'tts_meta':
            if (typeof data.index === 'number') {
              pendingClipRef.current = { index: data.index, text: data.text || '' };
            }
            break;
          case 'tts_audio':
            if (capturingRef.current || silencedRef.current) break;
            console.log('🗣️ [VoiceChat] Received Audio Response (TTS)', data.index, data.skipped ? 'skipped' : 'audio');
            if (typeof data.index === 'number') {
              const caption = data.text || '';
              clipTextRef.current.set(data.index, caption);
              if (data.skipped || !data.audioBase64) {
                skippedClipsRef.current.set(data.index, caption);
              } else {
                await queueAudioPlayback(data.index, data.audioBase64, caption);
              }
              if (silencedRef.current) break;
              playNextAudio();
            }
            break;
          case 'generation_done':
            if (capturingRef.current || silencedRef.current) break;
            console.log('🗣️ [VoiceChat] AI Response Generation Done');
            generationDoneRef.current = true;
            setSpokenCaption((caption) => caption || aiTextRef.current);
            playNextAudio();
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const next = [...prev];
              const lastIdx = next.length - 1;
              const lastMsg = next[lastIdx];
              if (lastMsg && lastMsg.sender === 'ai') {
                next[lastIdx] = {
                  ...lastMsg,
                  isStreaming: false
                };
              }
              return next;
            });
            break;
          case 'error':
            console.warn('🗣️ [VoiceChat] Server Error:', data.message);
            setError(data.message || 'Unknown server error');
            setIsThinking(false);
            setIsSpeaking(false);
            break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      connectingRef.current = false;
      setIsConnected(false);
      console.log('🗣️ [VoiceChat] WebSocket closed, auto-reconnecting in background...');
      setTimeout(() => {
        connectWebSocket();
      }, 1500);
    };

    ws.onerror = (err) => {
      console.warn("🗣️ [VoiceChat] WebSocket connection state changed (will auto-reconnect on tap)");
    };

      wsRef.current = ws;
      connectingRef.current = false;
    }).catch(() => {
      connectingRef.current = false;
      setError('Sign in to use voice.');
    });
  }, []);

  const cutOffRef = useRef<() => void>(() => {});

  useEffect(() => {
    connectWebSocket();
    return () => {
      cutOffRef.current();
      wsRef.current?.close();
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
      hasSpokenRef.current = false;
      interval = setInterval(() => {
        const status = recorder.getStatus();
        if (status.metering === undefined) return;
        const level = Math.min(1, Math.max(0, (status.metering + 50) / 35));
        setMicLevel(level);
        if (status.metering > -38) {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
        }
      }, 100);
    } else {
      setMicLevel(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const markIdleIfFinished = () => {
    if (isPlayingRef.current) return;
    if (soundQueueRef.current.has(nextClipRef.current)) return;
    if (!generationDoneRef.current) return;
    setIsSpeaking(false);
    setIsThinking(false);
  };

  const queueAudioPlayback = async (index: number, base64Audio: string, caption: string) => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });
      const head = atob(base64Audio.slice(0, 24).replace(/[^A-Za-z0-9+/]/g, ''));
      const extension = head.startsWith('RIFF') ? 'wav' : head.startsWith('OggS') ? 'ogg' : 'mp3';
      const uri = `${FileSystem.cacheDirectory}voice_${index}_${Date.now()}.${extension}`;
      await FileSystem.writeAsStringAsync(uri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });
      const sound = createAudioPlayer(uri, { updateInterval: 200 });
      soundQueueRef.current.set(index, { player: sound, text: caption });
    } catch (err) {
      console.error("Failed to queue audio", err);
      skippedClipsRef.current.set(index, caption);
    }
  };

  const revealClip = (text: string) => {
    const piece = text.trim();
    if (!piece) return;
    const next = revealedRef.current ? `${revealedRef.current} ${piece}` : piece;
    revealedRef.current = next;
    aiTextRef.current = next;
    setAiText(next);
    setSpokenCaption(piece);
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ id: Date.now().toString(), sender: 'ai', text: next, isStreaming: true }];
      }
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      const lastMsg = copy[lastIdx];
      if (lastMsg && lastMsg.sender === 'ai') {
        copy[lastIdx] = { ...lastMsg, text: next, isStreaming: true };
      }
      return copy;
    });
  };

  const playNextAudio = () => {
    if (isPlayingRef.current) return;

    while (skippedClipsRef.current.has(nextClipRef.current)) {
      const skippedText = skippedClipsRef.current.get(nextClipRef.current) || clipTextRef.current.get(nextClipRef.current) || '';
      skippedClipsRef.current.delete(nextClipRef.current);
      nextClipRef.current += 1;
      revealClip(skippedText);
    }

    const next = soundQueueRef.current.get(nextClipRef.current);
    if (!next) {
      markIdleIfFinished();
      return;
    }

    soundQueueRef.current.delete(nextClipRef.current);
    const index = nextClipRef.current;
    const player = next.player;
    isPlayingRef.current = true;
    activePlayerRef.current = player;
    setIsSpeaking(true);
    setIsThinking(false);
    revealClip(next.text);
    player.volume = 1;

    let finished = false;
    const finishClip = () => {
      if (finished) return;
      finished = true;
      if (clipTimerRef.current) {
        clearTimeout(clipTimerRef.current);
        clipTimerRef.current = null;
      }
      player.remove();
      if (activePlayerRef.current === player) activePlayerRef.current = null;
      isPlayingRef.current = false;
      nextClipRef.current = index + 1;
      playNextAudio();
    };

    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish || status.error) {
        finishClip();
        return;
      }
      if (
        status.isLoaded
        && status.duration > 0.2
        && status.currentTime > 0.2
        && status.currentTime >= status.duration - 0.12
        && !status.playing
      ) {
        finishClip();
      }
    });

    const armWatchdog = (ms: number) => {
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
      clipTimerRef.current = setTimeout(finishClip, ms);
    };
    armWatchdog(12000);

    console.log('🗣️ [VoiceChat] Playing clip', index);
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    }).then(() => {
      if (finished || activePlayerRef.current !== player) return;
      player.play();
      const duration = player.currentStatus?.duration;
      if (duration && duration > 0.2) armWatchdog(Math.ceil(duration * 1000) + 700);
    }).catch((err) => {
      console.error('🗣️ [VoiceChat] Playback failed', err);
      finishClip();
    });
  };

  const stopAllAudio = () => {
    if (clipTimerRef.current) {
      clearTimeout(clipTimerRef.current);
      clipTimerRef.current = null;
    }
    activePlayerRef.current?.remove();
    activePlayerRef.current = null;
    for (const clip of soundQueueRef.current.values()) {
      clip.player.remove();
    }
    soundQueueRef.current.clear();
    skippedClipsRef.current.clear();
    clipTextRef.current.clear();
    nextClipRef.current = 0;
    isPlayingRef.current = false;
    generationDoneRef.current = false;
    setIsSpeaking(false);
  };

  const prepareTaskRef = useRef<Promise<void> | null>(null);
  const ensureRecorderReady = () => {
    if (preparedRef.current) return Promise.resolve();
    if (prepareTaskRef.current) return prepareTaskRef.current;
    prepareTaskRef.current = (async () => {
      const permResult = await requestRecordingPermissionsAsync();
      if (!permResult.granted) {
        throw new Error('permission');
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      preparedRef.current = true;
    })().finally(() => {
      prepareTaskRef.current = null;
    });
    return prepareTaskRef.current;
  };

  useEffect(() => {
    ensureRecorderReady().catch(() => {});
  }, []);

  const startRecording = () => {
    if (recordingRef.current) return;
    console.log('🗣️ [VoiceChat] startRecording called');
    silencedRef.current = false;
    recordingRef.current = true;
    capturingRef.current = true;
    stoppingRef.current = false;
    setIsRecording(true);
    setError(null);
    setTranscription('');
    setSpokenCaption('');
    setIsThinking(false);
    setMicLevel(0);
    hasSpokenRef.current = false;
    stopAllAudio();

    if (wsRef.current?.readyState !== WebSocket.OPEN && wsRef.current?.readyState !== WebSocket.CONNECTING) {
      connectWebSocket();
    }

    startTaskRef.current = (async () => {
      try {
        await ensureRecorderReady();
        if (!recordingRef.current) return false;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'utterance_start',
            lang: langRef.current,
          }));
        }
        recorder.record();
        return true;
      } catch (err) {
        console.error('🗣️ [VoiceChat] Failed to start recording', err);
        recordingRef.current = false;
        capturingRef.current = false;
        preparedRef.current = false;
        setIsRecording(false);
        setError(err instanceof Error && err.message === 'permission'
          ? 'Microphone permission required. Please allow mic access.'
          : 'Recording failed');
        return false;
      }
    })();
  };

  const stopRecording = async () => {
    if (!recordingRef.current || stoppingRef.current) return;
    stoppingRef.current = true;
    console.log('🗣️ [VoiceChat] stopRecording called');
    const started = await (startTaskRef.current ?? Promise.resolve(false));
    startTaskRef.current = null;
    recordingRef.current = false;
    capturingRef.current = false;
    setIsRecording(false);
    setMicLevel(0);
    if (!started) {
      stoppingRef.current = false;
      return;
    }
    try {
      const status = recorder.getStatus();
      await recorder.stop();
      preparedRef.current = false;
      ensureRecorderReady().catch(() => {
        preparedRef.current = false;
      });
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });
      const uri = recorder.uri;
      const ws = wsRef.current;
      const tooShort = typeof status.durationMillis === 'number' && status.durationMillis > 0 && status.durationMillis < 350;

      if (tooShort) {
        setError('Hold the mic while you speak, then release.');
        setIsThinking(false);
        return;
      }

      if (uri && ws?.readyState === WebSocket.OPEN) {
        setIsThinking(true);
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          lang: langRef.current,
          audioBase64: base64,
        }));
      } else if (uri) {
        setError('Voice connection dropped. Hold the mic to try again.');
        setIsThinking(false);
      }
    } catch (err) {
      console.error('🗣️ [VoiceChat] Failed to stop recording', err);
      setIsThinking(false);
      setError('Recording failed');
    } finally {
      stoppingRef.current = false;
    }
  };

  const cutOff = () => {
    silencedRef.current = true;
    recordingRef.current = false;
    capturingRef.current = false;
    setIsRecording(false);
    setIsSpeaking(false);
    setIsThinking(false);
    setMicLevel(0);
    stopAllAudio();
    try {
      if (recorder.getStatus().isRecording) {
        recorder.stop().catch(() => {});
      }
    } catch {
      // The recorder may not be prepared yet.
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
  };
  cutOffRef.current = cutOff;

  return {
    isConnected,
    isRecording,
    isThinking,
    isSpeaking,
    micLevel,
    transcription,
    aiText,
    spokenCaption,
    messages,
    clearMessages,
    error,
    startRecording,
    stopRecording,
    cutOff,
    reconnect: connectWebSocket,
  };
}
