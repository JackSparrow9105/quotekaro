import { Component, ElementRef, OnDestroy, output, signal, viewChild } from '@angular/core';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare const BarcodeDetector: {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

/** Camera barcode scanner. Shown only where the browser has BarcodeDetector (e.g. Chrome on Android). */
@Component({
  selector: 'app-scan-button',
  template: `
    @if (supported) {
      <button type="button" class="btn btn-ghost btn-sm scan-btn" (click)="open()" aria-label="Scan barcode with camera">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8"/></svg>
        <span class="scan-label">Scan</span>
      </button>
    }
    @if (active()) {
      <div class="scan-overlay" role="dialog" aria-modal="true" aria-label="Scan a barcode">
        <div class="scan-box">
          <video #video playsinline muted class="scan-video"></video>
          <div class="scan-frame" aria-hidden="true"></div>
        </div>
        <p class="scan-hint">{{ error() || 'Point the camera at the barcode' }}</p>
        <button type="button" class="btn btn-primary" (click)="close()">Cancel</button>
      </div>
    }
  `,
})
export class ScanButton implements OnDestroy {
  readonly scanned = output<string>();
  protected readonly supported = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  protected readonly active = signal(false);
  protected readonly error = signal('');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  async open() {
    this.error.set('');
    this.active.set(true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      // wait a tick for the <video> to render
      await new Promise((r) => setTimeout(r));
      const v = this.video()?.nativeElement;
      if (!v) return;
      v.srcObject = this.stream;
      await v.play();
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
      const tick = async () => {
        if (!this.active()) return;
        try {
          const found = await detector.detect(v);
          if (found.length && found[0].rawValue) {
            const code = found[0].rawValue;
            navigator.vibrate?.(60);
            this.close();
            this.scanned.emit(code);
            return;
          }
        } catch {
          /* frame not ready */
        }
        this.timer = setTimeout(tick, 200);
      };
      tick();
    } catch {
      this.error.set('Camera not available. Allow camera access, or type the code instead.');
    }
  }

  close() {
    this.active.set(false);
    if (this.timer) clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  ngOnDestroy() {
    this.close();
  }
}
