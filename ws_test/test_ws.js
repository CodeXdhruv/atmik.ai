const WebSocket = require('ws');
const fs = require('fs');

const WS_URL = 'wss://atmik-ai-backend.swatantra-backend.workers.dev/api/voice-chat';
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: node test_ws.js <en|hi> <path/to/audio.wav>");
  process.exit(1);
}

const lang = args[0];
const audioPath = args[1];

if (!fs.existsSync(audioPath)) {
  console.error(`File not found: ${audioPath}`);
  process.exit(1);
}

const audioBase64 = fs.readFileSync(audioPath, { encoding: 'base64' });

console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('Connected!');
  
  // Send session_init
  ws.send(JSON.stringify({
    type: 'session_init',
    userId: 'test_script_user',
    lang: lang
  }));
});

let ttsReceived = 0;
let firstChunkTime = null;

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  switch (msg.type) {
    case 'transcription':
      console.log(`[STT Transcription] -> ${msg.text}`);
      break;
    case 'session_ready':
      console.log('[Status] Session ready. Sending audio chunk...');
      ws.startTime = Date.now();
      ws.send(JSON.stringify({
        type: 'audio_chunk',
        userId: 'test_script_user',
        lang: lang,
        audioBase64: audioBase64
      }));
      break;
    case 'text_stream':
      process.stdout.write(msg.text);
      break;
    case 'tts_audio':
      if (ttsReceived === 0) {
        firstChunkTime = Date.now() - ws.startTime;
        console.log(`\n\n>>> 🚀 TIME TO FIRST AUDIO (TTFA): ${firstChunkTime} ms <<<\n`);
      }
      ttsReceived++;
      console.log(`\n[TTS Audio] Received audio chunk #${msg.index} (${msg.audioBase64.length} chars)`);
      break;
    case 'generation_done':
      console.log('\n[Status] Generation Done! Received total TTS chunks:', ttsReceived);
      ws.close();
      break;
    case 'error':
      console.error(`\n[Error from server] -> ${msg.message}`);
      ws.close();
      break;
    case 'session_ready':
      console.log('[Status] Session ready.');
      break;
    default:
      console.log(`\n[Unknown type] -> ${msg.type}`);
  }
});

ws.on('close', () => {
  console.log('Connection closed.');
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
});
