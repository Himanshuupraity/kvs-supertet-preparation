import type { PresentationMetrics } from '@/types/models';

/**
 * Lightweight, on-device presentation metrics sampled from the live <video> element.
 * - Face visibility / centring uses the experimental FaceDetector API where available (Chrome Android/desktop behind flag; not on iOS).
 * - Motion uses frame differencing on a downscaled canvas (works everywhere).
 * These are approximate, observable characteristics only — NOT emotion, personality or attention inference.
 */
interface FaceDetectorLike { detect(src: CanvasImageSource): Promise<{ boundingBox: { x: number; y: number; width: number; height: number } }[]>; }

export class PresentationAnalyzer {
  private timer: number | null = null;
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private prev: Uint8ClampedArray | null = null;
  private frames = 0; private faceFrames = 0; private centeredFrames = 0; private motionSum = 0;
  private detector: FaceDetectorLike | null = null;

  constructor(private video: HTMLVideoElement, private intervalMs = 700) {
    const w = window as unknown as { FaceDetector?: new (o: { fastMode: boolean; maxDetectedFaces: number }) => FaceDetectorLike };
    try { this.detector = w.FaceDetector ? new w.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null; } catch { this.detector = null; }
    this.canvas.width = 96; this.canvas.height = 72;
  }

  start() { this.stop(); this.timer = window.setInterval(() => void this.sample(), this.intervalMs); }

  private async sample() {
    if (this.video.readyState < 2 || this.video.videoWidth === 0) return;
    const { width: W, height: H } = this.canvas;
    this.ctx.drawImage(this.video, 0, 0, W, H);
    const data = this.ctx.getImageData(0, 0, W, H).data;
    // motion: mean abs luminance diff
    if (this.prev) {
      let diff = 0;
      for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
        const l1 = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        const l2 = this.prev[i] * 0.3 + this.prev[i + 1] * 0.59 + this.prev[i + 2] * 0.11;
        diff += Math.abs(l1 - l2);
      }
      this.motionSum += Math.min(1, diff / (data.length / 16) / 40);
    }
    this.prev = new Uint8ClampedArray(data);
    this.frames++;
    if (this.detector) {
      try {
        const faces = await this.detector.detect(this.video);
        if (faces.length) {
          this.faceFrames++;
          const f = faces[0].boundingBox;
          const cx = (f.x + f.width / 2) / this.video.videoWidth;
          const cy = (f.y + f.height / 2) / this.video.videoHeight;
          if (cx > 0.3 && cx < 0.7 && cy > 0.2 && cy < 0.75) this.centeredFrames++;
        }
      } catch { this.detector = null; }
    }
  }

  stop(): PresentationMetrics {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const supported = this.frames > 0;
    const hasFace = !!this.detector;
    return {
      supported,
      framesSampled: this.frames,
      faceVisibleRatio: hasFace && this.frames ? this.faceFrames / this.frames : null,
      centeredRatio: hasFace && this.frames ? this.centeredFrames / this.frames : null,
      motionScore: this.frames > 1 ? this.motionSum / (this.frames - 1) : null,
      note: hasFace
        ? 'Face-in-frame and centring are approximate (browser FaceDetector). Motion is frame-difference based. No emotion or attention inference is made.'
        : 'This browser does not expose face detection; only frame-motion was measured. No emotion or attention inference is made.',
    };
  }
}
