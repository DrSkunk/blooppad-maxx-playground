import { matches } from "./midi.ts";

/** Firmware SysEx that reboots the pad into WCH's ISP bootloader ("BOO" makes it deliberate). */
export const BOOTLOADER_SYSEX = [
  0xf0, 0x13, 0x37, 0x00, 0x42, 0x4f, 0x4f, 0xf7,
] as const;

/** MIDI outputs that look like a BLOOPPAD-MAXX. Requests SysEx permission when needed. */
export async function padOutputs(): Promise<MIDIOutput[]> {
  if (!navigator.requestMIDIAccess)
    throw Error(
      "Web MIDI is unavailable. Use Chrome or Edge on HTTPS or localhost.",
    );
  const access = await navigator.requestMIDIAccess({ sysex: true });
  return [...access.outputs.values()].filter(matches);
}

export function sendBootloader(output: Pick<MIDIOutput, "send">) {
  output.send([...BOOTLOADER_SYSEX]);
}
