/* Buka setiap modul untuk entitas yang diminta, simpan tangkapan layar, dan
   laporkan galat konsol. Pakai: node tests/tampilan.mjs PKT [dark] [390] [folder] */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const AKAR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [ent='PKT', tema='light', lebar='1280', keluar=path.join(AKAR,'tests','_tangkapan')] = process.argv.slice(2);
fs.mkdirSync(keluar, {recursive:true});
const TAB = ['grup','stok','produksi','produk','peta','proyeksi','rop','perubahan','sken','simulasi','komposisi','interkoneksi','pangan','keputusan','ringkasan'];
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:+lebar, height:900}, reducedMotion:'reduce'});
const galat=[]; p.on('pageerror', e=>galat.push(e.message)); p.on('console', m=>{ if(m.type()==='error') galat.push(m.text()); });
await p.goto('file://' + path.join(AKAR,'Dashboard_CAK_PRI_PIGroup_v3.html') + '#ent=' + ent); await p.waitForTimeout(700);
if(tema==='dark') await p.evaluate(()=>setTheme('dark'));
const lebarLebih=[];
for(const t of TAB){
  const boleh = await p.evaluate(t=>CAK_TABOK(t), t); if(!boleh) continue;
  await p.evaluate(t=>setTab(t), t); await p.waitForTimeout(250);
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if(ov>1) lebarLebih.push(`${t}:${ov}px`);
  await p.screenshot({path:path.join(keluar, `${ent}_${tema}_${lebar}_${t}.png`), fullPage:true});
}
console.log(`${ent} ${tema} ${lebar}px · galat ${galat.length} · gulir horizontal halaman: ${lebarLebih.join(', ')||'tidak ada'}`);
galat.forEach(g=>console.log('  '+g));
await b.close();
process.exit(galat.length?1:0);
