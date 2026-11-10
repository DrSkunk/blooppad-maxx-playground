import assert from "node:assert/strict";
import test from "node:test";
import {
  firmwareGames,
  gameAt,
  renderFirmwareMenu,
} from "../src/lib/firmwareMenu.ts";
import { BOOTLOADER_SYSEX, sendBootloader } from "../src/lib/bootloader.ts";

test("firmware menu has 16 unique buttons on the top and bottom rows", () => {
  assert.equal(firmwareGames.length, 16);
  const cells = new Set(firmwareGames.map((g) => `${g.row}:${g.col}`));
  assert.equal(cells.size, 16);
  assert.equal(gameAt(7, 7)?.id, "midi");
  assert.equal(gameAt(0, 5)?.id, "tetris");
  assert.equal(gameAt(3, 3), null);
});

test("menu frame lights the menu rows and blinks the selection", () => {
  const idle = renderFirmwareMenu(null, 0);
  assert.equal(idle.length, 64);
  assert.deepEqual(idle[0], [255, 255, 0]);
  assert.deepEqual(idle[63], [255, 255, 255]);
  for (let col = 0; col < 8; col++) assert.deepEqual(idle[8 + col], [0, 0, 0]);
  const midi = gameAt(7, 7)!;
  assert.deepEqual(renderFirmwareMenu(midi, 0)[63], [255, 255, 255]);
  assert.deepEqual(renderFirmwareMenu(midi, 300)[63], [0, 0, 0]);
});

test("bootloader command matches the firmware", () => {
  assert.deepEqual(
    [...BOOTLOADER_SYSEX],
    [0xf0, 0x13, 0x37, 0x00, 0x42, 0x4f, 0x4f, 0xf7],
  );
  const sent: number[][] = [];
  sendBootloader({
    send: (data: Iterable<number>) => void sent.push([...data]),
  } as never);
  assert.deepEqual(sent, [[...BOOTLOADER_SYSEX]]);
});
