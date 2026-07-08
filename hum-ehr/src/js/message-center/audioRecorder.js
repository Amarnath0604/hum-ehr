/**
 * Voice-message recorder for the chat composer.
 *
 * Mirrors the legacy messageCenterUtility.initializeLiveRecording +
 * saveAndStopRecording + Recorder.js flow: capture mono PCM via Web Audio,
 * draw a live scrolling waveform, and export a 16-bit WAV Blob on stop
 * (the backend + other clients expect audio/wav — MediaRecorder's webm/opus
 * would not round-trip). No external Recorder dependency.
 */

// ---- WAV encoding (mono, 16-bit PCM) ----

const mergeBuffers = (chunks, totalLength) => {
    const result = new Float32Array(totalLength);
    let offset = 0;
    chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.length; });
    return result;
};

const writeString = (view, offset, str) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
};

const encodeWav = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM subchunk size
    view.setUint16(20, 1, true); // audio format = PCM
    view.setUint16(22, 1, true); // channels = mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate = sampleRate * blockAlign
    view.setUint16(32, 2, true); // block align = channels * bytesPerSample
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i += 1, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

/**
 * Start recording. Returns a controller once the mic is live:
 *   stop()   → stops capture, returns the recorded WAV Blob
 *   cancel() → stops capture, discards audio
 * Throws if mic permission is denied/unavailable (caller shows the message).
 */
export const startAudioRecorder = async (canvas) => {
    if (navigator.permissions?.query) {
        try {
            const permission = await navigator.permissions.query({ name: 'microphone' });
            if (permission.state === 'denied') throw new Error('denied');
        }
        catch (error) { if (error?.message === 'denied') throw error; /* query unsupported → continue */ }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    // ScriptProcessor captures mono PCM (matches legacy Recorder numChannels:1).
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    let totalLength = 0;
    processor.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(channel));
        totalLength += channel.length;
    };
    source.connect(processor);
    processor.connect(audioContext.destination); // keeps onaudioprocess firing; output stays silent

    // ---- live scrolling waveform (port of drawLiveWaveForm) ----
    const ctx = canvas?.getContext('2d');
    const waveBars = 3;
    const barGaps = 2.5;
    const barCount = canvas ? Math.floor(canvas.width / (waveBars + barGaps)) : 0;
    const waveEffect = new Array(barCount).fill(2);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let rafId = null;
    let frameCount = 0;
    let smoothedPeak = 0;

    const draw = () => {
        rafId = requestAnimationFrame(draw);
        frameCount += 1;
        if (frameCount % 4 !== 0) return;
        analyser.getByteTimeDomainData(dataArray);
        let peak = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
            const v = Math.abs(dataArray[i] - 128);
            if (v > peak) peak = v;
        }
        const normalized = (peak / 128) * 2.2;
        if (frameCount === 4) smoothedPeak = normalized;
        const startupBlend = frameCount < 30 ? frameCount / 30 : 1;
        smoothedPeak = smoothedPeak * 0.9 + normalized * 0.1 * startupBlend;
        let baseHeight = 5;
        if (smoothedPeak > 0.15 && smoothedPeak <= 0.4) baseHeight = 13;
        else if (smoothedPeak > 0.4) baseHeight = 17;
        const waveHeight = Math.max(3, baseHeight + (Math.random() - 0.5) * 4);
        waveEffect.shift();
        waveEffect.push(waveHeight);
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        for (let i = 0; i < waveEffect.length; i += 1) {
            const x = i * (waveBars + barGaps);
            const y = (canvas.height / 2) - (waveEffect[i] / 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + waveEffect[i]);
        }
        ctx.strokeStyle = '#01c1d1';
        ctx.lineWidth = 2;
        ctx.stroke();
    };
    if (canvas) draw();

    const cleanup = () => {
        if (rafId) cancelAnimationFrame(rafId);
        try { processor.onaudioprocess = null; processor.disconnect(); source.disconnect(); analyser.disconnect(); }
        catch { /* nodes already torn down */ }
        try { stream.getTracks().forEach((track) => track.stop()); } catch { /* stream gone */ }
        try { audioContext.close(); } catch { /* context closed */ }
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return {
        stop() {
            const sampleRate = audioContext.sampleRate;
            cleanup();
            return encodeWav(mergeBuffers(chunks, totalLength), sampleRate);
        },
        cancel() { cleanup(); },
    };
};

/** Blob → base64 payload (no data-URI prefix), matching legacy convertBlobToBase64. */
export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});
