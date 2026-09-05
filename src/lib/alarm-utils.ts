/**
 * Utilities for incoming order alarm audio in Arum Seduh.
 * Includes Web Audio API overdrive / "speaker pecah" volume booster.
 */

export const DEFAULT_ALARM_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Returns the effective alarm sound URL.
 * If customUrl is provided and non-empty, returns customUrl.
 * Otherwise falls back to DEFAULT_ALARM_SOUND_URL.
 */
export function getAlarmSoundUrl(customUrl?: string | null): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return DEFAULT_ALARM_SOUND_URL;
}

/**
 * Distortion curve generator for authentic "speaker pecah" / overdrive clipping.
 */
function makeDistortionCurve(amount: number = 25): Float32Array {
  const k = typeof amount === 'number' ? amount : 25;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

interface AudioGraph {
  ctx: AudioContext;
  gain: GainNode;
  filterBass?: BiquadFilterNode;
  filterMid?: BiquadFilterNode;
  distortion?: WaveShaperNode;
}

const audioGraphMap = new WeakMap<HTMLAudioElement, AudioGraph>();
let globalSharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalSharedCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      globalSharedCtx = new AudioCtxClass();
    }
  }
  if (globalSharedCtx && globalSharedCtx.state === 'suspended') {
    globalSharedCtx.resume().catch(() => {});
  }
  return globalSharedCtx;
}

// User interaction unlocker for browsers autoplay & audio context policy
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (globalSharedCtx && globalSharedCtx.state === 'suspended') {
      globalSharedCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Attaches the Web Audio API booster to an HTMLAudioElement.
 * Boosts volume beyond 100% up to 500%, 700%+, with overdrive distortion ("speaker pecah").
 */
export function setupSpeakerPecahBooster(
  audio: HTMLAudioElement,
  boostPercent: number = 350
): AudioGraph | null {
  if (typeof window === 'undefined') return null;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return null;

    // Enable cross-origin so Web Audio node doesn't output silence on remote assets
    if (!audio.crossOrigin) {
      audio.crossOrigin = 'anonymous';
    }

    const gainMultiplier = Math.max(1, (boostPercent || 350) / 100);

    // Dynamic overdrive factors scaling with volume boost level:
    // 100%: clean
    // 200%: k=15, mid=4dB, bass=3dB
    // 350%: k=30, mid=6dB, bass=5dB
    // 500%: k=55, mid=8dB, bass=7dB (Super Pecah)
    // 700%+: k=85, mid=11dB, bass=9dB (Ekstrem Speaker Hancur)
    const distortionAmount =
      gainMultiplier >= 6.5 ? 85 :
      gainMultiplier >= 4.5 ? 55 :
      gainMultiplier >= 3.0 ? 30 :
      gainMultiplier > 1.5 ? 15 : 0;

    const midGain =
      gainMultiplier >= 6.5 ? 11 :
      gainMultiplier >= 4.5 ? 8 :
      gainMultiplier >= 3.0 ? 6 :
      gainMultiplier > 1.5 ? 3 : 0;

    const bassGain =
      gainMultiplier >= 6.5 ? 9 :
      gainMultiplier >= 4.5 ? 7 :
      gainMultiplier >= 3.0 ? 5 :
      gainMultiplier > 1.5 ? 3 : 0;

    let graph = audioGraphMap.get(audio);
    if (!graph) {
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = gainMultiplier;

      // Mid-range punch for piercing presence (makes buzzer/alarm impossible to miss)
      const filterMid = ctx.createBiquadFilter();
      filterMid.type = 'peaking';
      filterMid.frequency.value = 2400;
      filterMid.Q.value = 1.2;
      filterMid.gain.value = midGain;

      // Bass boost to rattle the speaker
      const filterBass = ctx.createBiquadFilter();
      filterBass.type = 'lowshelf';
      filterBass.frequency.value = 150;
      filterBass.gain.value = bassGain;

      // Overdrive wave shaper for crunchy "speaker pecah" distortion
      const distortion = ctx.createWaveShaper();
      if (distortionAmount > 0) {
        distortion.curve = makeDistortionCurve(distortionAmount);
        distortion.oversample = '2x';
      }

      // Chain: source -> filterBass -> filterMid -> distortion -> gain -> destination
      source.connect(filterBass);
      filterBass.connect(filterMid);
      filterMid.connect(distortion);
      distortion.connect(gain);
      gain.connect(ctx.destination);

      graph = { ctx, gain, filterBass, filterMid, distortion };
      audioGraphMap.set(audio, graph);
    } else {
      graph.gain.gain.value = gainMultiplier;
      if (graph.filterMid) {
        graph.filterMid.gain.value = midGain;
      }
      if (graph.filterBass) {
        graph.filterBass.gain.value = bassGain;
      }
      if (graph.distortion) {
        graph.distortion.curve = distortionAmount > 0 ? makeDistortionCurve(distortionAmount) : null;
      }
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return graph;
  } catch (err) {
    console.warn('[AlarmBooster] Could not attach Web Audio booster, fallback to standard output:', err);
    return null;
  }
}

/**
 * Safely plays an HTMLAudioElement with boosted "speaker pecah" volume.
 */
export async function playBoostedAudio(
  audio: HTMLAudioElement,
  boostPercent: number = 350
): Promise<void> {
  setupSpeakerPecahBooster(audio, boostPercent);
  if (globalSharedCtx && globalSharedCtx.state === 'suspended') {
    await globalSharedCtx.resume().catch(() => {});
  }
  return audio.play();
}

/**
 * Plays a one-shot notification chime with boosted overdrive volume.
 */
export function playOneShotBoostedAlarm(
  url: string,
  boostPercent: number = 350
): void {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    setupSpeakerPecahBooster(audio, boostPercent);
    if (globalSharedCtx && globalSharedCtx.state === 'suspended') {
      globalSharedCtx.resume().catch(() => {});
    }
    audio.play().catch((err) => {
      console.warn('[OneShotAlarm] Play blocked:', err);
    });
  } catch {
    try {
      const fallbackAudio = new Audio(url);
      fallbackAudio.play().catch(() => {});
    } catch {}
  }
}
