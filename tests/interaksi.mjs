/* Uji interaksi modul generik: preset, tuas, centang sumber, konversi,
   salin ringkasan. Memeriksa tidak ada galat dan keluaran benar-benar berubah. */
import { createRequire } from 'module'; import path from 'path'; import { execSync } from 'child_process';
const require=createRequire(import.meta.url); const {chromium}=require(path.join(execSync('npm root -g').toString().trim(),'playwright'));
const AKAR=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const b=await chromium.launch(); const ctx=await b.newContext({permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage(); const galat=[]; p.on('pageerror',e=>galat.push(e.message)); p.on('console',m=>{ if(m.type()==='error') galat.push(m.text()); });
await p.goto('file://'+path.join(AKAR,'Dashboard_CAK_PRI_PIGroup_v3.html')+'#ent=PKT'); await p.waitForTimeout(500);
let gagal=0; const cek=(nama,ok,info)=>{ console.log(`${ok?'OK  ':'GAGAL'} ${nama}${info?' · '+info:''}`); if(!ok) gagal++; };
const teks=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return e?e.innerText:''; }, sel);
for(const e of ['PKT','PIM','PSP','PKC']){
  await p.evaluate(e=>CAK.setEntitas(e),e);
  /* 09 */
  await p.evaluate(()=>setTab('simulasi'));
  const a=await teks('#gen-simulasi .kpis');
  await p.click('#gen-simulasi [data-g="preset09"][data-v="curtail50"]');
  const b2=await teks('#gen-simulasi .kpis');
  await p.click('#gen-simulasi [data-g="preset09"][data-v="kargo"]');
  const c=await teks('#gen-simulasi table');
  await p.$eval('#gen-simulasi [data-g="s09"][data-k="curtail"]', el=>{ el.value=80; el.dispatchEvent(new Event('input',{bubbles:true})); });
  const d=await teks('#gen-simulasi .verdict');
  cek(`${e} 09 preset & tuas mengubah hasil`, a!==b2 && /80%/.test(d), d.split('\n')[0]);
  /* 08 */
  await p.evaluate(()=>setTab('sken'));
  const s0=await teks('#gen-sken .kpis');
  await p.click('#gen-sken [data-g="preset08"][data-v="stok"]');
  const s1=await teks('#gen-sken .kpis');
  await p.click('#gen-sken [data-g="preset08"][data-v="semua"]');
  await p.click('#gen-sken .gsrc >> nth=0');
  const s2=await teks('#gen-sken .kpis');
  cek(`${e} 08 preset "Hanya stok" & centang sumber`, s0!==s1 && /100,0%/.test(s0), s1.replace(/\n/g,' ').slice(0,90));
  /* 06, 05, 10, 12 */
  await p.evaluate(()=>setTab('rop')); const r0=await teks('#gen-rop table');
  await p.$eval('#gen-rop [data-g="rop"][data-k="pgd"]', el=>{ el.value=45; el.dispatchEvent(new Event('input',{bubbles:true})); });
  cek(`${e} 06 tuas waktu pengadaan`, r0!==await teks('#gen-rop table'));
  await p.evaluate(()=>setTab('proyeksi'));
  await p.$eval('#gen-proyeksi [data-g="projSlider"]', el=>{ el.value=el.max; el.dispatchEvent(new Event('input',{bubbles:true})); });
  cek(`${e} 05 slider tanggal`, /31 Desember 2026/.test(await teks('#gen-proyeksi .projtgl')));
  await p.evaluate(()=>setTab('komposisi'));
  await p.fill('#gen-komposisi [data-g="krJml"]','10');
  cek(`${e} 10 konversi`, /34,4/.test(await teks('#gen-komposisi .kpis')), (await teks('#gen-komposisi .kpis')).replace(/\n/g,' '));
  await p.evaluate(()=>setTab('pangan'));
  await p.$eval('#gen-pangan [data-g="pangan"]', el=>{ el.value=50; el.dispatchEvent(new Event('input',{bubbles:true})); });
  cek(`${e} 12 slider pemenuhan`, /50%/.test(await teks('#gen-pangan .projtgl')));
  await p.evaluate(()=>setTab('interkoneksi'));
  await p.click('#gen-interkoneksi [data-g="ikNode"][data-v="NH3"]');
  cek(`${e} 11 klik node`, /Jalur Amoniak/.test(await teks('#gen-interkoneksi .fbar')));
  await p.evaluate(()=>setTab('ringkasan'));
  await p.click('#gen-ringkasan [data-g="salin"]'); await p.waitForTimeout(150);
  const clip=await p.evaluate(()=>navigator.clipboard.readText());
  cek(`${e} 14 salin teks berpenanda dummy`, /^\[DATA DUMMY/.test(clip), clip.split('\n')[1]);
}
console.log(`galat konsol: ${galat.length}`); galat.forEach(g=>console.log('  '+g));
await b.close(); process.exit(gagal||galat.length?1:0);
