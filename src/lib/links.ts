export const REPO = "https://github.com/phyx-be/BLOOPPAD-MAXX";
const tree = (path: string) => `${REPO}/tree/main/${path}`;
const blob = (path: string) => `${REPO}/blob/main/${path}`;

export const links = {
  repo: REPO,
  readme: `${REPO}#readme`,
  games: blob("GAMES.md"),
  releases: `${REPO}/releases`,
  firmware: tree("firmware"),
  hardware: tree("hardware"),
  rev01: tree("hardware/BloopPadMaxx_01"),
  schematic: blob("hardware/BloopPadMaxx_00/OUTPUT/BloopPadMaxx_00.PDF"),
  schematic01: blob("hardware/BloopPadMaxx_01/OUTPUT/BloopPadMaxx_01.PDF"),
  gerbers: tree("hardware/BloopPadMaxx_01/OUTPUT/Gerber"),
  bom: tree("hardware/BloopPadMaxx_01/OUTPUT/BOM"),
  pickPlace: tree("hardware/BloopPadMaxx_01/OUTPUT/Pick%20Place"),
  mechanical: tree("mechanical"),
  mechPdf: blob("mechanical/BloopPadMaxx_00_MECH.pdf"),
  photo: (name: string) =>
    `https://raw.githubusercontent.com/phyx-be/BLOOPPAD-MAXX/main/media/${name}`,
  mcu: "https://www.wch-ic.com/products/CH32X035.html",
  wchisp: "https://github.com/ch32-rs/wchisp",
  platformio: "https://platformio.org",
  ch32v: "https://github.com/Community-PIO-CH32V/platform-ch32v",
  scratcher: "https://fri3dcamp.github.io/fri3d-scratcher/",
};
