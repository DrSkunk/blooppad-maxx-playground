import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareMidiFlash } from "../src/lib/flash.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("the chooser opens before preparation, then one pad reboots before selection", async () => {
  const events: string[] = [];
  const chooser = deferred<{ close(): Promise<void> }>();
  const firmware = deferred<Uint8Array>();
  const transport = { close: async () => void events.push("close") };
  const bytes = new Uint8Array([1, 2, 3]);
  const pending = prepareMidiFlash(
    () => {
      events.push("chooser");
      return chooser.promise;
    },
    () => {
      events.push("prepare");
      return firmware.promise;
    },
    () => void events.push("reboot"),
  );

  assert.deepEqual(events, ["chooser", "prepare"]);
  firmware.resolve(bytes);
  await tick();
  assert.deepEqual(events, ["chooser", "prepare", "reboot"]);
  chooser.resolve(transport);
  assert.deepEqual(await pending, { transport, firmware: bytes });
  assert.deepEqual(events, ["chooser", "prepare", "reboot"]);
});

test("canceling the chooser during preparation never reboots the pad", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  const firmware = deferred<Uint8Array>();
  let rebooted = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    () => firmware.promise,
    () => {
      rebooted = true;
    },
  );
  chooser.reject(new DOMException("Canceled", "NotFoundError"));
  await assert.rejects(pending, { name: "NotFoundError" });
  assert.equal(rebooted, false);
  firmware.reject(new Error("Late download failure"));
  await tick();
});

test("a device selected before reboot is closed and is never flashed", async () => {
  const firmware = deferred<Uint8Array>();
  let closed = false;
  let rebooted = false;
  const pending = prepareMidiFlash(
    async () => ({
      close: async () => {
        closed = true;
      },
    }),
    () => firmware.promise,
    () => {
      rebooted = true;
    },
  );
  await assert.rejects(pending, /selected before the pad rebooted/);
  assert.equal(closed, true);
  assert.equal(rebooted, false);
  firmware.resolve(new Uint8Array([1]));
});

test("an early selection is rejected even when firmware resolves in the same turn", async () => {
  let closed = false;
  let rebooted = false;
  const pending = prepareMidiFlash(
    async () => ({
      close: async () => {
        closed = true;
      },
    }),
    async () => new Uint8Array([1]),
    () => {
      rebooted = true;
    },
  );
  await assert.rejects(pending, /selected before the pad rebooted/);
  assert.equal(closed, true);
  assert.equal(rebooted, false);
});

test("preparation failure closes a device selected later", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  let closed = false;
  let rebooted = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    async () => {
      throw new Error("Download failed");
    },
    () => {
      rebooted = true;
    },
  );
  await assert.rejects(pending, /Download failed/);
  assert.equal(rebooted, false);
  chooser.resolve({
    close: async () => {
      closed = true;
    },
  });
  await tick();
  assert.equal(closed, true);
});

test("a failed reboot closes a device selected later", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  let closed = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    async () => new Uint8Array([1]),
    () => {
      throw new Error("MIDI disconnected");
    },
  );
  await assert.rejects(pending, /MIDI disconnected/);
  chooser.resolve({
    close: async () => {
      closed = true;
    },
  });
  await tick();
  assert.equal(closed, true);
});

test("canceling after reboot rejects without returning a transport", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  let rebooted = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    async () => new Uint8Array([1]),
    () => {
      rebooted = true;
    },
  );
  await tick();
  assert.equal(rebooted, true);
  chooser.reject(new DOMException("Canceled", "NotFoundError"));
  await assert.rejects(pending, { name: "NotFoundError" });
});

test("aborting during preparation does not reboot and closes a late selection", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  const firmware = deferred<Uint8Array>();
  const controller = new AbortController();
  let rebooted = false;
  let closed = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    () => firmware.promise,
    () => {
      rebooted = true;
    },
    controller.signal,
  );
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(rebooted, false);
  chooser.resolve({
    close: async () => {
      closed = true;
    },
  });
  await tick();
  assert.equal(closed, true);
  firmware.resolve(new Uint8Array([1]));
});

test("aborting after reboot closes a late selection without flashing", async () => {
  const chooser = deferred<{ close(): Promise<void> }>();
  const controller = new AbortController();
  let rebooted = false;
  let closed = false;
  const pending = prepareMidiFlash(
    () => chooser.promise,
    async () => new Uint8Array([1]),
    () => {
      rebooted = true;
    },
    controller.signal,
  );
  await tick();
  assert.equal(rebooted, true);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  chooser.resolve({
    close: async () => {
      closed = true;
    },
  });
  await tick();
  assert.equal(closed, true);
});

test("an already aborted flash never opens the chooser", async () => {
  const controller = new AbortController();
  controller.abort();
  let requested = false;
  const pending = prepareMidiFlash(
    async () => {
      requested = true;
      return { close: async () => {} };
    },
    async () => new Uint8Array([1]),
    () => {},
    controller.signal,
  );
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(requested, false);
});
