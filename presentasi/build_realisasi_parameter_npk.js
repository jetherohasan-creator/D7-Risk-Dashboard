const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const bs = require("react-icons/bs");
const tb = require("react-icons/tb");
const io = require("react-icons/io5");

const OUT = process.argv[2] || "Realisasi_Parameter_2027_NPK.pptx";

// Canvas mirrors the reference image (2000 x 666 px)
const IMG_W = 2000, IMG_H = 666;
const SW = 13.333, s = SW / IMG_W, SH = IMG_H * s;
const X = (px) => px * s;
const PT = (px) => +(px * s * 72).toFixed(1); // px font size -> pt

const NAVY = "0F2D5E", HEAD = "16386F", TXT = "1B2A4A", ICON = "1F4E99";
const FONT = "Arial";

async function svgPng(svg, w) {
  const buf = await sharp(Buffer.from(svg)).resize({ width: w }).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
async function icon(Comp, color, size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color, size: String(size) }));
  return svgPng(svg, size);
}

// Banner: navy gradient + stylised snowy mountain on the right
function bannerSvg(w, h, peakX, scale) {
  const k = 4; const W = w * k, H = h * k;
  const px = peakX * k, sc = scale * k;
  const pt = (dx, dy) => `${px + dx * sc},${dy * sc}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0E2A5A"/><stop offset="0.55" stop-color="#143A75"/>
      <stop offset="0.8" stop-color="#3D6EAE"/><stop offset="1" stop-color="#C9DCF0"/>
    </linearGradient>
    <linearGradient id="mt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B5F93"/><stop offset="1" stop-color="#1A3A6C"/>
    </linearGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.85"/>
    </linearGradient>
    <clipPath id="c"><rect width="${W}" height="${H}" rx="${6 * k}"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <polygon fill="url(#mt)" points="${pt(-260, 90)} ${pt(-150, 55)} ${pt(-80, 30)} ${pt(-30, 12)} ${pt(0, 2)} ${pt(25, 14)} ${pt(60, 22)} ${pt(110, 45)} ${pt(170, 60)} ${pt(240, 90)}"/>
    <polygon fill="#F4F8FC" points="${pt(-80, 30)} ${pt(-30, 12)} ${pt(0, 2)} ${pt(25, 14)} ${pt(60, 22)} ${pt(40, 30)} ${pt(22, 24)} ${pt(5, 36)} ${pt(-12, 22)} ${pt(-40, 34)} ${pt(-58, 30)}"/>
    <polygon fill="#DCE7F3" points="${pt(25, 14)} ${pt(60, 22)} ${pt(110, 45)} ${pt(80, 40)} ${pt(55, 30)} ${pt(40, 30)}"/>
    <polygon fill="#2C4E80" opacity="0.8" points="${pt(-150, 55)} ${pt(-110, 48)} ${pt(-60, 62)} ${pt(-20, 50)} ${pt(30, 70)} ${pt(80, 55)} ${pt(150, 75)} ${pt(240, 90)} ${pt(-260, 90)}"/>
    <rect x="0" y="${H * 0.55}" width="${W}" height="${H * 0.45}" fill="url(#haze)" opacity="0.7"/>
  </g></svg>`;
}

// Pile of NPK granules
function npkSvg() {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cols = ["8E4A38", "A35D47", "C9573C", "DCD3C8", "F3EFEA", "7A3A2C", "B98670", "E8E2DA", "9C3F2E"];
  const W = 640, H = 300; let c = "";
  const items = [];
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W;
    const t = (x - W / 2) / (W / 2);
    const top = H - (H - 20) * Math.pow(Math.max(0, 1 - t * t), 0.9);
    const y = top + rnd() * (H - top);
    items.push([x, y]);
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [x, y] of items) {
    const r = 9 + rnd() * 4, col = cols[Math.floor(rnd() * cols.length)];
    c += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#${col}"/>`;
    c += `<circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.35).toFixed(1)}" r="${(r * 0.35).toFixed(1)}" fill="#FFFFFF" opacity="0.35"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 20}" viewBox="-10 -10 ${W + 20} ${H + 30}">
  <ellipse cx="${W / 2}" cy="${H + 6}" rx="${W / 2}" ry="14" fill="#000" opacity="0.12"/>${c}</svg>`;
}

(async () => {
  const pres = new pptxgen();
  pres.defineLayout({ name: "REF", width: SW, height: +SH.toFixed(3) });
  pres.layout = "REF";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = "Realisasi Parameter 2027 - NPK";
  const slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };

  const rect = (x1, y1, x2, y2, o = {}) => slide.addShape(o.r ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, {
    x: X(x1), y: X(y1), w: X(x2 - x1), h: X(y2 - y1),
    fill: { color: o.fill || "FFFFFF" },
    line: o.line ? { color: o.line, width: o.lw || 0.75 } : { type: "none" },
    rectRadius: o.r ? o.r : undefined,
    shadow: o.shadow ? { type: "outer", color: "8FA3BF", blur: 3, offset: 1, angle: 90, opacity: 0.25 } : undefined,
  });
  const text = (t, x1, y1, x2, y2, o = {}) => slide.addText(t, {
    x: X(x1), y: X(y1), w: X(x2 - x1), h: X(y2 - y1), margin: 0, isTextBox: true,
    fontFace: FONT, fontSize: PT(o.size || 16), bold: o.bold !== false, color: o.color || TXT,
    align: o.align || "center", valign: o.valign || "middle", lineSpacingMultiple: o.ls || 0.95,
  });
  const img = (data, x1, y1, x2, y2) => slide.addImage({ data, x: X(x1), y: X(y1), w: X(x2 - x1), h: X(y2 - y1) });
  const ic = async (Comp, color, cx, cy, sz) => img(await icon(Comp, "#" + color), cx - sz / 2, cy - sz / 2, cx + sz / 2, cy + sz / 2);

  // ---------- Panel 1: Realisasi Parameter ----------
  rect(18, 14, 1985, 406, { r: 0.08, fill: "F7FAFD", line: "DCE5F0", shadow: true });
  img(await svgPng(bannerSvg(1967, 76, 1800, 1.0), 1967 * 2), 18, 12, 1985, 88);
  await ic(io.IoStatsChart, "FFFFFF", 70, 50, 36);
  slide.addText("Realisasi Parameter 2027 – NPK", {
    x: X(112), y: X(26), w: X(900), h: X(46), margin: 0, isTextBox: true,
    fontFace: FONT, fontSize: PT(33), bold: true, color: "FFFFFF", valign: "middle",
  });

  const cols = [
    [43, 98, "No"],
    [103, 310, "Nama Produk/ Service\nPerusahaan"],
    [316, 467, "Volume\nPenjualan 2026\n(Prognosa)"],
    [472, 670, "Total Penjualan/\nRevenue Perusahaan\n2026 (Prognosa)"],
    [676, 873, "Market Total Sales\n2026 (Prognosa)"],
    [878, 1036, "Market Share\n2026"],
    [1042, 1206, "Target Volume\nPenjualan 2027\n(Prognosa)"],
    [1212, 1309, "Unit\nSatuan\nVolume"],
    [1314, 1510, "Target Total\nPenjualan/ Revenue\nPerusahaan 2027"],
    [1516, 1711, "Market Total Sales\n2027 (Proyeksi)"],
    [1717, 1828, "Market\nShare\n2027"],
    [1833, 1964, "Kenaikan\n(Penurunan)\nMarket Share\n2027"],
  ];
  const H1 = 113, H2 = 215, B1 = 220, B2 = 390;
  const bodyFill = ["F3F7FC", "F3F7FC", "F3F7FC", "F3F7FC", "F3F7FC", "E7F0FA", "F3F7FC", "F3F7FC", "F3F7FC", "F3F7FC", "E7F0FA", "FDEFF1"];
  cols.forEach(([a, b, t], i) => {
    rect(a, H1, b, H2, { r: 0.04, fill: HEAD });
    text(t, a + 2, H1 + 4, b - 2, H2 - 4, { size: 16.5, color: "FFFFFF", ls: 1.05 });
    rect(a, B1, b, B2, { r: 0.04, fill: bodyFill[i], line: "E1E9F3", lw: 0.5 });
  });

  text("2", 43, 290, 98, 322, { size: 20 });
  img(await svgPng(npkSvg(), 640), 128, 238, 286, 316);
  text("NPK", 103, 322, 310, 366, { size: 30, color: "17346A" });

  const bar = (a, b, y, frac, fill, h = 8, pad = 14) => {
    rect(a + pad, y, b - pad, y + h, { r: 0.5, fill: "D7E1EC" });
    rect(a + pad, y, a + pad + (b - a - 2 * pad) * frac, y + h, { r: 0.5, fill });
  };
  const BLUE = "4F8FD8";
  const valueCell = async (ci, Comp, value, unit, frac) => {
    const [a, b] = cols[ci];
    await ic(Comp, ICON, (a + b) / 2, 252, 32);
    text(value, a, 296, b, 330, { size: 19 });
    bar(a, b, 341, frac, BLUE);
    text(unit, a, 358, b, 380, { size: 14 });
  };
  await valueCell(2, io.IoStatsChart, "4,637,556.00", "Ton", 0.6);
  await valueCell(3, bs.BsDatabaseFill, "39,767,042,700,000", "Rp", 0.38);
  await valueCell(4, fa.FaChartPie, "79,816,100,000,000", "Rp", 0.38);
  await valueCell(6, io.IoStatsChart, "4,733,931.00", "Ton", 0.39);
  await valueCell(8, bs.BsDatabaseFill, "40,593,458,325,000", "Rp", 0.37);
  await valueCell(9, fa.FaChartPie, "84,909,850,000,000", "Rp", 0.56);

  const bigCell = async (ci, Comp, iconColor, value, color, frac, fill) => {
    const [a, b] = cols[ci];
    await ic(Comp, iconColor, (a + b) / 2, 252, 32);
    text(value, a, 296, b, 342, { size: ci === 11 ? 33 : 36, color });
    bar(a, b, 358, frac, fill, 9, 16);
  };
  await bigCell(5, fa.FaChartPie, ICON, "50%", "17346A", 0.47, "1E7FE0");
  await bigCell(10, fa.FaChartPie, ICON, "48%", "17346A", 0.48, "1E7FE0");
  await bigCell(11, bs.BsGraphUp, ICON, "-4.05%", "D7263D", 0.44, "E8384F");

  {
    const [a, b] = cols[7];
    await ic(fa.FaCube, ICON, (a + b) / 2, 252, 32);
    text("Ton", a, 314, b, 346, { size: 20, color: "17346A" });
  }

  // ---------- Panel 2: Threshold RAM ----------
  rect(18, 424, 1985, 645, { r: 0.08, fill: "F7FAFD", line: "DCE5F0", shadow: true });
  img(await svgPng(bannerSvg(1967, 66, 1810, 0.8), 1967 * 2), 18, 421, 1985, 487);
  await ic(bs.BsShieldShaded, "FFFFFF", 70, 454, 38);
  slide.addText("Threshold RAM 2027", {
    x: X(110), y: X(432), w: X(700), h: X(44), margin: 0, isTextBox: true,
    fontFace: FONT, fontSize: PT(30), bold: true, color: "FFFFFF", valign: "middle",
  });

  const cards = [
    { a: 42, b: 659, div: 362, top: "2E8B3E", fill: "F3F9F4", line: "D5E8D8", circ: "CFE7D2", Ic: bs.BsGraphUpArrow, icC: "2E7D32",
      title: "Limit", tc: "2E7D32", f: "≥ -1", desc: "Di atas atau sama dengan\n-1 (masih dalam limit)" },
    { a: 682, b: 1313, div: 1015, top: "F5C400", fill: "FFFBEA", line: "F2E6B6", circ: "F7DE84", Ic: tb.TbTargetArrow, icC: "8A6A00",
      title: "Appetite", tc: "9A7300", f: "-3 ≤ x < -1", desc: "Antara -3 sampai kurang\ndari -1 (dalam appetite)" },
    { a: 1334, b: 1965, div: 1671, top: "E3141F", fill: "FDEEF0", line: "F3CDD2", circ: "F0848E", Ic: fa.FaExclamationTriangle, icC: "B3121C",
      title: "Tolerance", tc: "C8151F", f: "-5 ≤ x < -3", desc: "Antara -5 sampai kurang\ndari -3 (dalam tolerance)" },
  ];
  for (const c of cards) {
    rect(c.a, 500, c.b, 622, { r: 0.07, fill: c.top });
    rect(c.a, 506, c.b, 622, { r: 0.06, fill: c.fill, line: c.line, lw: 0.5 });
    rect(c.a + 1, 506, c.b - 1, 516, { fill: c.fill });
    const cx = c.a + 66;
    slide.addShape(pres.shapes.OVAL, { x: X(cx - 44), y: X(563 - 44), w: X(88), h: X(88), fill: { color: c.circ }, line: { type: "none" } });
    await ic(c.Ic, c.icC, cx, 563, 48);
    text(c.title, c.a + 136, 520, c.div - 10, 558, { size: 27, color: c.tc, align: "left" });
    text(c.f, c.a + 136, 562, c.div - 4, 604, { size: 34, color: c.tc, align: "left" });
    slide.addShape(pres.shapes.LINE, { x: X(c.div), y: X(533), w: 0, h: X(62), line: { color: "D3D7DD", width: 0.75 } });
    text(c.desc, c.div + 35, 536, c.b - 10, 592, { size: 18.5, bold: false, color: "2B2B2B", align: "left", ls: 1.1 });
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
