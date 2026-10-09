/* Uji regresi wajib (butir 7.6): seluruh isi modul PKG di v3 harus identik
   dengan v2beta 04 Oktober 2026, di mode terang dan gelap, termasuk setelah
   tuas simulator digeser. Juga memeriksa galat konsol di semua entitas.

   Pakai: node tests/regresi_pkg.mjs   (dari akar repo, setelah src/build.py) */
import { createRequire } from 'module';
import path from 'path';
import { execSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const AKAR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const V2 = 'file://' + path.join(AKAR, 'ref/Dashboard_CAK_PRI_v2beta_04Oktober2026.html');
const V3 = 'file://' + path.join(AKAR, 'Dashboard_CAK_PRI_PIGroup_v3.html');
const TAB = ['stok','produksi','produk','peta','proyeksi','rop','perubahan','sken','simulasi',
             'komposisi','interkoneksi','pangan','keputusan','ringkasan'];
const KEPALA = ['eyeTgl','umur','chipKonsumsi','chipPosisi','pal','alert','foot','tabs'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1280,height:900}, reducedMotion:'reduce' });
const galat = [];
async function buka(url, label){
  const p = await ctx.newPage();
  p.on('pageerror', e => galat.push(`${label}: ${e.message}`));
  p.on('console', m => { if(m.type()==='error') galat.push(`${label}: ${m.text()}`); });
  await p.goto(url); await p.waitForTimeout(900);
  return p;
}
const v2 = await buka(V2, 'v2beta');
const v3 = await buka(V3 + '#ent=PKG', 'v3/PKG');

let beda = 0, cek = 0;
function banding(nama, a, b){
  cek++;
  if(a !== b){
    beda++;
    let i=0; while(i<a.length && a[i]===b[i]) i++;
    console.log(`  BEDA ${nama} @${i}\n    v2: ${JSON.stringify(a.slice(Math.max(0,i-60), i+80))}\n    v3: ${JSON.stringify(b.slice(Math.max(0,i-60), i+80))}`);
  }
}
const isiV2 = (p,t) => p.evaluate(t => document.getElementById('sec-'+t).innerHTML, t);
const isiV3 = (p,t) => p.evaluate(t => document.querySelector('#sec-'+t+' > .ent-pkg').innerHTML, t);
const kepala = (p,id) => p.evaluate(id => { const e=document.getElementById(id); return e? e.innerHTML : null; }, id);

async function putaran(judul){
  console.log('# ' + judul);
  for(const t of TAB){
    await v2.evaluate(t => setTab(t), t); await v3.evaluate(t => setTab(t), t);
    await v2.waitForTimeout(250); await v3.waitForTimeout(250);
    banding(`${judul} · sec-${t}`, await isiV2(v2,t), await isiV3(v3,t));
  }
  for(const id of KEPALA) banding(`${judul} · #${id}`, await kepala(v2,id), await kepala(v3,id));
}

await putaran('terang');
for(const p of [v2,v3]) await p.evaluate(() => setTheme('dark'));
await putaran('gelap');
for(const p of [v2,v3]) await p.evaluate(() => setTheme('light'));

/* tuas skenario tunggal, simulator, proyeksi, dan reorder point */
const geser = async (p, id, v) => p.evaluate(([id,v]) => { const e=document.getElementById(id); e.value=v;
  e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }, [id,v]);
for(const p of [v2,v3]){
  await geser(p,'s_dur',90); await geser(p,'s_sul',60); await geser(p,'s_load',120);
  await geser(p,'s_proj',40); await geser(p,'s_pgd',30);
  await p.evaluate(() => { const b=document.querySelector('[data-preset="pja"]'); if(b) b.click(); });
}
await putaran('setelah tuas digeser');

/* pindah entitas lalu kembali ke PKG: angka harus tetap identik */
for(const k of ['PIG','PKT','PIM','PSP','PKC','PKG']){ await v3.evaluate(k => CAK.setEntitas(k), k); await v3.waitForTimeout(150); }
await putaran('setelah berpindah entitas dan kembali ke PKG');

/* galat konsol di setiap tampilan entitas */
for(const k of ['PIG','PKT','PIM','PSP','PKC']){
  const p = await buka(V3 + '#ent=' + k, 'v3/' + k);
  for(const t of ['grup', ...TAB]) await p.evaluate(t => { if(CAK_TABOK(t)) setTab(t); }, t);
  await p.close();
}

console.log(`\n${cek} pembandingan, ${beda} berbeda; galat konsol: ${galat.length}`);
galat.forEach(g => console.log('  ' + g));
await browser.close();
process.exit(beda || galat.length ? 1 : 0);
