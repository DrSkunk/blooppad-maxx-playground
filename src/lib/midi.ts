import type { RGB } from "./engine";
export const matches = (p: MIDIPort) =>
  p.state === "connected" && /bloop.?pad|ch32x035-midi/i.test(p.name ?? "");
export function decode(data: ArrayLike<number>) {
  if (data.length < 3 || data[0] !== 0xb0) return null;
  const row = data[1] >> 4,
    col = data[1] & 15;
  if (row > 7 || col > 7) return null;
  return { row, col, pressed: data[2] > 0 };
}
export function encode(frame: RGB[], cache: string[] = []) {
  const bytes = [240, 19, 55],
    keys: string[] = [];
  frame.forEach((c, i) => {
    const rgb = c.map((v) => Math.max(0, Math.min(255, v | 0)) >> 1);
    keys.push(rgb.join(","));
    if (keys[i] !== cache[i])
      bytes.push(((i >> 3) << 4) | (8 + (i % 8)), ...rgb);
  });
  bytes.push(247);
  return { bytes, keys };
}
type Slot = { input: string; output: string };
export class MidiAdapter {
  access: MIDIAccess | null = null;
  slots: Slot[] = [{ input: "", output: "" }];
  inputs: MIDIInput[] = [];
  outputs: MIDIOutput[] = [];
  status = "Simulator ready";
  error = "";
  caches = new Map<string, string[]>();
  listeners = new Map<MIDIInput, (e: MIDIMessageEvent) => void>();
  held = new Map<string, { slot: number; row: number; col: number }>();
  disposed = false;
  onPad: (slot: number, row: number, col: number, pressed: boolean) => void;
  changed: () => void;
  constructor(onPad: MidiAdapter["onPad"], changed: () => void) {
    this.onPad = onPad;
    this.changed = changed;
  }
  async connect() {
    if (this.status === "Connecting") return;
    try {
      if (!navigator.requestMIDIAccess) {
        this.status = "Unsupported";
        throw Error(
          "Web MIDI is unavailable. Use Chromium on HTTPS or localhost.",
        );
      }
      this.status = "Connecting";
      this.changed();
      if (!this.access) {
        const access = await navigator.requestMIDIAccess({ sysex: true });
        if (this.disposed) return;
        this.access = access;
        this.access.addEventListener("statechange", this.bind);
      }
      this.error = "";
      this.bind();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      if (this.status !== "Unsupported")
        this.status = "Permission / connection error";
      this.changed();
    }
  }
  release() {
    this.held.forEach((h) => this.onPad(h.slot, h.row, h.col, false));
    this.held.clear();
  }
  bind = () => {
    this.release();
    this.listeners.forEach((fn, p) => p.removeEventListener("midimessage", fn));
    this.listeners.clear();
    this.inputs = [...(this.access?.inputs.values() ?? [])].filter(matches);
    this.outputs = [...(this.access?.outputs.values() ?? [])].filter(matches);
    if (this.slots.length === 1) {
      if (!this.slots[0].input && this.inputs.length === 1)
        this.slots[0].input = this.inputs[0].id;
      if (!this.slots[0].output && this.outputs.length === 1)
        this.slots[0].output = this.outputs[0].id;
    }
    this.slots.forEach((s, slot) => {
      const p = this.inputs.find((p) => p.id === s.input);
      if (p) {
        const fn = (e: MIDIMessageEvent) => {
          if (!e.data) return;
          const v = decode(e.data);
          if (!v) return;
          const key = `${p.id}:${v.row}:${v.col}`;
          if (this.held.has(key) === v.pressed) return;
          if (v.pressed) this.held.set(key, { slot, ...v });
          else this.held.delete(key);
          this.onPad(slot, v.row, v.col, v.pressed);
        };
        p.addEventListener("midimessage", fn);
        this.listeners.set(p, fn);
      }
    });
    this.caches.clear();
    const ins = this.slots.filter((s) =>
        this.inputs.some((p) => p.id === s.input),
      ).length,
      outs = this.slots.filter((s) =>
        this.outputs.some((p) => p.id === s.output),
      ).length;
    this.status =
      ins === this.slots.length && outs === this.slots.length
        ? "Connected"
        : "Waiting for input / output";
    this.changed();
  };
  resize(count: number) {
    this.release();
    this.slots = Array.from(
      { length: count },
      (_, i) => this.slots[i] ?? { input: "", output: "" },
    );
    if (this.access) this.bind();
  }
  assign(slot: number, type: keyof Slot, id: string) {
    this.slots.forEach((s, i) => {
      if (i !== slot && s[type] === id) s[type] = "";
    });
    this.slots[slot][type] = id;
    this.bind();
  }
  send(frames: RGB[][]) {
    let failed = "";
    frames.forEach((frame, i) => {
      const out = this.outputs.find((p) => p.id === this.slots[i]?.output);
      if (!out) return;
      const { bytes, keys } = encode(frame, this.caches.get(out.id));
      if (bytes.length === 4) return;
      try {
        out.send(bytes);
        this.caches.set(out.id, keys);
      } catch (e) {
        this.caches.delete(out.id);
        failed = `LED send failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    });
    if (
      this.error !== failed &&
      (failed || this.error.startsWith("LED send failed:"))
    ) {
      this.error = failed;
      this.changed();
    }
  }
  dispose() {
    this.disposed = true;
    this.release();
    this.access?.removeEventListener("statechange", this.bind);
    this.listeners.forEach((fn, p) => p.removeEventListener("midimessage", fn));
    this.listeners.clear();
  }
}
