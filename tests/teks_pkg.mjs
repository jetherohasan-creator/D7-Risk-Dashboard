/* Pastikan teks khas PKG tidak muncul di tampilan entitas lain (butir 8.5).
   Kemunculan yang berasal dari DATA (asal kiriman ZA dari PKG, penanda
   lewat_hormuz di jadwal kapal) dilaporkan terpisah dari teks naratif. */
import { createRequire } from 'module'; import path from 'path'; import { execSync } from 'child_process';
const require=createRequire(import.meta.url); const {chromium}=require(path.join(execSync('npm root -g').toString().trim(),'playwright'));
const AKAR=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const POLA=/Gresik|Phonska|belerang|Hormuz|Petroganik/gi;
const DIIZINKAN=[/Pelabuhan Petrokimia Gresik/i, /Lewat Selat Hormuz/i, /lewat_hormuz/i];
const TAB=['stok','produksi','produk','peta','proyeksi','rop','perubahan','sken','simulasi','komposisi','interkoneksi','pangan','keputusan','ringkasan'];
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900}});
let naratif=0;
for(const e of ['PKT','PIM','PSP','PKC']){
  await p.goto('file://'+path.join(AKAR,'Dashboard_CAK_PRI_PIGroup_v3.html')+'#ent='+e); await p.waitForTimeout(500);
  const data=new Set();
  for(const t of TAB){
    await p.evaluate(t=>setTab(t),t); await p.waitForTimeout(80);
    const teks=await p.evaluate(()=>[...document.querySelectorAll('header, #galert, section:not([hidden]) .ent-gen, #gfoot')].filter(x=>x.offsetParent!==null||x.tagName==='HEADER').map(x=>x.innerText).join('\n'));
    teks.split('\n').forEach(baris=>{ const m=baris.match(POLA); if(!m) return;
      const sisa=DIIZINKAN.reduce((s,re)=>s.replace(new RegExp(re.source,'gi'),''),baris);
      if(POLA.test(sisa)){ naratif++; console.log(`  NARATIF ${e}/${t}: ${baris.trim().slice(0,140)}`); }
      else data.add(t+": "+baris.match(/Pelabuhan Petrokimia Gresik|Lewat Selat Hormuz|lewat_hormuz/i)[0]);
      POLA.lastIndex=0; });
  }
  console.log(`${e}: dari data saja → ${[...data].join(', ')||'tidak ada'}`);
}
await b.close();
console.log(naratif?`${naratif} teks naratif PKG bocor`:'Tidak ada teks naratif PKG di entitas lain');
process.exit(naratif?1:0);
