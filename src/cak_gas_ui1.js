/* =====================================================================
   Mesin generik entitas gas — ANTARMUKA (bagian 1: alat bantu, modul 01–07)
   Gaya visual memakai kelas dan token v2beta (card, box, tbl, pill, kpi).
   Warna status tetap: Aman hijau, Waspada kuning, Bahaya merah,
   Netral biru, Nonaktif abu-abu. Aksen entitas tidak dipakai di sini.
   ===================================================================== */
const GUI = (function(){
'use strict';
const U = () => CAK._util;
const esc = s => U().esc(s);
const {f0,f1,f2,tambahHari,selisihHari,rata,jumlah} = GASM;
const tgl  = (iso,b) => U().tglID(iso, b||'short');
const tglP = iso => U().tglID(iso, 'long');
const terang = () => C===THEMES.light;
const SW = s => s==='Aman'?C.pkg : s==='Waspada'?C.amber : s==='Bahaya'?C.red : s==='Netral'?C.steel : C.ink3;
const pill = (s,ket) => s==='Aman'?'<span class="pill p-ok">Aman</span>' : s==='Waspada'?'<span class="pill p-warn">Waspada</span>'
  : s==='Bahaya'?'<span class="pill p-crit">Bahaya</span>' : `<span class="pill">${esc(ket||'—')}</span>`;
const MATW = {
  light:{GAS:'#2E90B8', NH3:'#1F6FA8', KCL:'#7B61C9', DAP:'#B4479A', ZA:'#8A6D3B', CLAY:'#5F7381', Urea:'#2E90B8', NPK:'#7B61C9', Amoniak:'#1F6FA8'},
  dark :{GAS:'#79BDD8', NH3:'#6FB4E8', KCL:'#A994F0', DAP:'#E57FC0', ZA:'#C9A26B', CLAY:'#9FB0BC', Urea:'#79BDD8', NPK:'#A994F0', Amoniak:'#6FB4E8'}};
const WM = k => (terang()?MATW.light:MATW.dark)[k] || C.steel;
const BLN = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLNp = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const sisaHari = iso => iso ? Math.round((new Date(iso+'T00:00:00')-(()=>{const d=new Date(); d.setHours(0,0,0,0); return d;})())/864e5) : null;
const ST = {};                                   /* status antarmuka per entitas */
const st = k => ST[k] = ST[k] || {mati:new Set(), proj:{i:null, mode:'pct'}, rop:{pgd:14,muat:5,aman:10},
  s09:{curtail:30, durasi:30, tripN:'', tripU:'', tundaKCL:0, tundaDAP:0, hentikanJual:false, preset:'curtail'},
  peta:{mat:null}, kr:{arah:'maju', bahan:null, jml:1, sat:'TON'}, pangan:{pct:100}, ik:{sel:null}, s08:{preset:'semua', gasTurun:20}};

/* ---------- potongan tampilan ---------- */
function kepala(tab, ket){ const m=CAK.MODUL[tab]||['',''];
  return `<div class="shead"><span class="snum">${m[0]}</span><h2>${esc(m[1])}</h2>${ket?`<p>${ket}</p>`:''}</div>`; }
function catatanSumber(M, tambahan){
  return `<p class="gfoot-n">Sumber: master Dalops ${esc(M.kode)}${M.dummy?' <b class="dmytx">DUMMY · angka fiktif</b>':''}, posisi data ${tglP(M.pos)}${M.berkas?` (${esc(M.berkas)})`:''}.`
    + ` Konsumsi harian = rata-rata 30 hari realisasi ${tgl(M.awal30)} – ${tgl(M.pos)}.${tambahan?' '+tambahan:''}</p>`;
}
const LABEL_INDIKATIF = '<p class="gindik">Hasil simulasi bersifat <b>indikatif untuk penyaringan awal, bukan pengganti balans resmi</b>.</p>';
function peringatanModul(M, no){
  const w=(CAK.STORE[M.kode].warn||[]).filter(x=>x.modul.includes(no)||x.modul.includes('semua'));
  return w.length ? `<div class="cakwarn"><b>Data untuk modul ini tidak lengkap</b>${w.map(x=>`<div>${esc(x.pesan)}</div>`).join('')}</div>` : '';
}
const belum = teks => `<span class="gbelum">data belum tersedia${teks?' · '+esc(teks):''}</span>`;

/* grafik mini tanpa sumbu */
function mini(v, ref, warnaPaksa, id){
  if(!v||v.length<3) return '';
  const W=118,H=30,p=2; let lo=Math.min(...v), hi=Math.max(...v);
  if(ref!=null && ref>=lo*0.4 && ref<=hi*1.6){ lo=Math.min(lo,ref); hi=Math.max(hi,ref); }
  if(hi-lo<1e-9) hi=lo+1;
  const X=i=>p+i*(W-2*p)/(v.length-1), Y=y=>H-p-(y-lo)*(H-2*p)/(hi-lo);
  const d=v.map((y,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
  const w=warnaPaksa || (v[v.length-1]>=v[0]?C.pkg:C.amber), uid='gm'+(id||Math.random().toString(36).slice(2,8));
  const gr=(ref!=null&&ref>=lo&&ref<=hi)?`<line x1="${p}" x2="${W-p}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" stroke="${C.red}" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>`:'';
  return `<svg class="mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${w}" stop-opacity=".22"/><stop offset="100%" stop-color="${w}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${X(v.length-1).toFixed(1)} ${H} L${X(0).toFixed(1)} ${H} Z" fill="url(#${uid})"/>${gr}
    <path d="${d}" fill="none" stroke="${w}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(v.length-1).toFixed(1)}" cy="${Y(v[v.length-1]).toFixed(1)}" r="2" fill="${w}"/></svg>`;
}

/* grafik garis dengan sumbu, garis acuan, penanda, dan bacaan kursor (attachHover v2beta) */
const PASANG = [];                               /* fungsi yang dijalankan setelah innerHTML terpasang */
function grafik(id, c){
  const W=c.w||900, H=c.h||300, pl=c.pl||52, pr=c.pr||104, pt=c.pt||14, pb=c.pb||26;
  const n=c.x.length; if(!n) return `<div class="gbelum">tidak ada data untuk grafik</div>`;
  const semua=[]; c.series.forEach(s=>s.v.forEach(v=>{ if(v!=null&&isFinite(v)) semua.push(v); }));
  (c.ref||[]).forEach(r=>semua.push(r.y));
  let lo = c.ymin!=null ? c.ymin : Math.min(0,...semua), hi = c.ymax!=null ? c.ymax : Math.max(...semua)*1.06;
  if(hi-lo<1e-9) hi=lo+1;
  const langkah=(()=>{ const r=(hi-lo)/4, m=Math.pow(10,Math.floor(Math.log10(r))); return [1,2,2.5,5,10].map(x=>x*m).find(x=>x>=r)||r; })();
  hi=Math.ceil(hi/langkah)*langkah;
  const X=i=>pl+(n<2?0:i*(W-pl-pr)/(n-1)), Y=v=>pt+(hi-v)*(H-pt-pb)/(hi-lo);
  const yf=c.yfmt||(v=>Math.abs(v)>=1e4?f0(v/1000)+'k':f0(v));
  let g=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(c.judul||'grafik')}">`;
  for(let v=lo; v<=hi+1e-9; v+=langkah) g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${C.line}" stroke-width="1"/>
    <text x="${pl-6}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${C.ink3}">${yf(v)}</text>`;
  let bulanLalu=null;
  c.x.forEach((t,i)=>{ const b=+t.slice(5,7); if(b!==bulanLalu && +t.slice(8,10)<=1+(i===0?31:0)){ g+=`<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${pt}" y2="${H-pb}" stroke="${C.line}" stroke-dasharray="2 4"/>
      <text x="${(X(i)+3).toFixed(1)}" y="${H-8}" font-family="${MONO}" font-size="10" fill="${C.ink3}">${BLNp[b]}</text>`; } bulanLalu=b; });
  (c.vline||[]).forEach(v=>{ g+=`<line x1="${X(v.i).toFixed(1)}" x2="${X(v.i).toFixed(1)}" y1="${pt}" y2="${H-pb}" stroke="${v.warna||C.ink2}" stroke-width="1.2" stroke-dasharray="4 3"/>
      <text x="${(X(v.i)+4).toFixed(1)}" y="${pt+10}" font-family="${MONO}" font-size="9.5" fill="${v.warna||C.ink2}">${esc(v.label)}</text>`; });
  (c.ref||[]).forEach(r=>{ g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(r.y).toFixed(1)}" y2="${Y(r.y).toFixed(1)}" stroke="${r.warna||C.red}" stroke-width="1.1" stroke-dasharray="5 4" opacity=".8"/>
      <text x="${pl+6}" y="${(Y(r.y)-4).toFixed(1)}" font-family="${MONO}" font-size="9.5" fill="${r.warna||C.red}" stroke="${terang()?'#fff':'#18231D'}" stroke-width="3" paint-order="stroke">${esc(r.label)}</text>`; });
  const label=[];
  c.series.forEach(s=>{
    let d='', on=false;
    s.v.forEach((v,i)=>{ if(v==null||!isFinite(v)){ on=false; return; } d+=`${on?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`; on=true; });
    g+=`<path d="${d}" fill="none" stroke="${s.warna}" stroke-width="${s.tebal||2}" ${s.putus?'stroke-dasharray="5 4"':''} stroke-linejoin="round" stroke-linecap="round"/>`;
    const j=s.v.length-1-[...s.v].reverse().findIndex(v=>v!=null&&isFinite(v));
    if(j>=0&&j<s.v.length&&!s.tanpaLabel) label.push({y:Y(s.v[j]), t:s.nama, w:s.warna});
  });
  label.sort((a,b)=>a.y-b.y); for(let i=1;i<label.length;i++) if(label[i].y-label[i-1].y<12) label[i].y=label[i-1].y+12;
  label.forEach(l=>{ g+=`<text x="${W-pr+6}" y="${(l.y+3.5).toFixed(1)}" font-family="${BODYF}" font-size="11" font-weight="600" fill="${l.w}">${esc(l.t)}</text>`; });
  (c.penanda||[]).forEach(m=>{ g+=`<circle cx="${X(m.i).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="4.5" fill="${terang()?'#fff':'#0C1210'}" stroke="${m.warna}" stroke-width="2"><title>${esc(m.judul)}</title></circle>`; });
  g+=`</svg>`;
  PASANG.push(()=>{ if(typeof attachHover==='function') attachHover(id,{vbW:W, n, yTop:pt, yBot:H-pb, tipTop:4, unit:c.unit||'',
    toIndex:u=>(u-pl)/((W-pl-pr)/(Math.max(1,n-1))), toX:X, toY:Y, label:i=>tglP(c.x[i])+(c.labelTambah?c.labelTambah(i):''),
    series:c.series.filter(s=>!s.tanpaHover).map(s=>({name:s.nama, color:s.warna, values:s.v}))}); });
  return `<div class="gchart"><div class="chartwrap" id="${id}">${g}</div></div>`;
}
function barset(judul, o, warna, satuan){
  const ent=Object.entries(o).filter(([,v])=>v!=null&&isFinite(v)); if(!ent.length) return '';
  const mx=Math.max(...ent.map(([,v])=>Math.abs(v)),1);
  return `<div style="margin-bottom:18px"><div class="glab">${esc(judul)}</div>`+ent.map(([k,v])=>`<div class="gbar"><div class="gbn">${esc(k)}</div>
    <div class="bar" style="flex:1;--tone:${warna}"><i style="width:${Math.max(0,v)/mx*100}%"></i></div><div class="gbv">${f1(v)}${satuan?`<small> ${satuan}</small>`:''}</div></div>`).join('')+`</div>`;
}
const tipeKapal = k => k.status==='Terlambat'?'<span class="pill p-warn">Terlambat</span>':k.status==='Tiba'?'<span class="pill p-ok">Tiba</span>':`<span class="pill">${esc(k.status)}</span>`;
const teksKapal = k => k ? `${tgl(k.eta_terkini)} · ${f0(k.volume_t)} t dari ${esc(k.negara_asal)}${k.tunda>0?` <span style="color:${C.amber}">(mundur ${k.tunda} hari)</span>`:''}` : null;
function teksMenyentuh(m, batas, tem){
  if(tem==='sudah') return `<span style="color:${C.red}">sudah di bawah</span>`;
  if(!tem) return 'Tidak sampai Desember';
  const n=sisaHari(tem); return `${n<=0?'hari ini':n+' hari lagi'}<br><span class="gsub">${tgl(tem)}</span>`;
}

/* ---------- peringatan di kepala (pengganti banner v2beta untuk entitas gas) ---------- */
function peringatan(M){
  const s=M.siaga, mats=Object.values(M.mat).filter(m=>m.ada);
  const bahaya=mats.filter(m=>m.status==='Bahaya'), waspada=mats.filter(m=>m.status==='Waspada');
  if(s.lv>=2){
    const p=s.pemicu.filter(x=>x.lv===s.lv);
    /* pemicu tingkat lebih rendah yang sejenis (mis. gas < 95% saat gas < 90% menyala) tidak diulang */
    const awalan=t=>t.split(' ').slice(0,3).join(' ');
    const lain=[...p.slice(1), ...s.pemicu.filter(x=>x.lv<s.lv && !p.some(q=>awalan(q.teks)===awalan(x.teks)))].map(x=>x.teks);
    return {tone:C.red, judul:`Siaga ${s.lv} · ${p[0].teks}`, isi:(lain.length?lain.join('. ')+'. ':'')+'Ambang siaga masih usulan.', ke:'keputusan', label:'Lihat kesimpulan'};
  }
  if(M.gas.status==='Bahaya'||bahaya.length){
    const t=[...(M.gas.status==='Bahaya'?[`Pasokan gas ${f1(M.gas.pct7)}% dari kebutuhan`]:[]), ...bahaya.map(m=>`${m.nama} ${f1(m.pem)}% dari safety stock`)];
    return {tone:C.red, judul:t[0], isi:t.slice(1).join('. '), ke:'stok', label:'Lihat rincian'};
  }
  if(waspada.length||M.gas.status==='Waspada'){
    const m=waspada[0];
    return {tone:C.amber, judul: m?`${m.nama} ${f1(m.pem)}% dari safety stock, status Waspada`:`Pasokan gas ${f1(M.gas.pct7)}% dari kebutuhan`,
      isi: m&&m.kapalBerikut?`Pemulihan menunggu kargo ${tgl(m.kapalBerikut.eta_terkini)} sebesar ${f0(m.kapalBerikut.volume_t)} t.`:'', ke:'stok', label:'Lihat rincian'};
  }
  return null;
}

/* ================= 01 STOK BAHAN BAKU ================= */
function urutKartu(M){
  const non=Object.values(M.mat).filter(m=>m.k!=='NH3');
  non.sort((a,b)=>{ if(!a.ada||!b.ada) return a.ada?-1:1;
    return (GASM.URUT_STATUS[a.status]??3)-(GASM.URUT_STATUS[b.status]??3) || a.pem-b.pem; });
  return [...(M.mat.NH3?[M.mat.NH3]:[]), ...non];
}
function kartuGas(M){
  const g=M.gas; if(!g.ada) return `<div class="card" style="--tone:${C.ink3}"><div class="nm">Gas alam</div>${belum('ringkasan_gas')}</div>`;
  const tone = g.status? SW(g.status) : C.steel;
  const ref = g.aman;
  return `<div class="card" style="--tone:${tone}">
    <div class="nm">Gas alam</div><div class="src">Pipa · ${g.pemasok.length} pemasok · kontrak ${f0(g.kontrak)} BBTUD</div>
    <div class="bigrow"><div class="big">${f1(g.pct7)}<span>% keb. 7 hari</span></div>${mini(g.seri.map(x=>x.pct), ref, null, M.kode+'gas')}</div>
    <div class="doc"><span class="lab">Pasokan vs kebutuhan</span><span class="val" style="font-size:15px;line-height:1.3">${f1(g.pasokan7)} / ${f1(g.kebutuhan7)} BBTUD</span></div>
    <div class="kapal" style="--tone:${C.steel}"><span class="lab">Terhadap kontrak (PJBG)</span><span class="v">${f1(g.kontrakPct7)}% dari ${f0(g.kontrak)} BBTUD kontrak</span></div>
    <div class="note">KRI ${esc(g.kri||'pasokan gas')}: ${g.status?`<b style="color:${tone}">${g.status}</b> (ambang ${g.ambangStatus==='usulan'?'usulan':'resmi'} Aman ≥ ${f0(g.aman)}%, Bahaya &lt; ${f0(g.bahaya)}%${g.ambangStatus==='usulan'?', belum ditetapkan':''}).`:'ambang belum ditetapkan, angka tanpa status.'}
      ${g.hariBawahAman30?` ${g.hariBawahAman30} dari 30 hari terakhir di bawah ${f0(g.aman)}%${g.episodeMulai?`, berturut-turut sejak ${tgl(g.episodeMulai)}`:''}.`:' Tidak ada hari di bawah ambang dalam 30 hari terakhir.'}
      Gas tidak bisa ditimbun; penyangganya stok amoniak di tangki dan urea di gudang. Grafik mini: % pemenuhan 30 hari terakhir.</div></div>`;
}
function kartuMat(M, m){
  if(!m.ada) return `<div class="card" style="--tone:${C.ink3}"><div class="nm">${esc(m.nama)}</div><div class="src">${esc(m.sifat)}</div>${belum('harian_bahan_baku')}</div>`;
  const tone=SW(m.status), nh3=m.k==='NH3';
  const rencana30=m.rencana.slice(0,30).map(x=>x.v);
  const penyangga = m.hariPenyangga!=null ? `${f1(m.hariPenyangga)} hari` : 'tidak menipis';
  return `<div class="card" style="--tone:${tone}">
    <div class="nm">${esc(m.nama)}</div><div class="src">${esc(m.sifat)}</div>
    <div class="bigrow"><div class="big">${f0(m.stok)}<span>ton tercatat</span></div>${mini(rencana30, m.ss, null, M.kode+m.k)}</div>
    <div class="doc"><span class="lab">${nh3?'Penyangga terhadap defisit bersih':'Menyentuh safety stock'}</span>
      <span class="val" style="font-size:15px;line-height:1.3">${nh3?penyangga:teksMenyentuh(m,m.ss,m.temSS)}</span></div>
    <div class="kapal" style="--tone:${nh3?C.steel:(m.status!=='Aman'?tone:C.ink3)}"><span class="lab">${nh3?'Sifat pasokan':'Kedatangan berikutnya'}</span>
      <span class="v">${nh3?`Produksi sendiri ${f0(m.prod30)} t/hari; setara ${f1(m.hariStok)} hari pemakaian kotor`:(teksKapal(m.kapalBerikut)||(m.sifat==='Domestik'?'Pasokan darat berkala, tanpa kapal':'Belum ada kedatangan terjadwal'))}</span></div>
    <div class="note">Safety stock ${f0(m.ss)} t, deadstock ${f0(m.dead)} t. Pemenuhan <b style="color:${tone}">${f1(m.pem)}%</b>. ${narasiMat(M,m)}</div></div>`;
}
function narasiMat(M,m){
  if(m.k==='NH3'){
    const d=m.defisit7;
    return d>0 ? `Stok turun ${f0(d)} t/hari (rata 7 hari) karena produksi di bawah pemakaian; tanpa perbaikan, penyangga di atas deadstock habis dalam ${f1(m.hariPenyangga)} hari.`
               : `Produksi masih menutup pemakaian dan penjualan (stok naik ${f0(-d)} t/hari, rata 7 hari). Inilah penyangga utama bila pasokan gas terganggu.`;
  }
  const t=[];
  if(m.temSS==='sudah') t.push(`Sudah di bawah safety stock${m.kapalBerikut?`; pulih setelah kargo ${tgl(m.kapalBerikut.eta_terkini)}`:''}.`);
  else if(m.temSS) t.push(`Menurut rencana menyentuh safety stock ${tgl(m.temSS)}${m.kapalBerikut&&m.kapalBerikut.eta_terkini>m.temSS?', sebelum kargo berikutnya tiba':''}.`);
  if(m.min&&m.min.pem<100) t.push(`Titik terendah rencana ${f0(m.min.v)} t (${f1(m.min.pem)}%) pada ${tgl(m.min.t)}.`);
  if(m.tertunda.length) t.push(`Kargo ${esc(m.tertunda[0].nama_kapal)} mundur ${m.tertunda[0].tunda} hari${m.tertunda[0].catatan?': '+esc(m.tertunda[0].catatan).toLowerCase():''}.`);
  if(!t.length) t.push('Tidak menyentuh safety stock sampai akhir rencana.');
  return t.join(' ');
}
function m01(M){
  const g=M.gas, kartu=[kartuGas(M), ...urutKartu(M).map(m=>kartuMat(M,m))].join('');
  const mats=urutKartu(M).filter(m=>m.ada);
  const baris = mats.map(m=>`<tr style="--tone:${SW(m.status)}"><td>${esc(m.nama)}</td>
      <td class="gtxt">${esc(m.sifat)}</td><td style="font-weight:600">${f0(m.stok)}</td><td>${f1(m.pakai30)}</td>
      <td style="color:${m.net30>0.5?C.amber:C.pkg}">${(m.net30>0?'−':'+')+f1(Math.abs(m.net30))}</td>
      <td class="gdim">${f0(m.ss)}</td><td style="color:${SW(m.status)};font-weight:600">${f1(m.pem)}%</td>
      <td>${m.k==='NH3'?'—':teksMenyentuh(m,m.ss,m.temSS)}</td><td class="gdim">${f0(m.dead)}</td><td>${teksMenyentuh(m,m.dead,m.temDead)}</td>
      <td class="gtxt" style="min-width:150px">${m.k==='NH3'?'Produksi sendiri':(teksKapal(m.kapalBerikut)||'—')}</td><td>${pill(m.status)}</td></tr>`).join('');
  const gasRow = g.ada ? `<tr style="--tone:${SW(g.status)}"><td>Gas alam</td><td class="gtxt">Pipa (PJBG)</td><td style="font-weight:600">${f1(g.pasokan7)} BBTUD</td>
      <td>${f1(g.pakai30)} BBTUD</td><td style="color:${g.pasokan7<g.kebutuhan7?C.amber:C.pkg}">${(g.pasokan7<g.kebutuhan7?'−':'+')+f1(Math.abs(g.pasokan7-g.kebutuhan7))}</td>
      <td class="gdim">keb. ${f1(g.kebutuhan7)}</td><td style="color:${SW(g.status)};font-weight:600">${f1(g.pct7)}%</td><td>—</td><td class="gdim">—</td><td>—</td>
      <td class="gtxt">Aliran harian, tidak ditimbun</td><td>${pill(g.status,'tanpa ambang')}${g.ambangStatus==='usulan'?'<div class="gsub">ambang usulan</div>':''}</td></tr>` : '';
  /* KRI pemenuhan safety stock non-gas */
  const non=mats.filter(m=>m.k!=='NH3');
  const ssKartu = mats.map(m=>`<div class="card" style="--tone:${SW(m.status)}"><div class="nm">${esc(m.nama)}</div><div class="src">safety stock ${f0(m.ss)} ton</div>
      <div class="big">${f1(m.pem)}<span>% pemenuhan</span></div>
      <div class="doc"><span class="lab">Status KRI</span><span class="val" style="color:${SW(m.status)}">${m.status}</span></div>
      <div class="note">${m.k==='NH3'?'KRI Pemenuhan Safety Stock Amoniak (penyangga gas).':'KRI Pemenuhan Safety Stock Bahan Baku Non-Gas.'}</div></div>`).join('');
  const ssTbl = mats.map(m=>`<tr><td>${esc(m.nama)}</td><td>${f0(m.stok)} t</td><td>${f0(m.ss)} t</td>
      <td style="color:${m.stok>=m.ss?C.pkg:C.red}">${(m.stok>=m.ss?'+':'−')+f0(Math.abs(m.stok-m.ss))} t</td>
      <td style="color:${SW(m.status)};font-weight:600">${f1(m.pem)}%</td><td>${pill(m.status)}</td>
      <td>${m.temSS==='sudah'?'sedang berlangsung':m.temSS?tgl(m.temSS):'—'}</td><td>${m.temBahaya==='sudah'?'sedang berlangsung':m.temBahaya?tgl(m.temBahaya):'—'}</td>
      <td>${m.min?`${f1(m.min.pem)}% · ${tgl(m.min.t)}`:'—'}</td></tr>`).join('');
  /* KRI gas per pemasok */
  const gasTbl = g.ada ? g.pemasok.map(p=>`<tr><td>${esc(p.nama)}</td><td>${f0(p.kontrak)}</td><td>${f1(p.rata7)}</td>
      <td>${f1(p.pct7)}%</td><td>${f1(p.pct30)}%</td></tr>`).join('')
      + `<tr style="border-top:2px solid ${C.line2}"><td style="font-weight:700">Jumlah · terhadap kebutuhan</td><td style="font-weight:700">${f0(g.kontrak)}</td>
         <td style="font-weight:700">${f1(g.pasokan7)}</td><td style="font-weight:700">${f1(g.kontrakPct7)}% kontrak · <span style="color:${SW(g.status)}">${f1(g.pct7)}% kebutuhan</span></td><td style="font-weight:700">${f1(g.kontrakPct30)}% · ${f1(g.pct30)}%</td></tr>` : '';
  /* jadwal kedatangan */
  const kap=M.kapal.filter(k=>k.mendatang || (k.eta_terkini>tambahHari(M.pos,-30)&&k.eta_terkini<=M.pos));
  const jadwal = kap.length ? kap.map(k=>`<div class="gjad"><span><b style="color:${WM(k.k)}">${esc(k.material)}</b> · ${esc(k.nama_kapal)}<br>
      <span class="gsub">${esc(k.negara_asal)} · ${esc(k.pelabuhan_muat)}${k.tunda>0?` · ETA awal ${tgl(k.eta_awal)}`:''}</span></span>
      <span class="gjv">${f0(k.volume_t)} t<br><span class="gsub">${tgl(k.eta_terkini)}</span> ${tipeKapal(k)}</span></div>`).join('')
    : '<p class="gsub">Tidak ada kargo dalam 30 hari terakhir maupun yang dijadwalkan.</p>';
  const ber=M.statusUnit.filter(u=>!/beroperasi/i.test(u.status)), jalan=M.statusUnit.filter(u=>/beroperasi/i.test(u.status));
  const unit = ber.map(u=>`<div class="gunit"><span class="glv" style="color:${C.red}">${esc(u.status)}</span><b>${esc(u.unit)}</b>
      <div class="gsub">${esc(u.keterangan||'')}${u.mulai?` · ${tgl(u.mulai)} – ${tgl(u.selesai)}`:''}</div></div>`).join('')
    + `<p class="gsub" style="margin-top:12px">Beroperasi normal: ${jalan.map(u=>esc(u.unit)).join(', ')||'—'}.</p>`;
  return kepala('stok',`Posisi ${tglP(M.pos)}. Gas diukur sebagai aliran harian terhadap kebutuhan; amoniak di tangki dan bahan NPK diukur terhadap safety stock Kesepakatan PI Group. Kartu diurutkan menurut kemendesakan.`)
    + peringatanModul(M,'01')
    + `<div class="cards">${kartu}</div>
    <div style="margin-top:24px;overflow-x:auto"><table class="tbl"><thead><tr><th>Material</th><th>Sifat<br>pasokan</th><th>Stok<br>tercatat</th><th>Konsumsi/hari</th><th>Selisih<br>harian</th>
      <th>Safety<br>stock</th><th>Pemenuhan</th><th>Menyentuh<br>safety stock</th><th>Dead<br>stock</th><th>Menyentuh<br>deadstock</th><th>Kedatangan<br>berikutnya</th><th>Status KRI</th></tr></thead>
      <tbody>${gasRow}${baris}<tr><td colspan="12" class="gtblnote">Selisih harian = kedatangan + produksi − pemakaian − penjualan/transfer, rata-rata 30 hari (− berarti stok menipis). Baris gas: pasokan dan kebutuhan rata-rata 7 hari dalam BBTUD. Kolom <b>menyentuh</b> dibaca dari kurva rencana sampai Desember, bukan rata-rata masa lalu.</td></tr></tbody></table></div>
    <div class="grid2" style="margin-top:20px">
      <div class="box"><h3>KRI Pemenuhan Pasokan Gas</h3><p class="note-p" style="margin:-4px 0 12px">Pasokan aktual terhadap kebutuhan operasi (status) dan terhadap kontrak PJBG (informasi). Ambang ${g.ambangStatus==='usulan'?'usulan 95% / 90%, belum ditetapkan':'resmi'}.</p>
        ${g.ada?`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Pemasok / lapangan</th><th>Kontrak<br>BBTUD</th><th>Rata 7 hari<br>BBTUD</th><th>% kontrak<br>7 hari</th><th>% kontrak<br>30 hari</th></tr></thead><tbody>${gasTbl}</tbody></table></div>
        <p class="gsub" style="margin-top:10px">Kontrak lebih besar dari kebutuhan operasi, sehingga % kontrak wajar di bawah 100%. Yang dinilai sebagai KRI adalah % kebutuhan.</p>`:belum('harian_gas')}</div>
      <div class="box"><h3>Pemenuhan Safety Stock</h3><p class="note-p" style="margin:-4px 0 12px">KRI Pemenuhan Safety Stock Bahan Baku Non-Gas: Aman ≥ 100%, Waspada 92,25% s.d. &lt; 100%, Bahaya &lt; 92,25%. Safety stock dari Kesepakatan PI Group.</p>
        <div class="cards gcards-s">${ssKartu}</div></div>
    </div>
    <div class="box" style="margin-top:20px"><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bahan Baku</th><th>Posisi stock</th><th>Safety Stock</th><th>Selisih</th><th>Pemenuhan</th><th>Status</th>
      <th>Masuk Waspada<br>(turun di bawah SS)</th><th>Masuk Bahaya<br>(di bawah 92,25%)</th><th>Titik terendah</th></tr></thead><tbody>${ssTbl}</tbody></table></div></div>
    <div class="grid2" style="margin-top:20px">
      <div class="box"><h3>Jadwal kedatangan</h3>${jadwal}</div>
      <div class="box"><h3>Status unit penting</h3>${unit}</div>
    </div>` + catatanSumber(M,'Safety stock dan deadstock adalah garis peringatan, bukan pengurang stok.');
}

/* ================= 02 PRODUKSI & KONSUMSI ================= */
function m02(M){
  const bln=+M.pos.slice(5,7);
  const prodUrut=['Amoniak','Urea','NPK'].filter(p=>M.produk[p]).concat(Object.keys(M.produk).filter(p=>!['Amoniak','Urea','NPK'].includes(p)));
  const baris = prodUrut.map(p=>{
    const us=M.unit.filter(u=>u.produk===p), o=M.produk[p];
    return us.map(u=>{ const mati=u.status&&!/beroperasi/i.test(u.status.status);
      return `<tr${mati?` style="color:${C.ink3}"`:''}><td>${esc(u.unit)}${mati?` <span class="pill p-crit" title="${esc(u.status.keterangan||'')}">${esc(u.status.status)}</span>`:''}</td>
        <td>${u.hari?f1(u.hari):'—'}</td><td>${f1(u.pctBln)}%</td><td>${f1(u.pctThn)}%</td><td>${f1(u.pctProrata)}%</td>
        <td>${u.onMtd}/${u.hMtd} · ${u.onYtd}/${u.hYtd}</td><td>${f0(u.avg30)}</td></tr>`; }).join('')
      + `<tr class="gsubtot"><td>Jumlah ${esc(p)}</td><td>${f1(o.hari)}</td><td>${f1(o.pctBln)}%</td><td>${f1(o.pctThn)}%</td>
         <td style="color:${GUI.statusProd(o.pctProrata)?SW(GUI.statusProd(o.pctProrata)):C.ink}">${f1(o.pctProrata)}%</td><td></td><td>${f0(o.avg30)}</td></tr>`;
  }).join('');
  const g=M.gas, sp=g.spesifik||{};
  const devN = sp.acuanNh3? (sp.nh3/sp.acuanNh3-1)*100 : null, devU = sp.acuanUrea? (sp.urea/sp.acuanUrea-1)*100 : null;
  const nh3=M.mat.NH3||{}, ureaAvg=(M.produk.Urea||{}).avg30||0, nh3Avg=(M.produk.Amoniak||{}).avg30||0, npkAvg=(M.produk.NPK||{}).avg30||0;
  const gasKe = g.ada ? {'Ke pabrik amoniak':nh3Avg*(M.r.gasPerNH3||0)/1000, 'Ke pabrik urea (utilitas)':ureaAvg*(M.r.gasPerUrea||0)/1000} : {};
  if(g.ada){ const sisa=g.pakai30-jumlah(Object.values(gasKe)); gasKe['Lain-lain / selisih']=sisa; }
  const rUreaNPK = M.resepNPK(/urea/i);
  const bahanNPK = {}; Object.values(M.mat).filter(m=>m.ada&&m.k!=='NH3').forEach(m=>bahanNPK[m.nama]=m.pakai30);
  if(rUreaNPK) bahanNPK['Urea internal (rasio)']=npkAvg*rUreaNPK;
  const spark = [ ...(g.ada?[{k:'GAS',nm:'Pasokan gas (BBTUD)',v:g.seri45.map(x=>x.pasokan),t:g.seri45.map(x=>x.t)}]:[]),
    ...Object.values(M.mat).filter(m=>m.ada).map(m=>({k:m.k,nm:m.nama,v:m.seri45.map(x=>x.v),t:m.seri45.map(x=>x.t)}))];
  const sp45 = spark.map(s=>{ const w=230,h=64,mn=Math.min(...s.v),mx=Math.max(...s.v),rg=(mx-mn)||1, up=s.v[s.v.length-1]>=s.v[0];
    const pts=s.v.map((v,i)=>`${(i/(s.v.length-1)*w).toFixed(1)},${(h-6-(v-mn)/rg*(h-14)).toFixed(1)}`).join(' ');
    PASANG.push(()=>{ if(typeof attachHover==='function') attachHover('gsw-'+M.kode+s.k,{vbW:w,n:s.v.length,yTop:0,yBot:h,tipTop:4,unit:s.k==='GAS'?'':' t',
      toIndex:u=>u/w*(s.v.length-1), toX:i=>i/(s.v.length-1)*w, toY:v=>h-6-(v-mn)/rg*(h-14), label:i=>s.nm+' · '+tgl(s.t[i]),
      series:[{name:s.k==='GAS'?'Pasokan':'Stok',color:up?C.pkg:C.amber,values:s.v}]}); });
    return `<div><div class="gspk"><span>${esc(s.nm)}</span><span style="color:${up?C.pkg:C.amber}">${s.k==='GAS'?f1(s.v[s.v.length-1]):f0(s.v[s.v.length-1])}</span></div>
      <div class="chartwrap" id="gsw-${M.kode}${s.k}"><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up?C.pkg:C.amber}" stroke-width="1.6"/></svg></div>
      <div class="gspd"><span>${tgl(s.t[0])}</span><span>${tgl(s.t[s.t.length-1])}</span></div></div>`; }).join('');
  return kepala('produksi',`Realisasi produksi harian per unit ${tglP(M.pos)} beserta capaiannya terhadap RKAP 2026. Aliran bahan baku memakai rata-rata 30 hari, ${tgl(M.awal30)} sampai ${tgl(M.pos)}.`)
    + peringatanModul(M,'02')
    + `<div class="grid2"><div class="box"><h3>Produksi per unit</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Unit produksi</th><th>Realisasi<br>${tgl(M.pos)}</th>
      <th title="Akumulasi bulan berjalan terhadap RKAP bulan itu">% RKAP<br>${BLN[bln]}</th><th>% RKAP<br>2026</th><th title="Akumulasi tahun berjalan terhadap RKAP sampai tanggal posisi (pro-rata)">% RKAP<br>s.d. posisi</th>
      <th>On-stream<br>bln · thn (hari)</th><th>Rata 30<br>hari (t)</th></tr></thead><tbody>${baris}
      <tr><td colspan="7" class="gtblnote">% RKAP bulan dan tahun membandingkan akumulasi realisasi dengan RKAP bulan dan RKAP 2026 penuh, sama seperti versi PKG. Kolom <b>s.d. posisi</b> membandingkan dengan RKAP yang seharusnya tercapai sampai ${tgl(M.pos)} (pro-rata harian) dan dipakai untuk KRI produksi. On-stream = hari dengan produksi &gt; 0.</td></tr></tbody></table></div></div>
      <div class="box"><h3>Ke mana bahan baku terpakai</h3><p class="note-p" style="margin:-6px 0 14px">Rata-rata ${tgl(M.awal30)} sampai ${tgl(M.pos)}.</p>
        ${barset('Gas alam — pemakaian (BBTUD)', gasKe, WM('GAS'))}
        ${nh3.ada?barset('Amoniak — asal pasokan (t/hari)', {'Produksi sendiri':nh3.prod30,'Kedatangan':nh3.datang30}, C.pkg):''}
        ${nh3.ada?barset('Amoniak — pemakaian (t/hari)', {'Pabrik urea':nh3.pakai30,'Dijual / transfer':nh3.jual30}, C.amber):''}
        ${barset('Pabrik NPK — bahan masuk (t/hari)', bahanNPK, WM('NPK'))}
        <p class="gsub">Gas ke amoniak dan urea dihitung dari produksi × cons-rate Dalops (${f1(M.r.gasPerNH3)} dan ${f1(M.r.gasPerUrea)} MMBTU/t); selisih terhadap pemakaian aktual dicatat sebagai lain-lain.</p></div></div>
    <div class="box" style="margin-top:18px"><h3>Konsumsi gas spesifik</h3>
      <div class="kpis"><div class="kpi"><div class="l">Gas per ton amoniak</div><div class="v">${f2(sp.nh3)}<small> MMBTU/t</small></div><div class="gsub">acuan cons-rate ${f1(sp.acuanNh3)} · ${devN==null?'—':(devN>0?'+':'')+f1(devN)+'%'}</div></div>
      <div class="kpi"><div class="l">Gas per ton urea</div><div class="v">${f2(sp.urea)}<small> MMBTU/t</small></div><div class="gsub">acuan cons-rate ${f1(sp.acuanUrea)} · ${devU==null?'—':(devU>0?'+':'')+f1(devU)+'%'}</div></div>
      <div class="kpi"><div class="l">Desain pabrik</div><div class="v" style="font-size:14px">${belum('[ISI]')}</div><div class="gsub">angka desain per unit belum ada di Dalops</div></div></div>
      <p class="gsub">Rata-rata 30 hari realisasi. Angka di atas acuan berarti pabrik memakai gas lebih boros per ton; perlu dibaca bersama beban pabrik (beban rendah biasanya menaikkan konsumsi spesifik).</p></div>
    <div class="box" style="margin-top:18px"><h3>Pergerakan stok 45 hari terakhir</h3><p class="note-p" style="margin:-6px 0 10px">Realisasi harian sampai ${tglP(M.pos)}.</p>
      <div class="gsparks">${sp45}</div></div>` + catatanSumber(M);
}

/* ================= 03 STOK PRODUK LINI I ================= */
function m03(M){
  if(!M.lini1.length) return kepala('produk') + peringatanModul(M,'03') + `<div class="box">${belum('stok_produk_lini1')}</div>`;
  const tertinggi=M.lini1.filter(p=>p.hari!=null).sort((a,b)=>b.hari-a.hari)[0];
  const kartu=M.lini1.map(p=>`<div class="card" style="--tone:${C.steel}"><div class="nm">${esc(p.produk)}</div><div class="src">Gudang Lini I pabrik, harian</div>
      <div class="bigrow"><div class="big">${f0(p.stok)}<span>ton</span></div>${mini(p.seri30.map(x=>x.v), null, C.steel, M.kode+'l1'+p.produk.replace(/\W/g,''))}</div>
      <div class="doc"><span class="lab">Setara hari penyaluran</span><span class="val">${p.hari==null?'penyaluran nihil':f1(p.hari)}</span></div>
      <div class="note">Stok ${p.tren>=0?'menumpuk':'menipis'} ${f1(Math.abs(p.tren))} ton/hari dalam 30 hari terakhir. ${p.curah?`Ditambah ${f0(p.curah)} ton curah di pabrik.`:''}${p===tertinggi&&M.lini1.length>1?' Setara hari tertinggi di antara produk.':''}</div></div>`).join('');
  const rows=M.lini1.map(p=>`<tr><td>${esc(p.produk)}</td><td>${f0(p.stok)}</td><td>${f1(p.masuk30)}</td><td>${f1(p.salur30)}</td>
      <td style="color:${p.tren>=0?C.steel:C.amber}">${(p.tren>=0?'+':'−')+f1(Math.abs(p.tren))} t/hari</td><td>${p.hari==null?'—':f1(p.hari)}</td><td>${p.curah==null?'—':f0(p.curah)}</td><td class="gdim">harian, ${tgl(M.pos)}</td></tr>`).join('');
  const sorot = tertinggi ? `<p class="note-p" style="margin-top:12px">Jadi artinya: ${esc(tertinggi.produk)} di Lini I setara <b>${f1(tertinggi.hari)} hari</b> penyaluran${tertinggi.tren>0?` dan masih bertambah ${f0(tertinggi.tren)} t/hari — masuk dari pabrik (${f0(tertinggi.masuk30)} t/hari) lebih cepat dari penyaluran (${f0(tertinggi.salur30)} t/hari). Penumpukan seperti ini menandakan hambatan di sisi distribusi, bukan di sisi pasokan bahan baku`:''}.</p>` : '';
  return kepala('produk','Gudang Lini I di pabrik — titik pertama distribusi sebelum Lini II hingga IV.') + peringatanModul(M,'03')
    + `<div class="cards">${kartu}</div><div style="margin-top:24px;overflow-x:auto"><table class="tbl"><thead><tr><th>Produk</th><th>Stok</th><th>Masuk/hari</th><th>Penyaluran/hari</th><th>Tren 30 hari</th><th>Setara hari penyaluran</th><th>Curah di pabrik</th><th>Granularitas</th></tr></thead>
      <tbody>${rows}<tr><td colspan="8" class="gtblnote">Setara hari penyaluran adalah stok dibagi rata-rata penyaluran keluar per hari (30 hari). Belum ada ambang resmi untuk stok produk, jadi ditampilkan sebagai Netral.</td></tr></tbody></table></div>${sorot}`
    + catatanSumber(M);
}

/* ================= 05 PROYEKSI HARIAN ================= */
function m05(M){
  const S=st(M.kode), mats=Object.values(M.mat).filter(m=>m.ada);
  if(!mats.length) return kepala('proyeksi')+peringatanModul(M,'05')+`<div class="box">${belum('harian_bahan_baku')}</div>`;
  const awal=tambahHari(M.pos,-29);
  const x=mats[0].realisasi.filter(r=>r.t>=awal).map(r=>r.t).concat(mats[0].rencana.map(r=>r.t));
  const iPos=x.indexOf(M.pos);
  const pct=S.proj.mode==='pct';
  const nilai=(m,t)=>{ const r=(t<=M.pos?m.realisasi:m.rencana).find(z=>z.t===t); return r? r.v : null; };
  const series=mats.map(m=>({nama:m.nama, warna:WM(m.k), v:x.map(t=>{ const v=nilai(m,t); return v==null?null:(pct?v/m.ss*100:v); })}));
  const penanda=[]; M.kapal.filter(k=>k.mendatang).forEach(k=>{ const m=M.mat[k.k]; const i=x.indexOf(k.eta_terkini); if(!m||i<0) return;
    const v=nilai(m,k.eta_terkini); penanda.push({i, y:pct?v/m.ss*100:v, warna:WM(m.k), judul:`${m.nama} · ${tgl(k.eta_terkini)} · ${f0(k.volume_t)} t · ${k.nama_kapal} (${k.negara_asal})`}); });
  const ref = pct ? [{y:100,label:'safety stock',warna:C.amber},{y:92.25,label:'batas Bahaya',warna:C.red}] : [];
  const iSel = S.proj.i==null||S.proj.i>=x.length ? iPos : S.proj.i;
  const tSel=x[iSel];
  const ch=grafik('gproj-'+M.kode,{x, series, ref, penanda, vline:[{i:iPos,label:'posisi data'},...(iSel!==iPos?[{i:iSel,label:tgl(tSel),warna:C.steel}]:[])],
    yfmt: pct?(v=>f0(v)+'%'):undefined, unit: pct?'%':' t', judul:'Kurva posisi stok sampai Desember'});
  const kartu=mats.map(m=>{ const v=nilai(m,tSel), p=v/m.ss*100, s=GASM.statusPct(p,m.aman,m.bahaya), v0=m.stok;
    return `<div class="card" style="--tone:${SW(s)}"><div class="nm">${esc(m.nama)}</div><div class="src">${tSel<=M.pos?'realisasi':'posisi stok menurut rencana'}</div>
      <div class="big">${f0(v)}<span>ton</span></div><div class="doc"><span class="lab">${f1(p)}% safety stock</span><span class="val" style="color:${SW(s)}">${s}</span></div>
      <div class="note">Dibanding posisi ${tgl(M.pos)}: ${(v-v0>=0?'+':'−')+f0(Math.abs(v-v0))} t.</div></div>`; }).join('');
  const g=M.gas;
  const neraca = g.ada ? `<div class="box" style="margin-top:18px"><h3>Neraca gas bulanan</h3><p class="note-p" style="margin:-4px 0 12px">Rata-rata harian per bulan, realisasi sampai posisi data lalu rencana Dalops.</p>
    <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bulan</th><th>Jenis</th><th>Kontrak<br>BBTUD</th><th>Pasokan<br>BBTUD</th><th>Kebutuhan<br>BBTUD</th><th>Pemenuhan</th><th>Status (ambang ${g.ambangStatus||'resmi'})</th></tr></thead><tbody>`
    + g.bulanan.map(b=>{ const s=GASM.statusPct(b.pct,g.aman,g.bahaya); return `<tr><td>${BLN[b.bulan]}</td><td class="gdim">${b.jenis}</td><td>${f1(b.kontrak)}</td><td>${f1(b.pasokan)}</td><td>${f1(b.kebutuhan)}</td>
      <td style="color:${SW(s)};font-weight:600">${f1(b.pct)}%</td><td>${pill(s)}</td></tr>`; }).join('') + `</tbody></table></div>
    <p class="gsub" style="margin-top:10px">Bulan rencana mengikuti angka yang dimasukkan perencana ke Dalops; bila rencana sudah memperhitungkan pembatasan, pemenuhannya terbaca 100% walau produksi turun.</p></div>` : '';
  return kepala('proyeksi',`Rencana master sampai Desember. Lingkaran menandai kedatangan kargo. Geser slider untuk melihat posisi seluruh material pada tanggal tertentu.`)
    + peringatanModul(M,'05')
    + `<div class="box"><div class="gtoolbar"><h3 style="margin:0">Kurva posisi stok sampai Desember</h3>
      <div class="krmode"><button type="button" data-g="projMode" data-v="pct" class="${pct?'on':''}">% safety stock</button><button type="button" data-g="projMode" data-v="ton" class="${pct?'':'on'}">ton</button></div></div>
      ${ch}<p class="gsub">${pct?'Skala % safety stock menaruh semua material pada satu sumbu; garis 100% adalah safety stock dan 92,25% batas Bahaya.':'Skala ton: amoniak jauh lebih besar dari bahan NPK, gunakan skala % untuk membandingkan.'} Arahkan kursor ke lingkaran untuk melihat kargo.</p></div>
    <div class="box" style="margin-top:18px"><div class="lab2">Posisi stok tanggal</div><div class="projtgl">${tglP(tSel)}</div>
      <input type="range" min="0" max="${x.length-1}" step="1" value="${iSel}" data-g="projSlider" aria-label="Tanggal proyeksi" style="width:100%;margin:10px 0 4px">
      <div class="cards" style="margin-top:12px">${kartu}</div></div>${neraca}`
    + catatanSumber(M,'Kurva dibaca dari rencana perusahaan sendiri, bukan rata-rata pemakaian masa lalu.');
}

/* ================= 06 REORDER POINT ================= */
function hitungRop(M){
  const S=st(M.kode).rop;
  const mats=Object.values(M.mat).filter(m=>m.ada && m.k!=='NH3' && M.kapal.some(k=>k.k===m.k));
  const bongkar=3;                                  /* hari sandar & bongkar, sama dengan asumsi PKG (D.sail.portDays) */
  return mats.map(m=>{
    const kp=M.kapal.filter(k=>k.k===m.k), layar=rata(kp.map(k=>+k.waktu_layar_hari||0));
    const tunggu=S.pgd+S.muat+layar+bongkar;
    const rop=(tunggu+S.aman)*m.pakai30;
    const lewat=m.rencana.find(r=>r.v<=rop);
    const pesan = m.stok<=rop ? 'sekarang' : lewat ? lewat.t : null;
    const tglPesan = pesan==='sekarang'?M.pos : pesan ? tambahHari(pesan,0) : null;
    return {m, layar, tunggu, rop, pesan, tglPesan, perlu: m.stok<=rop, asal:[...new Set(kp.map(k=>k.negara_asal))].join(', '),
      tibaJikaPesan: tglPesan? tambahHari(tglPesan, Math.round(tunggu)) : null,
      kapalBerikut: m.kapalBerikut};
  });
}
function m06(M){
  const S=st(M.kode).rop, R=hitungRop(M), P=M.P;
  const isiRop = P.rop&&P.rop.pengadaan!=null;
  const rows=R.map(r=>`<tr><td>${esc(r.m.nama)}</td><td class="gtxt">${esc(r.asal)}</td><td>${f1(r.tunggu)} hari</td><td>${f0(r.rop)} t</td><td>${f0(r.m.stok)} t</td>
    <td>${r.perlu?'<span class="pill p-crit">perlu pesan</span>':r.pesan?`<span class="pill p-warn">${tgl(r.pesan)}</span>`:'<span class="pill p-ok">belum perlu</span>'}</td>
    <td>${r.kapalBerikut?`${tgl(r.kapalBerikut.eta_terkini)} · ${f0(r.kapalBerikut.volume_t)} t`:'—'}</td>
    <td>${r.m.temDead==='sudah'?'sudah':r.m.temDead?tgl(r.m.temDead):'tidak sampai Des'}</td></tr>`).join('');
  const urai=R.map(r=>{ const seg=[['Pengadaan sampai kontrak efektif',S.pgd,C.steel],['Penunjukan kapal & muat',S.muat,C.ink3],[`Pelayaran rata-rata dari ${r.asal}`,r.layar,C.pkg],['Sandar & bongkar',3,C.pkg2],['Stok pengaman',S.aman,C.amber]];
    const tot=jumlah(seg.map(s=>s[1]));
    return `<div class="gurai"><div class="gspk"><b>${esc(r.m.nama)}</b><span>${f1(r.tunggu)} hari tunggu + ${S.aman} hari pengaman × ${f1(r.m.pakai30)} t/hari = <b>${f0(r.rop)} ton</b></span></div>
      <div class="gstack">${seg.map(s=>`<i style="width:${s[1]/tot*100}%;background:${s[2]}" title="${esc(s[0])}: ${f1(s[1])} hari"></i>`).join('')}</div>
      <div class="gsub">${seg.map(s=>`<span style="white-space:nowrap"><b style="color:${s[2]}">■</b> ${esc(s[0])} ${f1(s[1])} hr</span>`).join(' · ')}</div>
      <div class="gsub">${r.perlu?`Stok sudah di bawah reorder point; pesanan baru hari ini tiba sekitar ${tgl(r.tibaJikaPesan)}.`:r.pesan?`Stok rencana menyentuh reorder point ${tgl(r.pesan)}; pesanan paling lambat dibuat saat itu agar tiba sekitar ${tgl(r.tibaJikaPesan)}.`:'Stok rencana tidak menyentuh reorder point sampai Desember.'}</div></div>`; }).join('');
  return kepala('rop','Tingkat stok saat pesanan berikutnya harus dibuat, memperhitungkan waktu pengadaan, layar, dan bongkar. Hanya material impor/beli lewat laut; gas dan amoniak produksi sendiri tidak memakai reorder point.')
    + peringatanModul(M,'06')
    + `<div class="grid2"><div class="ctrl"><h3>Asumsi waktu tunggu</h3>
      <p class="hint">${isiRop?'Dari profil entitas.':'<b style="color:var(--amber)">[ISI]</b> Asumsi waktu tunggu '+esc(M.kode)+' belum ditetapkan; nilai awal memakai asumsi acuan versi PKG.'} Waktu layar dari jadwal kapal Dalops (12,5 knot).</p>
      <div class="fld"><label>Pengadaan sampai kontrak efektif <b>${S.pgd} hari</b></label><input type="range" min="0" max="60" step="1" value="${S.pgd}" data-g="rop" data-k="pgd"></div>
      <div class="fld"><label>Penunjukan kapal &amp; muat <b>${S.muat} hari</b></label><input type="range" min="0" max="30" step="1" value="${S.muat}" data-g="rop" data-k="muat"></div>
      <div class="fld"><label>Stok pengaman <b>${S.aman} hari pemakaian</b></label><input type="range" min="0" max="45" step="1" value="${S.aman}" data-g="rop" data-k="aman"></div>
      <p class="gsub">Reorder point = (waktu tunggu + stok pengaman) × pemakaian rata-rata 30 hari.${P.pelabuhan&&P.pelabuhan.darat?' '+esc(P.pelabuhan.darat)+'; waktu darat belum masuk hitungan.':''}</p></div>
      <div class="box"><h3>Dua ukuran yang berbeda</h3><p class="note-p"><b>Kecukupan posisi persediaan</b>: apakah stok di gudang, bersama kapal yang sudah dipesan, cukup sampai pesanan baru bisa tiba. Bila stok turun ke reorder point, pesanan harus dibuat.</p>
      <p class="note-p"><b>Ketepatan waktu kedatangan</b>: apakah kapal berikutnya tiba sebelum stok menyentuh deadstock. Kolom terakhir tabel menunjukkannya.</p></div></div>
    <div style="margin-top:18px;overflow-x:auto"><table class="tbl"><thead><tr><th>Material</th><th>Asal utama</th><th>Waktu tunggu<br>total</th><th>Reorder<br>point</th><th>Stok<br>tercatat</th><th>Pesan<br>paling lambat</th><th>Kedatangan<br>berikutnya</th><th>Menyentuh<br>deadstock</th></tr></thead><tbody>${rows||`<tr><td colspan="8">${belum('jadwal_kapal')}</td></tr>`}</tbody></table></div>
    <div class="box" style="margin-top:18px"><h3>Hitung mundur per material</h3>${urai}</div>`
    + catatanSumber(M,'Berapa ton yang dipesan tetap keputusan fungsi Pengadaan.');
}

/* ================= 07 PERUBAHAN ANTAR VERSI ================= */
function m07(M){
  const P=M.perubahan;
  const isi = P.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Versi</th><th>Material</th><th>Kapal</th><th>ETA lama</th><th>ETA baru</th><th>Geser</th><th>Volume lama</th><th>Volume baru</th><th>Alasan</th></tr></thead><tbody>`
    + P.map(r=>{ const d=(r.eta_lama&&r.eta_baru)?selisihHari(r.eta_lama,r.eta_baru):null, dv=(+r.volume_baru_t||0)-(+r.volume_lama_t||0);
      return `<tr><td class="gdim">${tgl(r.versi_lama)} → ${tgl(r.versi_baru)}</td><td>${esc(r.material)}</td><td>${esc(r.nama_kapal)}</td><td>${tgl(r.eta_lama)}</td><td>${tgl(r.eta_baru)}</td>
        <td style="color:${d>0?C.amber:C.pkg};font-weight:600">${d==null?'—':(d>0?'+':'')+d+' hari'}</td><td>${f0(r.volume_lama_t)} t</td><td>${f0(r.volume_baru_t)} t${dv?` <span style="color:${dv<0?C.red:C.pkg}">(${dv>0?'+':'−'}${f0(Math.abs(dv))})</span>`:''}</td><td class="gtxt">${esc(r.alasan||'')}</td></tr>`; }).join('')
    + `</tbody></table></div>` + `<p class="note-p" style="margin-top:12px">Jadi artinya: ${P.map(r=>{ const d=selisihHari(r.eta_lama,r.eta_baru); const m=M.mat[(M.kapal.find(k=>k.nama_kapal===r.nama_kapal)||{}).k]||null;
        return `${esc(r.material)} ${esc(r.nama_kapal)} mundur ${d} hari${m&&m.ada?`; selama itu ${esc(m.nama)} ${m.temSS==='sudah'?'berada di bawah safety stock':m.temSS?'menyentuh safety stock '+tgl(m.temSS):'tetap di atas safety stock'}`:''}`; }).join('. ')}.</p>`
    : `<p class="note-p">Tidak ada perubahan rencana kedatangan yang tercatat antara versi master sebelumnya dan versi ini.</p>`;
  return kepala('perubahan','Riwayat perubahan rencana kedatangan antar-update master Dalops.') + peringatanModul(M,'07') + `<div class="box">${isi}</div>` + catatanSumber(M);
}

return {st, kepala, catatanSumber, peringatanModul, belum, mini, grafik, barset, PASANG, SW, pill, WM, tgl, tglP, BLN, BLNp, esc, sisaHari, teksKapal, LABEL_INDIKATIF,
  peringatan, urutKartu, hitungRop, m01, m02, m03, m05, m06, m07,
  statusProd: p => GASM.statusPct(p, KRI_PRODUKSI_USULAN.aman, KRI_PRODUKSI_USULAN.bahaya)};
})();
