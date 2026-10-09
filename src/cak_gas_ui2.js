/* =====================================================================
   Mesin generik entitas gas — ANTARMUKA (bagian 2: modul 04, 08–14,
   pengendali kejadian, dan perender)
   Catatan: kelas .skrow/.lgi/.krrow/.krstep/.projnav dan atribut
   data-preset sengaja tidak dipakai karena sudah ditangkap pendengar
   klik global milik mesin PKG.
   ===================================================================== */
const GUI2 = (function(){
'use strict';
const {st, kepala, catatanSumber, peringatanModul, belum, mini, grafik, barset, PASANG, SW, pill, WM, tgl, tglP, BLN, esc, teksKapal, LABEL_INDIKATIF} = GUI;
const {f0,f1,f2,tambahHari,selisihHari,rata,jumlah} = GASM;
const terang = () => C===THEMES.light;

/* ================= 04 PETA PELAYARAN ================= */
const GEO = {rute:null, kal:[0,0]};
const proj = (lat,lon) => [ (lon+180)*800/360 + GEO.kal[0], (90-lat)*400/180 + GEO.kal[1] ];
function siapGeo(){
  if(GEO.rute) return;
  GEO.rute = {}; (D.sail.routes||[]).forEach(r=>{ if(r.xy&&r.xy.length>1) GEO.rute[r.id]=r.xy.map(p=>p.slice()); });
  /* kalibrasi kecil terhadap ruang gambar peta v2beta, memakai titik Gresik */
  const g=D.sail.gresik, p=[(112.65+180)*800/360, (90+7.15)*400/180];
  GEO.kal=[g[0]-p[0], g[1]-p[1]]; GEO.gresik=g.slice();
}
const jarak2 = (a,b) => (a[0]-b[0])**2+(a[1]-b[1])**2;
/* lintasan: rute laut v2beta dari pelabuhan muat, dipotong di titik terdekat
   ke jalur masuk pelabuhan bongkar entitas, lalu disambung jalur masuk itu. */
function lintasan(P, muat){
  siapGeo();
  const pel=P.pelabuhan, tujuan=proj(pel.lat,pel.lon), info=PELABUHAN_MUAT[muat]||null;
  const jalur=(pel.pendekatan||[]).map(ch=>ch.map(([la,lo])=>proj(la,lo)));
  if(info&&info.domestik){
    const ch=(pel.dariGresik||[]).map(([la,lo])=>proj(la,lo));
    return {xy:[GEO.gresik, ...ch, tujuan], asal:GEO.gresik};
  }
  if(!info||!GEO.rute[info.rute]) return null;
  const r=GEO.rute[info.rute];
  let best={d:Infinity,i:r.length-1,ch:[]};
  jalur.forEach(ch=>{ if(!ch.length) return; r.forEach((p,i)=>{ const d=jarak2(p,ch[0]); if(d<best.d) best={d,i,ch}; }); });
  return {xy:[...r.slice(0,best.i+1), ...best.ch, tujuan], asal:r[0]};
}
function gambarPeta(daftar, tujuanList, idPeta){
  /* daftar: [{xy, warna, label, sub, aktif}] ; tujuanList: [{xy, label}] */
  const VBW=800, VBH=400;
  const xs=[], ys=[]; daftar.filter(d=>d.aktif!==false).forEach(d=>d.xy.forEach(p=>{xs.push(p[0]); ys.push(p[1]);}));
  tujuanList.forEach(t=>{ xs.push(t.xy[0]); ys.push(t.xy[1]); });
  if(!xs.length) return belum('koordinat');
  let x0=Math.max(0,Math.min(...xs)-30), x1=Math.min(VBW,Math.max(...xs)+30), y0=Math.max(0,Math.min(...ys)-34), y1=Math.min(VBH,Math.max(...ys)+34);
  let w=x1-x0, h=y1-y0; const AR=Math.min(3.4,Math.max(2.1,w/h));
  if(w/h<AR){ const nw=Math.min(VBW,h*AR), cx=(x0+x1)/2; x0=Math.max(0,cx-nw/2); x1=Math.min(VBW,x0+nw); w=x1-x0; }
  else { const nh=Math.min(VBH,w/AR), cy=(y0+y1)/2; y0=Math.max(0,cy-nh/2); y1=Math.min(VBH,y0+nh); h=y1-y0; }
  const Z=w/800, U=v=>+(v*Z).toFixed(2);
  const cL=terang()?'#DCEEF8':'#0E1B22', cD=terang()?'#EDF2E4':'#1C2820', cB=terang()?'#BFCDAE':'#374A3C', cH=terang()?'#FFFFFF':'#0C1210';
  let g=`<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" width="100%" role="img" aria-label="Peta jalur pelayaran">
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${cL}"/>`;
  MAPPATHS.forEach(([,d])=>{ g+=`<path d="${d}" fill="${cD}" stroke="${cB}" stroke-width="${U(0.5)}" stroke-linejoin="round"/>`; });
  daftar.forEach(d=>{
    const op=d.aktif===false?0.18:1;
    pecah(d.xy,VBW).forEach(seg=>{ g+=`<path d="${halus(seg)}" fill="none" stroke="${d.warna}" stroke-width="${U(d.tebal||1.6)}" stroke-dasharray="${U(5)} ${U(3)}" opacity="${op}" stroke-linecap="round"/>`; });
  });
  const labelDipakai=[];
  daftar.filter(d=>d.aktif!==false&&d.label).forEach(d=>{
    const a=d.xy[0]; let ly=a[1]-U(8);
    while(labelDipakai.some(p=>Math.abs(p[0]-a[0])<U(70)&&Math.abs(p[1]-ly)<U(13))) ly-=U(13);
    labelDipakai.push([a[0],ly]);
    g+=`<circle cx="${a[0]}" cy="${a[1]}" r="${U(3)}" fill="${d.warna}" stroke="${cH}" stroke-width="${U(1)}"/>
      <text x="${a[0]}" y="${ly}" text-anchor="middle" font-family="${BODYF}" font-size="${U(9.5)}" font-weight="700" fill="${C.ink}" stroke="${cH}" stroke-width="${U(2.6)}" paint-order="stroke">${esc(d.label)}</text>
      ${d.sub?`<text x="${a[0]}" y="${ly+U(10)}" text-anchor="middle" font-family="${MONO}" font-size="${U(7.5)}" fill="${C.ink2}" stroke="${cH}" stroke-width="${U(2.4)}" paint-order="stroke">${esc(d.sub)}</text>`:''}`;
  });
  tujuanList.forEach(t=>{ g+=`<circle cx="${t.xy[0]}" cy="${t.xy[1]}" r="${U(4.2)}" fill="${C.red}" stroke="${cH}" stroke-width="${U(1.4)}"/>
    <text x="${t.xy[0]+(t.xy[0]>x0+w*0.7?-U(6):U(6))}" y="${t.xy[1]+U(12)}" text-anchor="${t.xy[0]>x0+w*0.7?'end':'start'}" font-family="${BODYF}" font-size="${U(9.5)}" font-weight="700" fill="${C.red}" stroke="${cH}" stroke-width="${U(2.6)}" paint-order="stroke">${esc(t.label)}</text>`; });
  return `<div class="chartwrap" id="${idPeta}">${g}</svg></div>`;
}
function m04(M){
  const S=st(M.kode), P=M.P;
  const grup={}; M.kapal.forEach(k=>{ const key=k.pelabuhan_muat+'|'+k.k; const o=grup[key]=grup[key]||{asal:k.negara_asal, muat:k.pelabuhan_muat, k:k.k, mat:k.material, vol:0, n:0, nm:+k.jarak_nm||0, hari:+k.waktu_layar_hari||0, lewat:k.lewat, mendatang:0};
    o.vol+=+k.volume_t||0; o.n++; if(k.mendatang) o.mendatang++; });
  const rute=Object.values(grup).sort((a,b)=>b.vol-a.vol);
  const mats=[...new Set(rute.map(r=>r.mat))];
  const daftar=rute.map(r=>{ const l=lintasan(P,r.muat); return l?{xy:l.xy, warna:WM(r.k), label:r.asal.replace(/ \(PKG\)$/,''), sub:`${f0(r.nm)} nm · ${f1(r.hari)} hari`, aktif:!S.peta.mat||S.peta.mat===r.mat, r}:null; }).filter(Boolean);
  const tanpa=rute.filter(r=>!lintasan(P,r.muat));
  const peta=gambarPeta(daftar, [{xy:proj(P.pelabuhan.lat,P.pelabuhan.lon), label:P.pelabuhan.nama}], 'gpeta-'+M.kode);
  const tot=jumlah(rute.map(r=>r.vol));
  const rows=rute.map(r=>`<tr><td>${esc(r.asal)}</td><td class="gtxt">${esc(r.muat)}</td><td style="color:${WM(r.k)};font-weight:600">${esc(r.mat)}</td>
    <td>${f0(r.vol)}</td><td>${f1(r.vol/tot*100)}%</td><td>${r.n} (${r.mendatang} mendatang)</td><td>${f0(r.nm)}</td><td>${f1(r.hari)}</td><td>${f1(r.hari+3)}</td>
    <td>${r.lewat?`<span class="pill p-warn">Lewat Selat Hormuz</span>`:'<span class="pill">—</span>'}</td></tr>`).join('');
  return kepala('peta',`Jalur laut dari pelabuhan muat menuju ${esc(P.pelabuhan.nama)}, beserta jarak dan waktu layar pada 12,5 knot dari jadwal kapal Dalops.`)
    + peringatanModul(M,'04')
    + `<div class="box"><div class="gfilter">${['Semua',...mats].map(m=>`<button class="tglbtn${(S.peta.mat||'Semua')===m?' on':''}" type="button" data-g="petaMat" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      ${peta}
      <div class="notice" style="margin-top:14px"><h4>Peta jalur pasokan</h4><p>Lintasan digambar dari rute laut versi PKG yang dipotong dan disambung ke jalur masuk ${esc(P.pelabuhan.nama)}; bentuknya perkiraan untuk gambar. Jarak dan waktu layar di tabel dibaca dari jadwal kapal Dalops, bukan dari gambar.${P.pelabuhan.darat?' '+esc(P.pelabuhan.darat)+'.':''}${tanpa.length?` Tanpa koordinat: ${tanpa.map(r=>esc(r.muat)).join(', ')} [ISI].`:''}</p></div></div>
    <div style="margin-top:18px;overflow-x:auto"><table class="tbl"><thead><tr><th>Negara asal</th><th>Pelabuhan muat</th><th>Material</th><th>Volume 2026<br>(ton)</th><th>Porsi</th><th>Kargo</th><th>Jarak<br>(nm)</th><th>Layar<br>(hari)</th><th>Total dengan<br>bongkar (hari)</th><th>Risiko jalur</th></tr></thead><tbody>${rows}
      <tr><td colspan="10" class="gtblnote">Volume = seluruh kargo 2026 di jadwal kapal (tiba, dalam pelayaran, rencana). Bongkar diasumsikan 3 hari, sama dengan versi PKG. ${rute.some(r=>r.lewat)?'Kolom risiko jalur mengikuti penanda selat sempit di jadwal kapal Dalops.':'Tidak ada kargo yang ditandai melewati selat berisiko di jadwal kapal Dalops.'}</td></tr></tbody></table></div>`
    + catatanSumber(M);
}

/* ================= 08 SIMULATOR PASOKAN ================= */
function opsiSim08(M){
  const S=st(M.kode), o={kargoMati:new Set(), materialMati:new Set(), gasFaktor:{}, trip:{}};
  const sumber=M.sumberPasokan;
  S.mati.forEach(id=>{ const s=sumber.find(x=>x.id===id); if(!s) return;
    if(/gas/i.test(s.material)){ const g=(M.gas.pemasok||[]).find(p=>p.nama===s.nama); if(g) o.gasFaktor[g.nama]=0; return; }
    const kapal=M._sim?M._sim.kargo:GASM.siapkanSim(M).kargo;
    const kode=(Object.values(M.mat).find(m=>GASM.kunciMat(m.nama)===GASM.kunciMat(s.material))||{}).k;
    const cocok=kapal.filter(k=>k.k===kode && (String(s.nama).toLowerCase().includes(String(k.negara_asal).split(' ')[0].toLowerCase())));
    if(cocok.length) cocok.forEach(k=>o.kargoMati.add(k.j)); else if(kode) o.materialMati.add(kode);
  });
  if(S.s08.preset==='gasTurun') o.gasTurun=S.s08.gasTurun;
  if(S.s08.preset==='nh3Trip'){ const u=M.unit.filter(u=>u.produk==='Amoniak').sort((a,b)=>b.kap-a.kap)[0]; if(u) o.trip[u.unit]=true; }
  return o;
}
function terapkanPreset08(M, id){
  const S=st(M.kode), p=(M.P.preset||[]).find(x=>x.id===id)||{id:'semua'};
  S.mati=new Set(); S.s08.preset=p.id;
  if(p.matikanSemua) M.sumberPasokan.forEach(s=>S.mati.add(s.id));
  if(p.matikanMaterial) M.sumberPasokan.filter(s=>p.matikanMaterial.some(m=>GASM.kunciMat(s.material)===GASM.kunciMat(m))).forEach(s=>S.mati.add(s.id));
  if(p.gasTurun!=null) S.s08.gasTurun=p.gasTurun;
}
function m08(M){
  const S=st(M.kode); if(!M.sumberPasokan.length) return kepala('sken')+peringatanModul(M,'08')+`<div class="box">${belum('sumber_pasokan')}</div>`;
  const o=opsiSim08(M), R=GASM.simulasi(M,o);
  const hari=R.hari, N=R.N;
  const mats=Object.values(M.mat).filter(m=>m.ada);
  const kartu=mats.map(m=>{ const r=R.ringkas[m.k]; const s=GASM.statusPct(r.akhir/m.ss*100,m.aman,m.bahaya);
    const iBah=R.seri[m.k].findIndex(v=>v<m.ss*m.bahaya/100);
    return `<div class="card" style="--tone:${SW(r.iDead!=null?'Bahaya':iBah>=0?'Waspada':'Aman')}"><div class="nm">${esc(m.nama)}</div><div class="src">stok ${tgl(M.pos)} ${f0(m.stok)} t</div>
      <div class="doc"><span class="lab">Status akhir</span><span class="val" style="color:${SW(s)}">${s}</span></div>
      <div class="doc"><span class="lab">Menyentuh deadstock</span><span class="val" style="font-size:15px;line-height:1.3">${r.iDead!=null?`<b style="color:${C.red}">${tgl(hari[r.iDead])}</b><br><span class="gsub">${r.hariHabis} hari di deadstock</span>`:'tidak menyentuh'}</span></div></div>`; }).join('');
  const H=R.hilang;
  const kpi=['NPK','Urea','Amoniak'].filter(p=>H[p]&&H[p].plan>0).map(p=>`<div class="kpi"><div class="l">Pemenuhan ${p}</div><div class="v" style="color:${H[p].pct>=99.5?C.pkg:H[p].pct>=90?C.amber:C.red}">${f1(H[p].pct)}%</div>
      <div class="gsub">${H[p].hilang>0.5?`hilang ${f0(H[p].hilang)} t · setara ${f1(H[p].hariSetara)} hari berhenti${H[p].iTurun>=0?' · mulai '+tgl(hari[H[p].iTurun]):''}`:'tidak terganggu'}</div></div>`).join('');
  const series=mats.map(m=>({nama:m.nama, warna:WM(m.k), v:R.seri[m.k].map(v=>v/m.ss*100)}));
  const chA=grafik('g08a-'+M.kode,{x:hari, series, ref:[{y:100,label:'safety stock',warna:C.amber}], yfmt:v=>f0(v)+'%', unit:'%', judul:'Stok bahan baku, % safety stock'});
  const chB=grafik('g08b-'+M.kode,{x:hari, ymin:0, ymax:110, series:['NPK','Urea','Amoniak'].filter(p=>H[p]&&H[p].plan>0).map(p=>({nama:p, warna:WM(p),
      v:R.prod[p].sim.map((v,i)=>R.prod[p].plan[i]>0?v/R.prod[p].plan[i]*100:null)})), yfmt:v=>f0(v)+'%', unit:'%', judul:'Pemenuhan rencana produksi'});
  const src=M.sumberPasokan.map(s=>{ const on=!S.mati.has(s.id);
    return `<button type="button" class="gsrc${on?' on':''}" data-g="src" data-v="${esc(s.id)}" aria-pressed="${on}"><i style="background:${on?WM(GASM.kunciMat(s.material)==='GASALAM'?'GAS':(Object.values(M.mat).find(m=>GASM.kunciMat(m.nama)===GASM.kunciMat(s.material))||{}).k):C.ink3}"></i>
      <span>${esc(s.nama)}<small>${esc(s.moda)} · ${s.volume_acuan!=null?f0(s.volume_acuan)+' ':''}${esc(s.satuan_volume||'')}</small></span></button>`; }).join('');
  const preset=(M.P.preset||[]).map(p=>`<button type="button" class="tglbtn${S.s08.preset===p.id?' on':''}" data-g="preset08" data-v="${p.id}">${esc(p.id==='gasTurun'?`Gas turun ${S.s08.gasTurun}%`:p.label)}</button>`).join('');
  const unitTbl=R.unit.map(u=>`<tr><td>${esc(u.unit)}</td><td>${f0(u.laju)} t/hari</td><td>${u.hariOp}</td><td style="color:${u.hariSetara>0.5?C.red:C.ink}">${f1(u.hariSetara)}</td><td>${u.hariPenuh}</td><td>${f0(u.hilang)} t</td></tr>`).join('');
  const trip=Object.keys(o.trip);
  return kepala('sken','Matikan sumber pasokan di bawah ini dalam kombinasi apa pun; seluruh rantai dihitung ulang seketika. Gas → amoniak → urea, dan bahan NPK → NPK.')
    + peringatanModul(M,'08')
    + `<div class="box"><div class="gtoolbar"><h3 style="margin:0">Sumber pasokan</h3><div class="gfilter">${preset}</div></div>
      ${S.s08.preset==='gasTurun'?`<div class="fld" style="max-width:420px"><label>Pasokan gas turun <b>${S.s08.gasTurun}%</b></label><input type="range" min="0" max="100" step="5" value="${S.s08.gasTurun}" data-g="gasTurun08"></div>`:''}
      ${trip.length?`<p class="gsub">Unit trip sepanjang periode: <b>${trip.map(esc).join(', ')}</b> (unit amoniak dengan kapasitas terbesar).</p>`:''}
      <div class="gsrcs">${src}</div></div>
    <div class="cards" style="margin-top:16px">${kartu}</div>
    <div class="kpis">${kpi}</div>
    <div class="grid2" style="margin-top:12px"><div class="box"><h3>Stok bahan baku</h3>${chA}</div><div class="box"><h3>Pemenuhan rencana produksi</h3>${chB}</div></div>
    <div class="box" style="margin-top:18px"><h3>Proyeksi berhentinya pabrik</h3><p class="note-p" style="margin:-4px 0 12px">${tgl(hari[0])} sampai ${tgl(hari[N-1])} (${N} hari rencana).</p>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Unit</th><th>Laju rencana</th><th>Hari operasi<br>dalam rencana</th><th>Hari setara<br>berhenti</th><th>Hari berhenti<br>penuh</th><th>Kehilangan<br>produksi</th></tr></thead><tbody>${unitTbl}</tbody></table></div>
      <p class="gsub" style="margin-top:10px"><b>Hari setara berhenti</b> = produksi yang hilang dibagi laju rencana harian: tiga hari beban 50% dihitung 1,5 hari. <b>Hari berhenti penuh</b> = hari dengan produksi di bawah 1% rencana.</p></div>
    ${LABEL_INDIKATIF}` + catatanSumber(M,'Basis simulasi = rencana Dalops sesudah posisi data; kekurangan gas memotong amoniak lebih dulu, lalu urea.');
}

/* ================= 09 BERAPA LAMA BISA BERTAHAN ================= */
const PRESET09 = [
  ['dasar','Rencana dasar',{curtail:0,durasi:30,tripN:'',tripU:'',tundaKCL:0,tundaDAP:0,hentikanJual:false}],
  ['curtail','Curtailment gas 30%',{curtail:30,durasi:30,tripN:'',tripU:'',tundaKCL:0,tundaDAP:0,hentikanJual:false}],
  ['curtail50','Curtailment 50% + stop jual',{curtail:50,durasi:21,tripN:'',tripU:'',tundaKCL:0,tundaDAP:0,hentikanJual:true}],
  ['trip','Trip amoniak terbesar',{curtail:0,durasi:14,tripN:'@terbesar',tripU:'',tundaKCL:0,tundaDAP:0,hentikanJual:false}],
  ['kargo','Kargo KCl & DAP mundur 30 hari',{curtail:0,durasi:30,tripN:'',tripU:'',tundaKCL:30,tundaDAP:30,hentikanJual:false}]];
function opsi09(M){
  const s=st(M.kode).s09; const trip={};
  const nh3=M.unit.filter(u=>u.produk==='Amoniak').sort((a,b)=>b.kap-a.kap);
  const tn = s.tripN==='@terbesar' ? (nh3[0]||{}).unit : s.tripN;
  if(tn) trip[tn]=true; if(s.tripU) trip[s.tripU]=true;
  return {curtail:s.curtail, durasi:s.durasi, trip, tripDurasi:s.durasi, tunda:{KCL:s.tundaKCL, DAP:s.tundaDAP}, hentikanJual:s.hentikanJual, _tn:tn};
}
function m09(M){
  const s=st(M.kode).s09, o=opsi09(M), R=GASM.simulasi(M,o), N=R.N, hari=R.hari;
  const mats=Object.values(M.mat).filter(m=>m.ada);
  const pilihUnit=(produk,val,key)=>`<select data-g="s09sel" data-k="${key}" class="gsel"><option value="">tidak ada</option>${M.unit.filter(u=>u.produk===produk).map(u=>`<option value="${esc(u.unit)}"${val===u.unit||(val==='@terbesar'&&u.unit===o._tn)?' selected':''}>${esc(u.unit)} (${f0(u.kap)} t/hari)</option>`).join('')}</select>`;
  const sl=(k,lbl,min,max,step,sat)=>`<div class="fld"><label>${lbl} <b>${s[k]}${sat}</b></label><input type="range" min="${min}" max="${max}" step="${step}" value="${s[k]}" data-g="s09" data-k="${k}"></div>`;
  const H=R.hilang, nh3=R.ringkas.NH3, pertama=Object.values(R.ringkas).filter(r=>r.iDead!=null).sort((a,b)=>a.iDead-b.iDead)[0];
  const urea=H.Urea||{}, npk=H.NPK||{}, am=H.Amoniak||{};
  let judul, warna;
  if(urea.hilang>0.5||npk.hilang>0.5){ warna=C.amber; const turun=[urea.iTurun,npk.iTurun].filter(i=>i>=0).sort((a,b)=>a-b)[0];
    judul=`Produksi turun di bawah rencana mulai ${tgl(hari[turun])} (hari ke-${turun+1})`; }
  else if(am.hilang>0.5){ warna=C.pkg; judul=`Produksi urea dan NPK tetap sesuai rencana; penyangga amoniak menutup gangguan`; }
  else { warna=C.pkg; judul='Tidak ada gangguan produksi sepanjang periode rencana'; }
  const kalimat = `${s.curtail?`Pasokan gas dipotong ${s.curtail}% selama ${s.durasi} hari. `:''}${o._tn?`${esc(o._tn)} berhenti ${s.durasi} hari. `:''}${s.tripU?`${esc(s.tripU)} berhenti ${s.durasi} hari. `:''}${s.tundaKCL?`Kargo KCl mundur ${s.tundaKCL} hari. `:''}${s.tundaDAP?`Kargo DAP mundur ${s.tundaDAP} hari. `:''}${s.hentikanJual?'Penjualan/transfer amoniak dihentikan. ':''}`
    + (nh3? `Amoniak ${nh3.iDead!=null?`menyentuh deadstock ${tgl(hari[nh3.iDead])} (H+${nh3.iDead+1}) dan tertahan di sana ${nh3.hariHabis} hari; selama itu penjualan/transfer amoniak berhenti lebih dulu, lalu urea dibatasi produksi amoniak harian`:`tidak menyentuh deadstock; titik terendah ${f0(nh3.min)} t`}.`:'');
  const series=mats.map(m=>({nama:m.nama, warna:WM(m.k), v:R.seri[m.k].map(v=>Math.max(0,v-m.dead))}));
  const ch=grafik('g09-'+M.kode,{x:hari, series, ymin:0, unit:' t', vline:s.durasi<N&&(s.curtail||o._tn||s.tripU)?[{i:Math.min(N-1,s.durasi),label:'gangguan berakhir'}]:[], judul:'Stok siap pakai (di atas deadstock)'});
  const tabel=mats.map(m=>{ const r=R.ringkas[m.k]; return `<tr><td>${esc(m.nama)}</td><td style="color:${r.iDead!=null?C.red:C.pkg};font-weight:600">${r.iDead!=null?`${tgl(hari[r.iDead])} (H+${r.iDead+1})<div class="gsub">${r.hariHabis} hari di deadstock</div>`:'tidak habis'}</td>
    <td>${r.iSS!=null?tgl(hari[r.iSS]):'tidak'}</td><td>${f0(r.akhir)} t</td></tr>`; }).join('');
  return kepala('simulasi','Rantai berjenjang gas → amoniak → urea dan NPK. Setel tuas skenario; tanggal stok siap pakai habis dibaca dari rencana kedatangan dan produksi yang sudah terjadwal.')
    + peringatanModul(M,'09')
    + `<div class="sim"><div class="ctrl"><h3>Skenario</h3><p class="hint">Preset menyetel semua tuas sekaligus.</p>
      <div class="gfilter">${PRESET09.map(([id,l])=>`<button type="button" class="tglbtn${s.preset===id?' on':''}" data-g="preset09" data-v="${id}">${esc(l)}</button>`).join('')}</div>
      ${sl('durasi','Lama gangguan',0,N,1,' hari')}${sl('curtail','Curtailment gas',0,100,5,'%')}
      <div class="fld"><label>Trip unit amoniak</label>${pilihUnit('Amoniak',s.tripN,'tripN')}</div>
      <div class="fld"><label>Trip unit urea</label>${pilihUnit('Urea',s.tripU,'tripU')}</div>
      ${sl('tundaKCL','Kargo KCl terlambat',0,60,1,' hari')}${sl('tundaDAP','Kargo DAP terlambat',0,60,1,' hari')}
      <label class="gcek"><input type="checkbox" data-g="s09cek" data-k="hentikanJual"${s.hentikanJual?' checked':''}> Hentikan penjualan/transfer amoniak</label></div>
    <div class="out"><div class="verdict" style="color:${warna}">${esc(judul)}<small>${kalimat}</small></div>
      <div class="kpis">
        <div class="kpi"><div class="l">Urea hilang</div><div class="v">${f0(urea.hilang)}<small> t</small></div><div class="gsub">setara ${f1(urea.hariSetara)} hari produksi</div></div>
        <div class="kpi"><div class="l">NPK hilang</div><div class="v">${f0(npk.hilang)}<small> t</small></div><div class="gsub">setara ${f1(npk.hariSetara)} hari produksi</div></div>
        <div class="kpi"><div class="l">Amoniak tidak diproduksi</div><div class="v">${f0(am.hilang)}<small> t</small></div><div class="gsub">ditutup stok tangki sejauh di atas deadstock</div></div>
        <div class="kpi"><div class="l">Pertama habis</div><div class="v" style="font-size:15px">${pertama?esc(pertama.nama)+' · '+tgl(hari[pertama.iDead]):'—'}</div></div></div>
      ${ch}
      <div style="overflow-x:auto;margin-top:14px"><table class="tbl"><thead><tr><th>Material</th><th>Pertama kali habis<br>(menyentuh deadstock)</th><th>Turun di bawah<br>safety stock</th><th>Stok di hari terakhir</th></tr></thead><tbody>${tabel}</tbody></table></div>
      ${LABEL_INDIKATIF}</div></div>`
    + catatanSumber(M,`Hari ke-1 = ${tglP(hari[0])}, sehari sesudah posisi data; periode berakhir ${tglP(hari[N-1])} mengikuti rencana Dalops.`);
}

/* ================= 10 KOMPOSISI NPK ================= */
function m10(M){
  const S=st(M.kode).kr, r=M.npk.resep, P=M.P;
  if(!r.length) return kepala('komposisi')+peringatanModul(M,'10')+`<div class="box">${belum('cons_rate NPK')}</div>`;
  const tot=jumlah(r.map(x=>x.rasio)), dosis=(P.dosis||{}).npk;
  const warnaB=b=>/kcl/i.test(b)?WM('KCL'):/dap/i.test(b)?WM('DAP'):/za/i.test(b)?WM('ZA'):/clay|filler/i.test(b)?WM('CLAY'):/urea/i.test(b)?WM('Urea'):C.steel;
  const stack=`<div class="krstack">${r.map(x=>`<i style="width:${x.rasio/tot*100}%;background:${warnaB(x.bahan)}" title="${esc(x.bahan)}"></i>`).join('')}</div>`;
  const isi=r.map(x=>`<div class="gkr"><span class="dot" style="background:${warnaB(x.bahan)}"></span><span class="nm">${esc(x.bahan)}<small>${f2(x.rasio)} t per t NPK</small></span><span class="kg">${f1(x.rasio*50)} kg<small>${f1(x.rasio/tot*100)}%</small></span></div>`).join('');
  /* pohon: bahan primer per ton NPK */
  const rU=M.resepNPK(/urea/i)||0, nU=M.r.nh3PerUrea||0, gU=M.r.gasPerUrea||0, gN=M.r.gasPerNH3||0;
  const nh3=rU*nU, gas=nh3*gN+rU*gU;
  const asal=b=>{ const m=Object.values(M.mat).find(mm=>new RegExp(mm.nama.split(' ')[0],'i').test(b)); return m?m.sifat:/urea/i.test(b)?'Produksi sendiri':'—'; };
  const pohon=`<div class="gtree">
    <div class="gcol"><div class="glab">Bahan primer</div>
      <div class="gnode" style="--t:${WM('GAS')}"><b>Gas alam</b><span>${f2(gas)} MMBTU</span><small>${f2(nh3)} t NH3 × ${f1(gN)} + ${f2(rU)} t urea × ${f1(gU)}</small></div>
      ${r.filter(x=>!/urea/i.test(x.bahan)).map(x=>`<div class="gnode" style="--t:${warnaB(x.bahan)}"><b>${esc(x.bahan)}</b><span>${f2(x.rasio)} t</span><small>${esc(asal(x.bahan))}</small></div>`).join('')}</div>
    <div class="gcol"><div class="glab">Bahan antara</div>
      <div class="gnode" style="--t:${WM('NH3')}"><b>Amoniak</b><span>${f2(nh3)} t</span><small>${f2(rU)} t urea × ${f2(nU)}</small></div>
      <div class="gnode" style="--t:${WM('Urea')}"><b>Urea internal</b><span>${f2(rU)} t</span><small>dari pabrik urea sendiri</small></div></div>
    <div class="gcol"><div class="glab">Produk</div><div class="gnode gnpk" style="--t:${WM('NPK')}"><b>1 ton ${esc(M.npk.nama)}</b><span>20 karung 50 kg</span><small>${dosis?f1(1000/dosis)+' ha setara':'dosis [ISI]'}</small></div></div></div>`;
  /* konversi dua arah */
  const bahanPilih=S.bahan||r[0].bahan, xb=r.find(x=>x.bahan===bahanPilih)||r[0];
  let hasil;
  if(S.arah==='maju'){
    const npk=S.jml/xb.rasio;
    hasil=`<div class="kpis"><div class="kpi"><div class="l">NPK terbentuk</div><div class="v">${f2(npk)}<small> t</small></div></div><div class="kpi"><div class="l">Karung 50 kg</div><div class="v">${f0(npk*20)}</div></div>
      <div class="kpi"><div class="l">Setara sawah</div><div class="v">${dosis?f1(npk*1000/dosis):'—'}<small> ha</small></div></div></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bahan pendamping yang ikut dibutuhkan</th><th>Kebutuhan</th><th>Per ton NPK</th></tr></thead><tbody>${r.map(x=>`<tr><td>${esc(x.bahan)}</td><td>${f2(npk*x.rasio)} t</td><td>${f2(x.rasio)} t</td></tr>`).join('')}</tbody></table></div>
      <p class="gsub">${f2(S.jml)} t ${esc(xb.bahan)} cukup untuk ${f2(npk)} t NPK bila bahan lain tersedia; bahan yang paling sedikit menentukan berapa NPK yang benar-benar bisa dibuat.</p>`;
  } else {
    const npk = S.sat==='TON'?S.jml : S.sat==='KARUNG'?S.jml/20 : (dosis? S.jml*dosis/1000 : 0);
    hasil=`<div class="kpis"><div class="kpi"><div class="l">NPK</div><div class="v">${f2(npk)}<small> t</small></div></div><div class="kpi"><div class="l">Karung</div><div class="v">${f0(npk*20)}</div></div><div class="kpi"><div class="l">Sawah</div><div class="v">${dosis?f1(npk*1000/dosis):'—'}<small> ha</small></div></div></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bahan</th><th>Kebutuhan</th></tr></thead><tbody>${r.map(x=>`<tr><td>${esc(x.bahan)}</td><td>${f2(npk*x.rasio)} t</td></tr>`).join('')}
      <tr><td>Amoniak (lewat urea)</td><td>${f2(npk*nh3)} t</td></tr><tr><td>Gas alam</td><td>${f1(npk*gas)} MMBTU</td></tr></tbody></table></div>`;
  }
  return kepala('komposisi',`Isi satu karung, pohon bahan baku, dan konversi dua arah antara bahan baku dan NPK, menurut rasio konsumsi (cons-rate) Dalops ${esc(M.kode)}.`)
    + peringatanModul(M,'10')
    + `<div class="box krstream"><div><div class="lab2">Sistem produksi NPK</div><div class="gbelum">${P.npk&&P.npk.sistem?esc(P.npk.sistem):'[ISI] sistem produksi (granulasi/steam/fusion) belum ditetapkan untuk entitas ini'}</div></div>
      <p class="krket">Komposisi di bawah memakai satu resep cons-rate dari Dalops. Bila pabrik punya lebih dari satu sistem produksi, resep tiap sistem perlu ditambahkan ke Dalops.</p></div>
    <div class="box" style="margin-top:16px"><h3>Isi satu karung ${esc(M.npk.nama)}</h3><p class="note-p">Karung 50 kg. Jumlah bahan masuk ${f1(tot*50)} kg per karung; selisihnya susut proses (air dan debu).</p>${stack}<div class="gkrs">${isi}</div></div>
    <div class="box" style="margin-top:16px"><h3>Pohon bahan baku</h3><p class="note-p">Kebutuhan per ton NPK, dari bahan primer sampai karung. Urea internal membawa kebutuhan amoniak dan gas ke dalam NPK.</p>${pohon}</div>
    <div class="box" style="margin-top:16px"><h3>Simulasi konversi bahan baku dan NPK</h3>
      <div class="gfilter"><button type="button" class="tglbtn${S.arah==='maju'?' on':''}" data-g="krArah" data-v="maju">Bahan baku → NPK</button><button type="button" class="tglbtn${S.arah==='balik'?' on':''}" data-g="krArah" data-v="balik">NPK → bahan baku</button></div>
      ${S.arah==='maju'?`<div class="gfilter">${r.map(x=>`<button type="button" class="tglbtn${x.bahan===xb.bahan?' on':''}" data-g="krBahan" data-v="${esc(x.bahan)}">${esc(x.bahan)}</button>`).join('')}</div>`
        :`<div class="gfilter">${[['TON','Ton NPK'],['KARUNG','Karung 50 kg'],['HA','Hektare sawah']].map(([k,l])=>`<button type="button" class="tglbtn${S.sat===k?' on':''}" data-g="krSat" data-v="${k}">${l}</button>`).join('')}</div>`}
      <label class="gsub">Jumlah <input type="number" min="0" step="any" value="${S.jml}" data-g="krJml" class="gnum"> ${S.arah==='maju'?'ton '+esc(xb.bahan):S.sat==='TON'?'ton':S.sat==='KARUNG'?'karung':'ha'}</label>
      ${hasil}</div>` + catatanSumber(M, dosis?`Dosis ${f0(dosis)} kg NPK per hektare dari profil entitas.`:'');
}

/* ================= 11 INTERKONEKSI PABRIK ================= */
function m11(M){
  const S=st(M.kode).ik, G=rantaiGas(M.P), Z=GASM.siapkanSim(M);
  /* kuantum Jan–Des: realisasi + rencana */
  const sh=CAK.STORE[M.kode].sheets;
  const prodU={}; (sh.harian_produksi||[]).forEach(r=>prodU[r.unit]=(prodU[r.unit]||0)+(+r.produksi_t||0));
  const bbT={}; (sh.harian_bahan_baku||[]).forEach(r=>{ const o=bbT[r.kode_material]=bbT[r.kode_material]||{pakai:0,jual:0,prod:0,datang:0};
    o.pakai+=+r.pemakaian_t||0; o.jual+=+r.dijual_transfer_t||0; o.prod+=+r.produksi_sendiri_t||0; o.datang+=+r.kedatangan_t||0; });
  const gasP={}; (sh.harian_gas||[]).forEach(r=>{ gasP[r.pemasok]=(gasP[r.pemasok]||[]); gasP[r.pemasok].push(+r.pasokan_bbtud||0); });
  const totP=p=>jumlah(M.unit.filter(u=>u.produk===p).map(u=>prodU[u.unit]||0));
  const rU=M.resepNPK(/urea/i)||0, nU=M.r.nh3PerUrea||0;
  const q={'UREA-INT':totP('NPK')*rU, GAS:rata(Object.values(gasP).map(a=>rata(a)).filter(x=>x!=null))*Object.keys(gasP).length, NH3:(bbT.NH3||{}).prod, 'P-Urea':totP('Urea'), 'P-NPK':totP('NPK'), 'P-NH3':(bbT.NH3||{}).jual};
  ['KCL','DAP','ZA','CLAY'].forEach(k=>q[k]=(bbT[k]||{}).pakai);
  (M.P.gasKontrak||[]).forEach((g,i)=>q['src-gas-'+i]=rata(gasP[g.pemasok]||[]));
  M.unit.forEach(u=>q['u-'+u.unit]=prodU[u.unit]||0);
  const satuan=id=>/^src-gas|^GAS$/.test(id)?'BBTUD rata':'t';
  /* bobot sisi (ton, kecuali gas) */
  const w=(a,b)=>{
    if(/^u-/.test(b)&&a==='NH3'){ const u=b.slice(2); return (prodU[u]||0)*nU; }
    if(/^u-/.test(b)&&a==='UREA-INT'){ const u=b.slice(2); return (prodU[u]||0)*rU; }
    if(/^u-/.test(b)&&['KCL','DAP','ZA','CLAY'].includes(a)){ const u=b.slice(2); const m=M.mat[a]; return (prodU[u]||0)*(M.resepNPK(new RegExp(m?m.nama.split(' ')[0]:a,'i'))||0); }
    if(/^u-/.test(a)) return prodU[a.slice(2)]||0;
    if(a==='NH3'&&b==='P-NH3') return q['P-NH3'];
    return null; };
  const kol=[0,1,2,3].map(c=>G.node.filter(n=>n.kol===c));
  const Wd=1180, kolX=[20,330,640,950], bw=210, bh=46, gap=12;
  const tinggi=Math.max(...kol.map(k=>k.length))*(bh+gap)+60;
  const pos={}; kol.forEach((k,c)=>{ const tot=k.length*(bh+gap); const y0=40+(tinggi-60-tot)/2; k.forEach((n,i)=>pos[n.id]={x:kolX[c], y:y0+i*(bh+gap)}); });
  const mx=Math.max(...G.edge.map(([a,b])=>w(a,b)||0),1);
  const sel=S.sel, hulu=new Set(), hilir=new Set();
  if(sel){ const naik=id=>G.edge.filter(e=>e[1]===id).forEach(([a])=>{ if(!hulu.has(a)){ hulu.add(a); naik(a);} }); naik(sel);
    const turun=id=>G.edge.filter(e=>e[0]===id).forEach(([,b])=>{ if(!hilir.has(b)){ hilir.add(b); turun(b);} }); turun(sel); }
  const kelas=id=>!sel?'':id===sel?'pilih':hulu.has(id)?'hulu':hilir.has(id)?'hilir':'redup';
  let g=`<svg viewBox="0 0 ${Wd} ${tinggi}" width="100%" class="gik${sel?' sel':''}" role="img" aria-label="Interkoneksi pabrik">`;
  ['01 · ASAL PASOKAN','02 · BAHAN BAKU DAN ANTARA','03 · UNIT PRODUKSI','04 · PRODUK'].forEach((t,i)=>g+=`<text x="${kolX[i]}" y="22" font-family="${MONO}" font-size="11" letter-spacing="1.5" fill="${C.ink3}">${t}</text>`);
  G.edge.forEach(([a,b])=>{ const A=pos[a], B=pos[b]; if(!A||!B) return; const v=w(a,b);
    const tb=v==null?1.2:Math.max(1.2,v/mx*16);
    const x1=A.x+bw, y1=A.y+bh/2, x2=B.x, y2=B.y+bh/2, cx=(x1+x2)/2;
    const k=sel?((hulu.has(a)||a===sel)&&(hulu.has(b)||b===sel)?'hulu':((hilir.has(b)||b===sel)&&(hilir.has(a)||a===sel)?'hilir':'redup')):'';
    const warna=k==='hulu'?C.amber:k==='hilir'?C.pkg:C.line2;
    g+=`<path d="M${x1} ${y1} C${cx} ${y1},${cx} ${y2},${x2} ${y2}" fill="none" stroke="${warna}" stroke-width="${tb.toFixed(1)}" opacity="${k==='redup'?0.15:0.55}"${v==null?' stroke-dasharray="4 3"':''}/>`; });
  G.node.forEach(n=>{ const p=pos[n.id], k=kelas(n.id); const tone=n.jenis==='asal'?C.line2:n.jenis==='bahan'?C.pkg:n.jenis==='unit'?C.amber:C.steel;
    const mt=n.id.startsWith('u-')?M.unit.find(u=>'u-'+u.unit===n.id):null; const mati=mt&&mt.status&&!/beroperasi/i.test(mt.status.status);
    const mat=M.mat[n.id]; const stt=mat&&mat.ada?SW(mat.status):null;
    g+=`<g class="gikn ${k}" data-g="ikNode" data-v="${esc(n.id)}" style="cursor:pointer" opacity="${k==='redup'?0.3:1}">
      <rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" rx="4" fill="${terang()?'#fff':'#18231D'}" stroke="${k==='pilih'?C.ink:k==='hulu'?C.amber:k==='hilir'?C.pkg:tone}" stroke-width="${k?2:1.2}"/>
      <rect x="${p.x}" y="${p.y}" width="4" height="${bh}" fill="${stt||tone}"/>
      <text x="${p.x+12}" y="${p.y+18}" font-family="${BODYF}" font-size="12" font-weight="600" fill="${mati?C.ink3:C.ink}">${esc(n.label.length>28?n.label.slice(0,27)+'…':n.label)}</text>
      <text x="${p.x+12}" y="${p.y+35}" font-family="${MONO}" font-size="10.5" fill="${C.ink2}">${q[n.id]!=null?(satuan(n.id)==='t'?f0(q[n.id])+' t':f1(q[n.id])+' BBTUD'):''}${mati?' · '+esc(mt.status.status):''}${stt?' · '+mat.status:''}</text></g>`; });
  g+='</svg>';
  return kepala('interkoneksi','Klik satu kotak untuk melihat jalurnya: kuning ke arah hulu, hijau ke arah hilir. Graf disusun dari ENTITY_PROFILES (pemasok gas, unit, bahan) dan kuantum Dalops.')
    + peringatanModul(M,'11')
    + `<div class="fbar"><span class="t">${sel?`Jalur ${esc((G.node.find(n=>n.id===sel)||{}).label||sel)}`:'Klik salah satu kotak untuk melihat jalurnya'}</span>${sel?`<button type="button" data-g="ikNode" data-v="" class="tglbtn">Tampilkan semua</button>`:''}</div>
    <div class="fwrap">${g}</div>
    <div class="legend"><span><i style="background:${C.line2}"></i>Asal pasokan</span><span><i style="background:${C.pkg}"></i>Bahan baku dan antara</span><span><i style="background:${C.amber}"></i>Unit produksi</span><span><i style="background:${C.steel}"></i>Produk</span><span style="color:${C.ink3}">Tebal garis sebanding tonase; garis putus = aliran gas (BBTUD), tidak diskalakan.</span></div>`
    + catatanSumber(M,'Kuantum Januari sampai Desember 2026: realisasi sampai posisi data ditambah rencana. Pita kiri kotak bahan baku berwarna status KRI-nya.');
}

/* ================= 12 KETAHANAN PANGAN ================= */
function m12(M){
  const S=st(M.kode).pangan, P=M.P, d=P.dosis||{};
  const u=(M.produk.Urea||{}).prognosa||0, n=(M.produk.NPK||{}).prognosa||0, rU=M.resepNPK(/urea/i)||0;
  const k=S.pct/100;
  const ureaPasar=Math.max(0,u-n*rU);
  const haU=d.urea?ureaPasar*k*1000/d.urea:null, haN=d.npk?n*k*1000/d.npk:null;
  const paket=(haU!=null&&haN!=null)?Math.min(haU,haN):null;
  const gasT=jumlah((CAK.STORE[M.kode].sheets.ringkasan_gas||[]).map(r=>+r.pasokan_total_bbtud||0));
  const langkah=[['Gas alam',`${f0(gasT)} BBTU`,'pasokan 2026 (realisasi + rencana)'],['Amoniak',`${f0((M.produk.Amoniak||{}).prognosa*k)} t`,'prognosa produksi'],
    ['Urea',`${f0(u*k)} t`,`prognosa; ${f0(n*rU*k)} t dipakai pabrik NPK`],[esc(M.npk.nama),`${f0(n*k)} t`,'prognosa produksi'],
    ['Luas setara urea',haU!=null?`${f0(haU)} ha`:belum('dosis'),`dosis ${d.urea||'—'} kg/ha`],['Luas setara NPK',haN!=null?`${f0(haN)} ha`:belum('dosis'),`dosis ${d.npk||'—'} kg/ha`],
    ['Luas terpupuk paket urea + NPK',paket!=null?`${f0(paket)} ha`:'—','yang terkecil dari dua angka di atas'],['Tambahan hasil panen',belum('[ISI] parameter tambahan gabah per hektare'),'tidak dikarang']];
  return kepala('pangan','Menerjemahkan tonase pupuk menjadi luas sawah terpupuk. Geser slider untuk menguji dampak gangguan pasokan terhadap luas yang bisa dilayani.')
    + peringatanModul(M,'12')
    + `<div class="pctl box"><div class="projtgl"><span>${S.pct}%</span> pemenuhan</div><p class="gsub">Persentase prognosa produksi 2026 yang benar-benar tersedia.</p>
      <input type="range" min="0" max="100" step="1" value="${S.pct}" data-g="pangan" aria-label="Pemenuhan produksi" style="width:100%"></div>
    <div class="grid2" style="margin-top:16px"><div class="box"><h3>Rantai dari bahan baku sampai sawah</h3>${langkah.map(([a,b,c])=>`<div class="pstep"><div class="nm">${a}<div class="gsub">${c}</div></div><div class="val">${b}</div></div>`).join('')}</div>
      <div class="box"><h3>Acuan dosis</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Produk</th><th>Dosis per ha</th><th>Sumber</th></tr></thead><tbody>
        <tr><td>Urea</td><td>${d.urea?d.urea+' kg':'—'}</td><td class="gdim">profil entitas (dummy) [ISI rekomendasi resmi]</td></tr>
        <tr><td>${esc(M.npk.nama)}</td><td>${d.npk?d.npk+' kg':'—'}</td><td class="gdim">profil entitas (dummy) [ISI rekomendasi resmi]</td></tr></tbody></table></div>
        <p class="note-p" style="margin-top:12px">Urea yang dihitung untuk sawah adalah urea dikurangi urea internal untuk NPK. Luas paket memakai angka terkecil karena satu hektare butuh keduanya. Angka hektare menyatakan setara kebutuhan pupuk, bukan luas tanam yang pasti terlayani.</p></div></div>`
    + catatanSumber(M);
}

/* ================= 13 KESIMPULAN ================= */
function keputusan(M){
  const o=[], mats=Object.values(M.mat).filter(m=>m.ada), g=M.gas;
  if(g.ada&&g.status&&g.status!=='Aman') o.push([`Pasokan gas ${f1(g.pct7)}% dari kebutuhan, status ${g.status}.`,
    `${g.hariBawahAman30} dari 30 hari terakhir di bawah ${f0(g.aman)}%${g.episodeMulai?`, berturut-turut sejak ${tgl(g.episodeMulai)}`:''}. Pemasok: ${g.pemasok.map(p=>`${esc(p.nama)} ${f1(p.pct7)}% kontrak`).join('; ')}. Penyangga yang tersisa adalah stok amoniak ${f0((M.mat.NH3||{}).stok)} t.`]);
  mats.filter(m=>m.status!=='Aman').sort((a,b)=>a.pem-b.pem).forEach(m=>o.push([`${m.nama} ${f1(m.pem)}% dari safety stock (${m.status}).`, narasiKeputusan(M,m)]));
  M.kapal.filter(k=>k.mendatang&&k.tunda>14).forEach(k=>o.push([`Kargo ${k.material} ${k.nama_kapal} mundur ${k.tunda} hari.`,`ETA ${tgl(k.eta_awal)} menjadi ${tgl(k.eta_terkini)}${k.catatan?` (${esc(k.catatan).toLowerCase()})`:''}. Konfirmasi ulang jadwal ke pemasok dan siapkan opsi pengganti bila mundur lagi.`]));
  M.statusUnit.filter(u=>!/beroperasi/i.test(u.status)).forEach(u=>o.push([`${u.unit} ${String(u.status).toLowerCase()} ${u.mulai?tgl(u.mulai)+' – '+tgl(u.selesai):''}.`,`${esc(u.keterangan||'')}. Pastikan rencana start-up dan beban unit lain sudah memperhitungkan pemakaian stok penyangga.`]));
  const l1=M.lini1.filter(p=>p.hari!=null&&p.hari>20&&p.tren>0);
  l1.forEach(p=>o.push([`${p.produk} di Lini I menumpuk ${f1(p.hari)} hari penyaluran.`,`Stok ${f0(p.stok)} t, bertambah ${f0(p.tren)} t/hari. Hambatan ada di distribusi; percepat penyaluran agar gudang tidak membatasi produksi.`]));
  Object.values(M.produk).filter(p=>GUI.statusProd(p.pctProrata)&&GUI.statusProd(p.pctProrata)!=='Aman').forEach(p=>o.push([`Produksi ${p.produk} ${f1(p.pctProrata)}% dari RKAP sampai posisi data.`,`Realisasi ${f0(p.ytd)} t terhadap ${f0(p.rkYtd)} t RKAP pro-rata. Kekurangan ${f0(p.rkYtd-p.ytd)} t perlu ditutup pada sisa tahun.`]));
  if(!o.length) o.push(['Tidak ada pemicu yang menyala.','Semua bahan baku di atas safety stock dan pasokan gas memenuhi kebutuhan. Pertahankan pemantauan rutin.']);
  return o;
}
function narasiKeputusan(M,m){
  const t=[`Stok ${f0(m.stok)} t terhadap safety stock ${f0(m.ss)} t.`];
  if(m.k==='NH3'){ t.push(m.defisit7>0?`Stok turun ${f0(m.defisit7)} t/hari; penyangga di atas deadstock tinggal ${f1(m.hariPenyangga)} hari.`:'Stok masih naik, tetapi di bawah safety stock sehingga ruang menyerap gangguan gas lebih kecil.');
    t.push('Pertimbangkan mengurangi penjualan/transfer amoniak sampai stok kembali di atas safety stock.'); return t.join(' '); }
  if(m.kapalBerikut) t.push(`Kargo berikutnya ${tgl(m.kapalBerikut.eta_terkini)}, ${f0(m.kapalBerikut.volume_t)} t.`);
  if(m.min&&m.min.pem<100) t.push(`Titik terendah rencana ${f0(m.min.v)} t (${f1(m.min.pem)}%) pada ${tgl(m.min.t)}${m.min.v<m.dead?', di bawah deadstock':', masih di atas deadstock'}.`);
  t.push('Kaji pinjaman antar-entitas PI Group atau pembelian pengganti bila kargo bergeser lagi.');
  return t.join(' ');
}
function m13(M){
  const s=M.siaga, def=s.def;
  const teks=M.siagaTeks.length?M.siagaTeks:(def?def.tingkat.map(t=>({tingkat:t.nama,pemicu:'(aturan terstruktur di profil)',tindakan:''})):[]);
  const tw=teks.map((t,i)=>{ const lv=i+1, aktif=s.lv===lv, kena=s.pemicu.filter(p=>p.lv===lv);
    return `<div class="tw l${lv}${aktif?' gaktif':''}"><div class="lv">${esc(t.tingkat)}${aktif?' · <b>AKTIF</b>':''}</div><div class="tg">${esc(t.pemicu)}</div><p>${esc(t.tindakan)}</p>
      ${kena.length?`<div class="gkena">${kena.map(p=>`<div>● ${esc(p.teks)}</div>`).join('')}</div>`:''}</div>`; }).join('');
  return kepala('keputusan','Ambang pemicu dan tindakannya, disusun agar keputusan tidak menunggu rapat. Tingkat yang menyala dihitung otomatis dari data.')
    + peringatanModul(M,'13')
    + `<div class="grid2"><div class="box"><h3>Ambang pemicu bertingkat</h3>
      <p class="note-p" style="margin:-4px 0 12px">Status ambang: <b>${def&&def.status==='usulan'?'USULAN, belum ditetapkan':'resmi'}</b>. Hari penyangga amoniak dihitung terhadap defisit bersih 7 hari (pemakaian + penjualan − produksi), bukan pemakaian kotor.</p>${tw}
      <div class="gstatus">Tingkat saat ini: <b style="color:${s.lv>=2?C.red:s.lv===1?C.amber:C.pkg}">${s.lv?`Siaga ${s.lv}`:'Normal'}</b></div></div>
      <div class="box"><h3>Yang perlu diputuskan lebih dulu</h3><ul class="acts">${keputusan(M).map(([b,t])=>`<li><b>${esc(b)}</b> ${t}</li>`).join('')}</ul></div></div>`
    + catatanSumber(M);
}

/* ================= 14 RINGKASAN EKSEKUTIF ================= */
function teksRingkas(M){
  const P=M.P, mats=Object.values(M.mat).filter(m=>m.ada), g=M.gas, s=M.siaga;
  const L=[];
  if(M.dummy) L.push('[DATA DUMMY — angka fiktif untuk pengembangan, bukan untuk pelaporan]');
  L.push(`RINGKASAN KETAHANAN BAHAN BAKU · ${P.nama}`);
  L.push(`Posisi ${tglP(M.pos)} · sumber master Dalops ${M.kode}${M.dummy?' (DUMMY)':''} · konsumsi rata-rata 30 hari ${tgl(M.awal30)} – ${tgl(M.pos)}`);
  L.push('');
  L.push(`Tingkat siaga: ${s.lv?`Siaga ${s.lv}`:'Normal'} (ambang usulan).`);
  if(g.ada) L.push(`Gas alam: pasokan 7 hari ${f1(g.pasokan7)} BBTUD = ${f1(g.pct7)}% kebutuhan${g.status?`, ${g.status}`:''}; ${f1(g.kontrakPct7)}% dari kontrak ${f0(g.kontrak)} BBTUD.`);
  mats.forEach(m=>L.push(`${m.nama}: ${f0(m.stok)} t, ${f1(m.pem)}% safety stock, ${m.status}${m.k==='NH3'?(m.hariPenyangga!=null?`; penyangga ${f1(m.hariPenyangga)} hari`:'; stok tidak menipis'):(m.temSS&&m.temSS!=='sudah'?`; menyentuh safety stock ${tgl(m.temSS)}`:'')}.`));
  L.push('');
  L.push('Perlu perhatian:');
  keputusan(M).forEach(([b,t])=>L.push(`- ${b} ${t.replace(/<[^>]+>/g,'')}`));
  if(M.perubahan.length){ L.push(''); L.push('Perubahan rencana kedatangan:'); M.perubahan.forEach(r=>L.push(`- ${r.material} ${r.nama_kapal}: ${tgl(r.eta_lama)} → ${tgl(r.eta_baru)} (${r.alasan||'tanpa keterangan'}).`)); }
  return L.join('\n');
}
function m14(M){
  const P=M.P, mats=Object.values(M.mat).filter(m=>m.ada), g=M.gas;
  const tbl=`<table class="tbl"><thead><tr><th>Material</th><th>Stok tercatat</th><th>Pemenuhan</th><th>Status</th><th>Menyentuh safety stock</th><th>Sifat pasokan</th></tr></thead><tbody>`
    + (g.ada?`<tr><td>Gas alam</td><td>${f1(g.pasokan7)} BBTUD</td><td>${f1(g.pct7)}% keb.</td><td>${pill(g.status,'tanpa ambang')}</td><td>—</td><td class="gdim">Pipa (PJBG)</td></tr>`:'')
    + mats.map(m=>`<tr><td>${esc(m.nama)}</td><td>${f0(m.stok)} t</td><td style="color:${SW(m.status)};font-weight:600">${f1(m.pem)}%</td><td>${pill(m.status)}</td><td>${m.temSS==='sudah'?'sudah di bawah':m.temSS?tgl(m.temSS):'Tidak sampai Desember'}</td><td class="gdim">${esc(m.sifat)}</td></tr>`).join('')
    + `</tbody></table>`;
  return kepala('ringkasan','Satu halaman siap disalin ke memo Direksi. Angkanya ikut berubah setiap kali data baru dimuat.')
    + `<div class="box"><div class="gringkas">
      ${M.dummy?`<div class="gdmyline">DATA DUMMY — angka fiktif untuk pengembangan, bukan untuk pelaporan</div>`:''}
      <div class="glab">Manajemen Risiko · ${esc(P.nama)}</div><h3 style="margin:2px 0 4px">Ringkasan Ketahanan Bahan Baku</h3>
      <p class="gsub">Posisi ${tglP(M.pos)} · sumber master Dalops ${esc(M.kode)}${M.dummy?' (DUMMY)':''} · tingkat ${M.siaga.lv?`<b style="color:${M.siaga.lv>=2?C.red:C.amber}">Siaga ${M.siaga.lv}</b>`:'Normal'} (ambang usulan)</p>
      <div class="glab" style="margin-top:14px">01 · Posisi stok</div><div style="overflow-x:auto">${tbl}</div>
      <div class="glab" style="margin-top:14px">02 · Perlu perhatian</div><ul class="acts">${keputusan(M).map(([b,t])=>`<li><b>${esc(b)}</b> ${t}</li>`).join('')}</ul></div>
      <button class="tglbtn" type="button" data-g="salin" style="margin-top:16px">Salin teks ringkasan</button><span class="gsub" data-salin-stat style="margin-left:10px"></span></div>`
    + catatanSumber(M);
}

/* ================= perender & kejadian ================= */
const MOD = {stok:GUI.m01, produksi:GUI.m02, produk:GUI.m03, peta:m04, proyeksi:GUI.m05, rop:GUI.m06, perubahan:GUI.m07,
  sken:m08, simulasi:m09, komposisi:m10, interkoneksi:m11, pangan:m12, keputusan:m13, ringkasan:m14};
function render(kode, tab, el){
  const M=GASM.bangun(kode); if(!M||!MOD[tab]) return false;
  PASANG.length=0;
  try{ el.innerHTML = MOD[tab](M); }
  catch(err){ el.innerHTML = kepala(tab)+`<div class="cakwarn"><b>Modul gagal digambar</b><div>${esc(err.message)}</div></div>`; console.error(err); }
  PASANG.splice(0).forEach(f=>{ try{ f(); }catch(e){ console.error(e); } });
  return true;
}
function rerender(){ CAK.paintModulAktif(); }
document.addEventListener('click', e=>{
  const b=e.target.closest('[data-g]'); if(!b||!b.closest('.ent-gen')) return;
  const kode=CAK.ent, M=GASM.bangun(kode); if(!M) return; const S=st(kode), g=b.dataset.g, v=b.dataset.v;
  if(g==='projMode'){ S.proj.mode=v; }
  else if(g==='petaMat'){ S.peta.mat = v==='Semua'?null:v; }
  else if(g==='src'){ S.mati.has(v)?S.mati.delete(v):S.mati.add(v); S.s08.preset='manual'; }
  else if(g==='preset08'){ terapkanPreset08(M,v); }
  else if(g==='preset09'){ const p=PRESET09.find(x=>x[0]===v); if(p){ Object.assign(S.s09,p[2]); S.s09.preset=v; } }
  else if(g==='krArah'){ S.kr.arah=v; S.kr.jml=1; }
  else if(g==='krBahan'){ S.kr.bahan=v; }
  else if(g==='krSat'){ S.kr.sat=v; }
  else if(g==='ikNode'){ S.ik.sel = (v===''||S.ik.sel===v)?null:v; }
  else if(g==='salin'){ const t=teksRingkas(M); const tanda=b.parentElement.querySelector('[data-salin-stat]');
    const ok=()=>{ if(tanda) tanda.textContent='Tersalin'+(M.dummy?' (dengan penanda DATA DUMMY)':''); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok,()=>{ if(tanda) tanda.textContent='Gagal menyalin; pilih teks secara manual.'; });
    else { const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(x){} ta.remove(); }
    return; }
  else return;
  rerender();
});
document.addEventListener('input', e=>{
  const b=e.target.closest('[data-g]'); if(!b||!b.closest('.ent-gen')) return;
  const kode=CAK.ent, S=st(kode), g=b.dataset.g;
  if(g==='projSlider'){ S.proj.i=+b.value; }
  else if(g==='rop'){ S.rop[b.dataset.k]=+b.value; }
  else if(g==='gasTurun08'){ S.s08.gasTurun=+b.value; }
  else if(g==='s09'){ S.s09[b.dataset.k]=+b.value; S.s09.preset='manual'; }
  else if(g==='pangan'){ S.pangan.pct=+b.value; }
  else if(g==='krJml'){ const v=parseFloat(b.value); if(!isFinite(v)) return; S.kr.jml=v;
    const pos=b.selectionStart; rerender(); const n=document.querySelector('.ent-gen [data-g="krJml"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos);}catch(x){} } return; }
  else return;
  /* pertahankan fokus slider saat digambar ulang */
  const sel=`[data-g="${g}"]${b.dataset.k?`[data-k="${b.dataset.k}"]`:''}`;
  rerender(); const n=document.querySelector('.ent-gen:not([hidden]) '+sel+', section:not([hidden]) .ent-gen '+sel); if(n) n.focus();
});
document.addEventListener('change', e=>{
  const b=e.target.closest('[data-g]'); if(!b||!b.closest('.ent-gen')) return;
  const S=st(CAK.ent), g=b.dataset.g;
  if(g==='s09sel'){ S.s09[b.dataset.k]=b.value; S.s09.preset='manual'; rerender(); }
  if(g==='s09cek'){ S.s09[b.dataset.k]=b.checked; S.s09.preset='manual'; rerender(); }
});

return {render, teksRingkas, keputusan, lintasan, gambarPeta, proj, siapGeo, opsi09, PRESET09};
})();
