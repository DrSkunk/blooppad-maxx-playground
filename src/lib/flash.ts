type FlashTransport = { close(): Promise<void> };

type ChooserResult<T> =
  { kind: "selected"; transport: T } | { kind: "rejected"; reason: unknown };

async function closeAbandoned<T extends FlashTransport>(
  result: ChooserResult<T>,
) {
  if (result.kind !== "selected") return;
  try {
    await result.transport.close();
  } catch (reason) {
    console.warn("Could not close WebUSB transport", reason);
  }
}

function rejectEarlySelection<T>(result: ChooserResult<T>): never {
  if (result.kind === "rejected") throw result.reason;
  throw new Error(
    "A USB device was selected before the pad rebooted. Unplug other CH32 boards and try again.",
  );
}

export async function prepareMidiFlash<T extends FlashTransport>(
  requestDevice: () => Promise<T>,
  readFirmware: () => Promise<Uint8Array>,
  rebootPad: () => void,
  signal?: AbortSignal,
): Promise<{ transport: T; firmware: Uint8Array }> {
  signal?.throwIfAborted();
  // The chooser needs the click, but the firmware must be ready before reboot.
  const state: { result?: ChooserResult<T> } = {};
  const chooser = requestDevice().then(
    (transport): ChooserResult<T> =>
      (state.result = { kind: "selected", transport }),
    (reason: unknown): ChooserResult<T> =>
      (state.result = { kind: "rejected", reason }),
  );
  const chooserEvent = chooser.then((result) => ({
    kind: "chooser" as const,
    result,
  }));
  let onAbort: (() => void) | undefined;
  const cancellation = signal
    ? new Promise<{ kind: "aborted"; reason: unknown }>((resolve) => {
        onAbort = () => resolve({ kind: "aborted", reason: signal.reason });
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      })
    : undefined;
  let handedOff = false;

  try {
    const first = await Promise.race([
      chooserEvent,
      readFirmware().then((firmware) => ({
        kind: "firmware" as const,
        firmware,
      })),
      ...(cancellation ? [cancellation] : []),
    ]);
    if (first.kind === "aborted") throw first.reason;
    if (first.kind === "chooser") rejectEarlySelection(first.result);
    if (state.result) rejectEarlySelection(state.result);
    signal?.throwIfAborted();

    rebootPad();
    const selection = await Promise.race([
      chooserEvent,
      ...(cancellation ? [cancellation] : []),
    ]);
    if (selection.kind === "aborted") throw selection.reason;
    signal?.throwIfAborted();
    const result = selection.result;
    if (result.kind === "rejected") throw result.reason;
    handedOff = true;
    return { transport: result.transport, firmware: first.firmware };
  } finally {
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
    if (!handedOff) {
      if (state.result) {
        await closeAbandoned(state.result);
      } else {
        void chooser.then((result) => {
          if (
            result.kind === "rejected" &&
            !(
              result.reason instanceof DOMException &&
              result.reason.name === "NotFoundError"
            )
          ) {
            console.warn(
              "USB chooser failed after the flash was canceled",
              result.reason,
            );
          }
          return closeAbandoned(result);
        });
      }
    }
  }
}
