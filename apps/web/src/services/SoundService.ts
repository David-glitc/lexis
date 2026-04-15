export type SoundEvent = "key_press" | "tile_reveal" | "victory" | "defeat" | "notification";

export class SoundService {
  private context: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!this.context) this.context = new Ctx();
    return this.context;
  }

  private beep(frequency: number, durationMs: number, type: OscillatorType = "sine"): void {
    if (!this.enabled || this.volume <= 0) return;
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.value = this.volume * 0.15;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000);
  }

  play(eventName: SoundEvent): void {
    if (!this.enabled) return;
    switch (eventName) {
      case "key_press":
        this.beep(420, 45, "square");
        break;
      case "tile_reveal":
        this.beep(640, 70, "triangle");
        break;
      case "victory":
        this.beep(700, 90, "triangle");
        setTimeout(() => this.beep(880, 120, "triangle"), 110);
        break;
      case "defeat":
        this.beep(280, 160, "sawtooth");
        break;
      case "notification":
        this.beep(520, 85, "sine");
        break;
      default:
        break;
    }
  }
}

