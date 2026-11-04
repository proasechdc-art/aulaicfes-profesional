/* Hoja de respuestas de AulaICFES: se adapta al número de preguntas (hasta 120).
   La misma función dibuja la hoja para imprimir y entrega las posiciones que usa el lector de fotos. */
const HOJA=(function(){
const PX=8,PW=210,PH=297;           // 8 píxeles por mm, hoja A4
const NDIG=11,NVER=6,MAXQ=120;
function layout(nq){
  nq=Math.max(1,Math.min(MAXQ,nq|0));
  const cols=Math.ceil(nq/30),rows=Math.ceil(nq/cols),top=102,bottom=274,pitch=Math.min(7,(bottom-top)/rows),d=4.0;
  const o=(cx,cy,dd)=>[cx*PX,cy*PX,dd*PX,dd*PX];
  const marks=[[16,16],[194,16],[16,280],[194,280]].map(p=>[p[0]*PX,p[1]*PX,8*PX,8*PX]);
  const preguntas=[],nums=[],heads=[];
  for(let c=0;c<cols;c++){const x0=14+c*46.5;heads.push({x0,y:top-3.5});
    for(let r=0;r<rows;r++){const q=c*rows+r+1;if(q>nq)break;const cy=top+pitch*(r+0.5);nums.push({q,x:x0,y:cy});
      const row=[q];for(let k=0;k<4;k++)row.push(o(x0+13.5+k*8.5,cy,d));preguntas.push(row)}}
  const idcols=[],idlabels=[];
  for(let i=0;i<NDIG;i++){const cx=26+i*6.2,col=[];for(let r=0;r<10;r++)col.push(o(cx,53+r*4.4,3.4));idcols.push(col)}
  for(let r=0;r<10;r++)idlabels.push({d:r,x:19,y:53+r*4.4});
  const ver=[];for(let i=0;i<NVER;i++)ver.push(o(122,55+i*7.5,d));
  return{W:PW*PX,H:PH*PX,px:PX,nq,cols,rows,marks,preguntas,idcols,ver,nums,heads,idlabels,pitch}}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
/* info: {titulo, colegio, nombre, documento, curso, version (0-5), codigo, fecha, logo} */
function html(L,info){
  const m=v=>(v/PX).toFixed(2)+'mm',P=L.px;
  const box=(x,y,w,h,st)=>`<div style="position:absolute;left:${m(x)};top:${m(y)};width:${m(w)};height:${m(h)};${st||''}"></div>`;
  const txt=(x,y,t,st)=>`<div style="position:absolute;left:${(x).toFixed(2)}mm;top:${(y).toFixed(2)}mm;white-space:nowrap;${st||''}">${t}</div>`;
  const bub=(o,fill)=>`<div style="position:absolute;left:${m(o[0]-o[2]/2)};top:${m(o[1]-o[3]/2)};width:${m(o[2])};height:${m(o[3])};box-sizing:border-box;border:0.3mm solid #000;border-radius:50%;${fill?'background:#000;':''}-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>`;
  let h=`<div class="pg hoja" style="position:relative;width:186mm;height:272mm;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff"><div style="position:absolute;left:-12mm;top:-12mm;width:210mm;height:297mm">`;
  L.marks.forEach(k=>{h+=box(k[0]-k[2]/2,k[1]-k[3]/2,k[2],k[3],'background:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact')});
  if(info.logo)h+=`<img src="${esc(info.logo)}" style="position:absolute;left:26mm;top:12mm;height:14mm" alt="">`;
  h+=txt(info.logo?46:26,12,`<b style="font-size:13pt">HOJA DE RESPUESTAS</b>`);
  h+=txt(info.logo?46:26,18.5,`<span style="font-size:9pt">${esc(info.titulo||'')}</span>`);
  h+=txt(info.logo?46:26,23,`<span style="font-size:8pt;color:#333">${esc(info.colegio||'')}</span>`);
  h+=box(26,30,158,0,'border-top:0.3mm solid #000');
  h+=txt(26,32,`<span style="font-size:9pt">Estudiante: <b>${esc(info.nombre||'')}</b></span>`);
  h+=txt(26,37.5,`<span style="font-size:9pt">Documento: <b>${esc(info.documento||'')}</b> &nbsp; Curso: <b>${esc(info.curso||'')}</b> &nbsp; Fecha: <b>${esc(info.fecha||'')}</b></span>`);
  h+=txt(26,43,`<span style="font-size:7.5pt;color:#333">Código del examen: ${esc(info.codigo||'')}</span>`);
  h+=txt(17,47,`<b style="font-size:7pt">DOCUMENTO (ya marcado, no lo modifiques)</b>`);
  L.idlabels.forEach(l=>{h+=txt(l.x-1.2,l.y-1.6,`<span style="font-size:6pt">${l.d}</span>`)});
  const doc=String(info.documento||'').replace(/\D/g,'').padStart(L.idcols.length,'0').slice(-L.idcols.length);
  L.idcols.forEach((col,i)=>col.forEach((o,r)=>{h+=bub(o,String(r)===doc[i])}));
  h+=txt(112,47,`<b style="font-size:7pt">VERSIÓN</b>`);
  L.ver.forEach((o,i)=>{h+=txt(o[0]/P-9,o[1]/P-1.7,`<span style="font-size:8pt">${'ABCDEF'[i]}</span>`);h+=bub(o,i===(info.version|0))});
  h+=txt(132,60,`<div style="font-size:7pt;line-height:1.5;width:55mm">Marca solo una opción por pregunta.<br>Rellena el óvalo por completo con lápiz o bolígrafo negro.<br>No uses X ni chulos.<br>No dobles ni arrugues la hoja.</div>`);
  L.heads.forEach(hd=>{['A','B','C','D'].forEach((t,k)=>{h+=txt(hd.x0+13.5+k*8.5-0.9,hd.y-1.6,`<b style="font-size:8pt">${t}</b>`)})});
  L.nums.forEach(n=>{h+=txt(n.x+(n.q>99?0:n.q>9?1.5:3),n.y-1.8,`<b style="font-size:8pt">${n.q}</b>`)});
  L.preguntas.forEach(row=>{for(let k=1;k<row.length;k++)h+=bub(row[k],false)});
  return h+'</div></div>'}
return{layout,html,PX,NDIG,NVER,MAXQ}})();
if(typeof module!=='undefined')module.exports=HOJA;
