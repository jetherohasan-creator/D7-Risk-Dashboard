/* Uji pemuat multi-berkas: empat xlsx dummy dimuat sekaligus, entitas
   dikenali dari isi/nama berkas, dan hasilnya sama dengan data bawaan.
   Juga menguji peringatan bila sheet hilang (adaptor tidak diam-diam nol).
   Pakai: node tests/pemuat.mjs */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const AKAR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V3 = 'file://' + path.join(AKAR, 'Dashboard_CAK_PRI_PIGroup_v3.html');
const ENT = ['PKT','PIM','PSP','PKC'];
const berkas = ENT.map(k => path.join(AKAR, `data/DUMMY_Dalops_${k}_2026_posisi_8Okt.xlsx`));

const browser = await chromium.launch();
const p = await browser.newPage();
const galat = []; p.on('pageerror', e => galat.push(e.message));
await p.goto(V3 + '#ent=PKT'); await p.waitForTimeout(700);

const ringkas = () => p.evaluate(E => E.map(k => {
  const s = CAK.STORE[k];
  const bb = s.sheets.harian_bahan_baku;
  const stok = bb.filter(r => r.tanggal === s.posisi).map(r => r.kode_material + '=' + r.stok_akhir_t).join(',');
  return `${k} posisi=${s.posisi} dummy=${s.dummy} warn=${s.warn.length} baris=${bb.length} ${stok}`;
}), ENT);
const awal = await ringkas();

await p.setInputFiles('#fileMaster', berkas);
await p.waitForFunction(() => !/^Membaca/.test(document.getElementById('statUnggah').textContent)&&/PKC/.test(document.getElementById('statUnggah').textContent), null, {timeout:30000});
const pesan = await p.evaluate(() => document.getElementById('statUnggah').innerText);
const sesudah = await ringkas();
const sumber = await p.evaluate(E => E.map(k => CAK.STORE[k].sumber + ' · ' + CAK.STORE[k].berkas), ENT);

let gagal = 0;
console.log(pesan);
ENT.forEach((k,i) => { const ok = awal[i] === sesudah[i];
  if(!ok) gagal++; console.log(`${ok?'OK  ':'BEDA'} ${sesudah[i]}  [${sumber[i]}]`); });

/* berkas tanpa sheet ringkasan_gas, dengan nama netral: dikenali dari sheet profil */
const XLSXpath = path.join(os.tmpdir(), 'cak_uji');
fs.mkdirSync(XLSXpath, {recursive:true});
const tanpaGas = path.join(XLSXpath, 'master_bulan_ini.xlsx');
execSync(`python3 -I -c "
import openpyxl,sys; wb=openpyxl.load_workbook(sys.argv[1]); del wb['ringkasan_gas']; wb.save(sys.argv[2])" '${berkas[1]}' '${tanpaGas}'`);
await p.setInputFiles('#fileMaster', [tanpaGas]);
await p.waitForFunction(() => !/^Membaca/.test(document.getElementById('statUnggah').textContent)&&/master_bulan_ini/.test(document.getElementById('statUnggah').textContent), null, {timeout:30000});
const w = await p.evaluate(() => CAK.STORE.PIM.warn.map(x => x.pesan));
console.log('\nBerkas tanpa ringkasan_gas →', await p.evaluate(() => document.getElementById('statUnggah').innerText));
console.log('  peringatan PIM:', w);
if(!w.some(x => /ringkasan_gas/.test(x))) { gagal++; console.log('  GAGAL: peringatan sheet hilang tidak muncul'); }
await p.evaluate(() => CAK.setEntitas('PIM'));
const kotak = await p.evaluate(() => document.querySelector('#gen-stok .cakwarn') ? 'ada' : 'tidak ada');
console.log('  kotak peringatan di modul 01:', kotak);
if(kotak !== 'ada') gagal++;

console.log(`\ngalat konsol: ${galat.length}`); galat.forEach(g => console.log('  ' + g));
await browser.close();
process.exit(gagal || galat.length ? 1 : 0);
