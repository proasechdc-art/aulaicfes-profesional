/* AulaICFES · admin.js
   Panel del ADMINISTRADOR (la plataforma en general). Se carga solo cuando hace falta.
   El administrador NO ve estudiantes, clases ni exámenes impresos como propios: supervisa a
   rectores, coordinadores y docentes (solo lectura) y administra catálogos, banco e historial.
   Todo permiso real lo garantiza la base de datos (RLS); aquí solo se arma la pantalla. */
(function(){
'use strict';
const A={sum:null,pend:[],list:[],role:'',sel:null,sub:'act',det:null,tdet:false,fst:'todos',q:'',hist:[],names:{}};
const C={sub:'territorio',deps:[],muns:[],cols:[],colsTotal:0,areas:[],asigs:[],depSel:'',munSel:'',colSel:'',colQ:''};
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const cnt=q=>q.then(r=>{if(r.error)throw r.error;return r.count||0});
const head=t=>sb.from(t).select('id',{count:'exact',head:true});
const fd=x=>{if(!x)return'—';const d=new Date(String(x).length===10?x+'T00:00:00':x);return d.toLocaleDateString('es-CO')};
const ft=x=>x?new Date(x).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'—';
const ST=s=>s==='aprobado'?'✅ Aprobado':s==='rechazado'?'⛔ No aprobado':'🕒 Pendiente';
const RL={rector:'Rector',coordinador:'Coordinador',prof:'Docente',est:'Estudiante'};
const SEL='colegios(nombre,codinst,municipios(nombre,departamentos(nombre)))';
const sch=c=>c?`${E(c.nombre)} · ${E(c.municipios?.nombre||'')} (${E(c.municipios?.departamentos?.nombre||'')})`:'—';
const card=h=>`<div class="bg-white rounded-2xl p-4 shadow">${h}</div>`;
const stat=(n,l)=>`<div class="bg-white rounded-2xl p-4 shadow text-center"><div class="text-3xl font-extrabold text-indigo-700">${n}</div><div class="text-xs text-slate-500">${l}</div></div>`;
const btn=(fn,txt,cls)=>`<button onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${cls}">${txt}</button>`;
const val=id=>(document.getElementById(id)?.value||'').trim();
const TITLES={rector:['🏫 Rectores','Elige un rector para ver su colegio, los coordinadores y docentes a su cargo y lo que ha hecho. Aquí también apruebas o retiras su cuenta.'],
  coordinador:['🧑‍💼 Coordinadores','Elige un coordinador para ver su colegio y lo que hacen los docentes. Los coordinadores los aprueba el rector de su colegio, pero tú también puedes hacerlo.'],
  prof:['👩‍🏫 Docentes','Elige un docente para ver, solo para consulta, sus cursos, estudiantes, simulacros, resultados, exámenes impresos y asistencia.']};

/* ---------- Carga de datos ---------- */
async function loadRes(){
  const P=(role,st)=>{let q=head('profiles').eq('role',role);if(st)q=q.eq('teacher_status',st);if(role==='prof')q=q.eq('is_admin',false);return cnt(q)};
  const [ra,rp,ca,cp,da,dp,es,co,cu,si,at,qa,qt]=await Promise.all([
    P('rector','aprobado'),P('rector','pendiente'),P('coordinador','aprobado'),P('coordinador','pendiente'),
    P('prof','aprobado'),P('prof','pendiente'),cnt(head('profiles').eq('role','est')),
    cnt(head('colegios')),cnt(head('courses')),cnt(head('simulacros')),cnt(head('attempts')),
    cnt(head('questions').eq('active',true)),cnt(head('questions'))]);
  A.sum={ra,rp,ca,cp,da,dp,es,co,cu,si,at,qa,qt};
  const p=ok(await sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,created_at,school_other,colegio_id,'+SEL).eq('teacher_status','pendiente').in('role',['rector','coordinador','prof']).eq('is_admin',false).order('created_at').limit(100));
  A.pend=p.filter(x=>x.role!=='prof'||!x.colegio_id);
}
async function loadList(role){
  let q=sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,created_at,colegio_id,school_other,area,asignaturas,grados,'+SEL).eq('role',role).order('created_at',{ascending:false}).limit(500);
  if(role==='prof')q=q.eq('is_admin',false);
  A.list=ok(await q);
}
async function namesOf(ids){
  const u=[...new Set(ids.filter(Boolean))];if(!u.length)return{};
  const m={};ok(await sb.from('profiles').select('id,full_name,role').in('id',u)).forEach(p=>{m[p.id]=p});return m;
}
async function loadDet(id){
  const p=A.list.find(x=>x.id===id);
  const [au,st]=await Promise.all([
    sb.from('auditoria').select('id,user_id,accion,entidad_id,detalle,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(100),
    p&&p.colegio_id?sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,area,asignaturas,grados,created_at').eq('colegio_id',p.colegio_id).in('role',['coordinador','prof']).eq('is_admin',false).order('full_name'):{data:[]}]);
  const aud=ok(au),staff=ok(st);
  A.det={aud,staff,names:await namesOf(aud.map(h=>h.entidad_id))};
}
async function loadHist(){
  A.hist=ok(await sb.from('auditoria').select('id,user_id,accion,entidad,entidad_id,detalle,created_at').order('created_at',{ascending:false}).limit(200));
  A.names=await namesOf(A.hist.flatMap(h=>[h.user_id,h.entidad_id]));
}
async function loadMuns(dep){C.muns=dep?ok(await sb.from('municipios').select('id,nombre,codigo_divipola').eq('departamento_id',dep).order('nombre').limit(1000)):[]}
async function loadCols(){
  if(!C.munSel){C.cols=[];C.colsTotal=0;C.colSel='';return}
  let all=[],o=0;
  for(;;){const r=await sb.from('colegios').select('id,nombre,codinst,fuente').eq('municipio_id',C.munSel).order('nombre').order('id').range(o,o+999);if(r.error)throw r.error;const d=r.data||[];all=all.concat(d);if(d.length<1000)break;o+=1000}
  C.cols=all;C.colsTotal=all.length;if(!all.some(x=>String(x.id)===String(C.colSel)))C.colSel='';
}
async function loadCatalog(){
  const [d,a,s]=await Promise.all([sb.from('departamentos').select('id,nombre,codigo_divipola').order('nombre'),sb.from('areas').select('id,nombre').order('nombre'),sb.from('asignaturas').select('id,nombre,area_id,banco_subject').order('nombre')]);
  C.deps=ok(d);C.areas=ok(a);C.asigs=ok(s);
  await loadMuns(C.depSel);await loadCols();
}
function dropCaches(){D.areas=null;D.asigs=null;D.deps=null;D.muns=[];D.cols=[]}

/* ---------- Pantallas ---------- */
function pendRow(p){
  const who=p.role==='prof'?`Docente sin colegio del catálogo: ${E(p.school_other||'—')}`:sch(p.colegios);
  return`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${RL[p.role]||''}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div><div class="text-xs text-slate-500">${who} · registrado el ${fd(p.created_at)}</div></div><div class="flex gap-2">${btn(`ADM.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white')}${btn(`ADM.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200')}</div></div>`;
}
function vRes(){
  const s=A.sum||{};
  const aviso=!s.co?card('<h3 class="font-semibold mb-1">⚠️ El catálogo de colegios está vacío</h3><p class="text-sm text-slate-600">Mientras no haya colegios, los rectores y coordinadores no pueden registrarse. Agrégalos en <b>Catálogos</b>.</p>'):'';
  const pend=A.pend.map(pendRow).join('');
  return`<div class="space-y-4">${card('<h2 class="text-xl font-bold">📈 Administración de la plataforma</h2><p class="text-sm text-slate-600">Vista general de AulaICFES. Desde aquí supervisas a rectores, coordinadores y docentes, y administras los catálogos y el banco de preguntas.</p>')}${aviso}
  <div class="grid sm:grid-cols-3 gap-3">${stat(s.ra??0,'Rectores aprobados')}${stat(s.rp??0,'Rectores pendientes')}${stat(s.ca??0,'Coordinadores aprobados')}${stat(s.cp??0,'Coordinadores pendientes')}${stat(s.da??0,'Docentes aprobados')}${stat(s.dp??0,'Docentes pendientes')}${stat(s.co??0,'Colegios en el catálogo')}${stat(s.es??0,'Estudiantes con cuenta')}${stat(s.cu??0,'Cursos')}${stat(s.si??0,'Simulacros y tareas')}${stat(s.at??0,'Intentos realizados')}${stat((s.qa??0)+' / '+(s.qt??0),'Preguntas activas / total')}</div>
  ${card(`<h3 class="font-semibold mb-2">🕒 Cuentas por aprobar</h3><p class="text-xs text-slate-500 mb-2">Rectores y coordinadores, y docentes que no eligieron un colegio del catálogo. Los demás docentes los aprueba el rector de su colegio.</p>${pend?`<div class="space-y-2">${pend}</div>`:'<p class="text-sm text-slate-500">No hay cuentas pendientes.</p>'}`)}</div>`;
}
function filtered(){
  const q=A.q.toLowerCase();
  return A.list.filter(p=>(A.fst==='todos'||p.teacher_status===A.fst)&&(!q||[p.full_name,p.email,p.colegios?.nombre,p.colegios?.municipios?.nombre,p.colegios?.municipios?.departamentos?.nombre,p.school_other].some(x=>String(x||'').toLowerCase().includes(q))));
}
function rowHtml(p){
  const extra=p.role==='prof'&&p.area?`<div class="text-xs text-slate-500">Área: ${E(p.area)} · ${E((p.asignaturas||[]).join(', '))}</div>`:'';
  const cole=p.colegio_id?sch(p.colegios):(p.school_other?E(p.school_other)+' <span class="text-xs">(no está en el catálogo)</span>':'Sin colegio');
  const acts=(p.teacher_status!=='aprobado'?btn(`ADM.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white'):'')+(p.teacher_status==='pendiente'?btn(`ADM.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200'):'')+(p.teacher_status==='aprobado'?btn(`ADM.setSt('${p.id}','rechazado')`,'Retirar permiso','bg-slate-200'):'');
  return`<div class="bg-white rounded-2xl p-4 shadow"><div class="flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${ST(p.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div><div class="text-xs text-slate-500">${cole}</div>${extra}<div class="text-xs text-slate-500">Registrado el ${fd(p.created_at)}</div></div><div class="flex flex-wrap gap-2">${btn(`ADM.open('${p.id}')`,'Ver lo que ha hecho','bg-indigo-600 text-white')}${acts}</div></div></div>`;
}
function listHtml(){const l=filtered();return l.length?l.map(rowHtml).join(''):card('<p class="text-sm text-slate-500">No hay resultados.</p>')}
function vList(){
  const [t,d]=TITLES[A.role]||['',''];
  const opt=(v,l)=>`<option value="${v}" ${A.fst===v?'selected':''}>${l}</option>`;
  return`<div class="space-y-4">${card(`<h2 class="text-xl font-bold">${t}</h2><p class="text-sm text-slate-600">${d}</p><div class="flex flex-wrap gap-2 mt-3"><input class="border rounded-lg p-2 text-sm" style="min-width:220px" placeholder="Buscar por nombre, correo, colegio o municipio…" value="${E(A.q)}" oninput="ADM.q(this.value)"><select class="border rounded-lg p-2 text-sm" onchange="ADM.fst(this.value)">${opt('todos','Todos los estados')}${opt('pendiente','🕒 Pendientes')}${opt('aprobado','✅ Aprobados')}${opt('rechazado','⛔ No aprobados')}</select></div><p class="text-xs text-slate-500 mt-2">${A.list.length} en total</p>`)}<div id="adm-list" class="space-y-3">${listHtml()}</div></div>`;
}
function vPerson(){
  if(A.tdet&&window.DIR)return DIR.viewDet();
  const p=A.list.find(x=>x.id===A.sel),X=A.det;
  if(!p||!X)return card('<p class="text-sm text-slate-500">Cargando…</p>');
  const subs=A.role==='rector'?[['act','🧾 Lo que ha hecho'],['staff','👥 Su colegio']]:[['staff','👥 Su colegio']];
  const sub=subs.some(s=>s[0]===A.sub)?A.sub:subs[0][0];
  const pers=x=>`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(x.full_name)} <span class="text-xs text-slate-500">${RL[x.role]||''} · ${ST(x.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(x.email||'')} · ${E(x.phone||'')}</div>${x.area?`<div class="text-xs text-slate-500">Área: ${E(x.area)} · ${E((x.asignaturas||[]).join(', '))}</div>`:''}</div>${x.role==='prof'?btn(`ADM.openT('${x.id}')`,'Ver lo que ha hecho','bg-indigo-600 text-white'):''}</div>`;
  let body;
  if(sub==='act'){
    const rows=X.aud.map(h=>{const d=h.detalle||{};return`<tr class="border-t"><td class="py-1" style="padding-right:12px">${ft(h.created_at)}</td><td class="py-1" style="padding-right:12px">${h.accion==='cambio_estado'?`${ST(d.de)} → ${ST(d.a)}`:E(h.accion)}</td><td class="py-1">${E(X.names[h.entidad_id]?.full_name||'—')} <span class="text-xs text-slate-500">${E(RL[d.rol]||'')}</span></td></tr>`}).join('');
    body=card(`<h3 class="font-semibold mb-2">🧾 Cuentas que aprobó o rechazó</h3>${rows?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th class="py-1">Cuándo</th><th class="py-1">Cambio</th><th class="py-1">Cuenta</th></tr>${rows}</table></div>`:'<p class="text-sm text-slate-500">Todavía no ha aprobado ni rechazado cuentas.</p>'}`);
  }else{
    const co=X.staff.filter(x=>x.role==='coordinador'),dc=X.staff.filter(x=>x.role==='prof');
    body=`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">🧑‍💼 Coordinadores (${co.length})</h3>${co.length?`<div class="space-y-2">${co.map(pers).join('')}</div>`:'<p class="text-sm text-slate-500">Sin coordinadores en este colegio.</p>'}`)}${card(`<h3 class="font-semibold mb-2">👩‍🏫 Docentes (${dc.length})</h3>${dc.length?`<div class="space-y-2">${dc.map(pers).join('')}</div>`:'<p class="text-sm text-slate-500">Sin docentes en este colegio.</p>'}`)}</div>`;
  }
  return`<div class="space-y-4">${card(`<button onclick="ADM.back()" class="text-sm text-indigo-700 underline">← Volver a la lista</button><h2 class="text-xl font-bold mt-1">${E(p.full_name)} <span class="text-sm text-slate-500">${RL[p.role]||''} · ${ST(p.teacher_status)}</span></h2><p class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</p><p class="text-xs text-slate-500">${p.colegio_id?sch(p.colegios):'Sin colegio del catálogo'} · <b>Solo lectura</b></p>`)}
  <nav class="flex gap-2 overflow-x-auto">${subs.map(([k,l])=>`<button onclick="ADM.sub('${k}')" class="px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm ${sub===k?'on':'bg-white'}">${l}</button>`).join('')}</nav>${body}</div>`;
}
function vHist(){
  const nm=id=>A.names[id]?.full_name;
  const rows=A.hist.map(h=>{const d=h.detalle||{};return[ft(h.created_at),E(nm(h.user_id)||'Administrador'),h.accion==='cambio_estado'?`${ST(d.de)} → ${ST(d.a)}`:E(h.accion),E(nm(h.entidad_id)||'—')+' <span class="text-xs text-slate-500">'+E(RL[d.rol]||'')+'</span>']});
  const t=rows.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500"><th class="py-1">Cuándo</th><th class="py-1">Quién</th><th class="py-1">Cambio</th><th class="py-1">Cuenta</th></tr>${rows.map(r=>`<tr class="border-t">${r.map(c=>`<td class="py-1" style="padding-right:12px">${c}</td>`).join('')}</tr>`).join('')}</table></div>`:'<p class="text-sm text-slate-500">Todavía no hay movimientos.</p>';
  return card(`<h2 class="text-xl font-bold mb-2">🧾 Historial general</h2><p class="text-sm text-slate-600 mb-2">Quién aprobó o rechazó cuentas en toda la plataforma (últimos 200 movimientos).</p>${t}`);
}
/* ---------- Catálogos ---------- */
const inp=(id,ph,extra='')=>`<input id="${id}" class="w-full border rounded-lg p-2" placeholder="${ph}" ${extra}>`;
const selDep=()=>`<label class="text-sm block">Departamento<select class="w-full border rounded-lg p-2 mt-1" onchange="ADM.dep(this.value)"><option value="">Elige un departamento…</option>${C.deps.map(d=>`<option value="${d.id}" ${String(d.id)===String(C.depSel)?'selected':''}>${E(d.nombre)}</option>`).join('')}</select></label>`;
const selMun=()=>`<label class="text-sm block">Municipio<select class="w-full border rounded-lg p-2 mt-1" ${C.depSel?'':'disabled'} onchange="ADM.mun(this.value)"><option value="">Elige un municipio…</option>${C.muns.map(m=>`<option value="${m.id}" ${String(m.id)===String(C.munSel)?'selected':''}>${E(m.nombre)}</option>`).join('')}</select></label>`;
const colOpts=()=>{const q=C.colQ.toLowerCase(),l=q?C.cols.filter(c=>c.nombre.toLowerCase().includes(q)||(c.codinst||'').includes(q)):C.cols;return`<option value="">${l.length?'Elige una institución…':'Sin resultados'}</option>`+l.map(c=>`<option value="${c.id}" ${String(c.id)===String(C.colSel)?'selected':''}>${E(c.nombre)}</option>`).join('')};
const selCol=()=>`<div class="text-sm"><label class="block">Institución o colegio<select id="cat-colsel" class="w-full border rounded-lg p-2 mt-1" ${C.munSel?'':'disabled'} onchange="ADM.colsel(this.value)">${C.munSel?colOpts():'<option value="">Elige un municipio primero…</option>'}</select></label>${C.munSel?`<input class="w-full border rounded-lg p-2 mt-1 text-sm" placeholder="Buscar por nombre o código…" value="${E(C.colQ)}" oninput="ADM.colq(this.value)"><span class="text-xs text-slate-500">${C.cols.length} institución(es) en este municipio</span>`:''}</div>`;
const colDet=()=>{
  const c=C.cols.find(x=>String(x.id)===String(C.colSel));
  if(!c)return'<p class="text-sm text-slate-500">Elige una institución en la tercera lista para ver sus datos.</p>';
  const m=C.muns.find(x=>String(x.id)===String(C.munSel)),d=C.deps.find(x=>String(x.id)===String(C.depSel));
  const origen=c.fuente==='MEN-DUE-2016'?'Directorio del Ministerio de Educación (2016). Puede estar desactualizado.':'Agregada manualmente.';
  return`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(c.nombre)}</div><div class="text-xs text-slate-500">Código DANE: ${E(c.codinst||'—')}</div><div class="text-xs text-slate-500">${E(m?m.nombre:'')} · ${E(d?d.nombre:'')}</div><div class="text-xs text-slate-500">Origen: ${origen}</div></div>${btn(`ADM.del('colegios','${c.id}')`,'Eliminar institución','bg-slate-200')}</div>`};
const bulk=(id,hint,fn)=>`<details class="mt-2"><summary class="text-sm text-indigo-700">Pegar una lista (varios a la vez)</summary><p class="text-xs text-slate-500 my-1">${hint}</p><textarea id="${id}" rows="6" class="w-full border rounded-lg p-2 text-sm" placeholder="Una fila por línea"></textarea>${btn(fn,'Agregar la lista','bg-indigo-600 text-white')}</details>`;
const delBtn=(t,id,l)=>btn(`ADM.del('${t}','${id}')`,'Eliminar','bg-slate-200');
function vCat(){
  const subs=[['territorio','🗺️ Departamentos y municipios'],['colegios','🏫 Colegios'],['areas','🏷️ Áreas'],['asignaturas','📘 Asignaturas']];
  let b='';
  if(C.sub==='territorio'){
    b=card(`<h3 class="font-semibold mb-2">Departamentos (${C.deps.length})</h3><div class="flex flex-wrap gap-2 mb-2">${C.deps.map(d=>`<span class="px-3 py-1 rounded-lg bg-slate-100 text-sm">${E(d.nombre)} <span class="text-xs text-slate-500">${E(d.codigo_divipola||'')}</span></span>`).join('')||'<span class="text-sm text-slate-500">Todavía no hay departamentos.</span>'}</div><div class="grid sm:grid-cols-3 gap-2">${inp('cat-dnom','Nombre del departamento')}${inp('cat-dcod','Código DIVIPOLA (ej.: 73)')}${btn('ADM.addDep()','Agregar departamento','bg-emerald-600 text-white')}</div>`)
     +card(`<h3 class="font-semibold mb-2">Municipios</h3>${selDep()}${C.depSel?`<p class="text-xs text-slate-500 my-2">${C.muns.length} municipio(s) cargados en este departamento.</p><div class="flex flex-wrap gap-2 mb-2">${C.muns.map(m=>`<span class="px-3 py-1 rounded-lg bg-slate-100 text-sm">${E(m.nombre)} <span class="text-xs text-slate-500">${E(m.codigo_divipola||'')}</span> <button onclick="ADM.del('municipios','${m.id}')" class="text-xs text-slate-500" title="Eliminar">✕</button></span>`).join('')}</div><div class="grid sm:grid-cols-3 gap-2">${inp('cat-mnom','Nombre del municipio')}${inp('cat-mcod','Código DIVIPOLA (ej.: 73055)')}${btn('ADM.addMun()','Agregar municipio','bg-emerald-600 text-white')}</div>${bulk('cat-mbulk','Formato por línea: <b>Nombre;Código DIVIPOLA</b> (puedes copiar dos columnas desde Excel).','ADM.bulkMun()')}`:''}`);
  }else if(C.sub==='colegios'){
    b=card(`<h3 class="font-semibold mb-2">Instituciones educativas</h3><p class="text-xs text-slate-500 mb-2">Elige en orden: departamento, municipio e institución. Las tres son listas desplegables.</p><div class="grid sm:grid-cols-3 gap-2">${selDep()}${selMun()}${selCol()}</div>${C.munSel?`<div id="cat-coldet" class="mt-3">${colDet()}</div><details class="mt-3"><summary class="text-sm text-indigo-700">Agregar una institución que no está en la lista</summary><div class="grid sm:grid-cols-3 gap-2 mt-2">${inp('cat-cnom','Nombre de la institución')}${inp('cat-ccod','Código DANE (12 dígitos)')}${btn('ADM.addCol()','Agregar institución','bg-emerald-600 text-white')}</div>${bulk('cat-cbulk','Formato por línea: <b>Nombre;Código DANE</b>.','ADM.bulkCol()')}</details>`:'<p class="text-sm text-slate-500 mt-3">Cuando elijas departamento y municipio podrás elegir la institución en la tercera lista.</p>'}`);
  }else if(C.sub==='areas'){
    b=card(`<h3 class="font-semibold mb-2">Áreas (${C.areas.length})</h3><div class="space-y-1 mb-2">${C.areas.map(a=>`<div class="border rounded-xl p-2 flex items-center justify-between gap-2 text-sm"><div>${E(a.nombre)}</div>${delBtn('areas',a.id)}</div>`).join('')||'<p class="text-sm text-slate-500">Todavía no hay áreas.</p>'}</div><div class="grid sm:grid-cols-3 gap-2">${inp('cat-anom','Nombre del área')}${btn('ADM.addArea()','Agregar área','bg-emerald-600 text-white')}${btn('ADM.stdAreas()','Cargar las 5 áreas de Saber 11','bg-indigo-600 text-white')}</div><p class="text-xs text-slate-500 mt-2">Las 5 áreas de Saber 11: Lectura Crítica, Matemáticas, Sociales y Ciudadanas, Ciencias Naturales e Inglés. Solo se agregan las que falten.</p>`);
  }else{
    const by=C.areas.map(a=>[a,C.asigs.filter(s=>s.area_id===a.id)]);
    const sin=C.asigs.filter(s=>!C.areas.some(a=>a.id===s.area_id));
    const line=s=>`<div class="border rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-sm"><div>${E(s.nombre)} <span class="text-xs text-slate-500">${s.banco_subject?'banco: '+E(s.banco_subject):'sin materia de banco'}</span></div>${delBtn('asignaturas',s.id)}</div>`;
    b=card(`<h3 class="font-semibold mb-2">Asignaturas (${C.asigs.length})</h3>${by.map(([a,l])=>`<div class="mb-2"><div class="text-sm font-semibold">${E(a.nombre)}</div><div class="space-y-1">${l.map(line).join('')||'<p class="text-xs text-slate-500">Sin asignaturas.</p>'}</div></div>`).join('')}${sin.length?`<div class="mb-2"><div class="text-sm font-semibold">Sin área</div><div class="space-y-1">${sin.map(line).join('')}</div></div>`:''}${C.areas.length?`<div class="grid sm:grid-cols-2 gap-2 mt-2">${inp('cat-snom','Nombre de la asignatura')}<select id="cat-sarea" class="w-full border rounded-lg p-2">${C.areas.map(a=>`<option value="${a.id}">${E(a.nombre)}</option>`).join('')}</select>${inp('cat-ssub','Materia del banco (ej.: Matemáticas)')}${btn('ADM.addAsig()','Agregar asignatura','bg-emerald-600 text-white')}</div><p class="text-xs text-slate-500 mt-2">«Materia del banco» debe coincidir exactamente con la materia de las preguntas que cargues, porque así se enlazan.</p>`:'<p class="text-sm text-slate-500">Primero crea las áreas.</p>'}`);
  }
  return`<div class="space-y-4">${card('<h2 class="text-xl font-bold">🗂️ Catálogos</h2><p class="text-sm text-slate-600">Territorio, colegios, áreas y asignaturas que usan los formularios de registro. Los cambios se ven de inmediato.</p>')}<nav class="flex gap-2 overflow-x-auto">${subs.map(([k,l])=>`<button onclick="ADM.cat('${k}')" class="px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm ${C.sub===k?'on':'bg-white'}">${l}</button>`).join('')}</nav>${b}</div>`;
}

/* ---------- Acciones ---------- */
const parse=t=>t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(/[;\t]/).map(x=>x.trim()));
const friendly=e=>/23503|foreign key|violates/i.test((e&&(e.message||e.code))||'')?'No se puede eliminar: tiene datos asociados (cuentas, colegios o asignaturas que lo usan).':e;
async function insertMany(table,rows,label){
  if(!rows.length)return toast('⚠️','Lista vacía','No encontré filas para agregar.');
  for(let i=0;i<rows.length;i+=200){const r=await sb.from(table).insert(rows.slice(i,i+200));if(r.error)return err(r.error)}
  toast('✅','Guardado',rows.length+' '+label+' agregado(s).');await afterCat();
}
async function afterCat(){dropCaches();try{await loadCatalog()}catch(e){return err(e)}render()}
async function refreshCurrent(){
  if(tab==='ares'){await loadRes();return}
  await loadList(A.role);if(A.sel&&!A.tdet)await loadDet(A.sel);
}
window.ADM={
  async load(t){
    if(t==='ares')await loadRes();
    else if(t==='arec'||t==='acoo'||t==='adoc'){A.role={arec:'rector',acoo:'coordinador',adoc:'prof'}[t];A.sel=null;A.tdet=false;A.det=null;A.q='';A.fst='todos';await loadList(A.role)}
    else if(t==='acat')await loadCatalog();
    else if(t==='ahist')await loadHist();
  },
  view(t){return({ares:vRes,arec:()=>A.sel?vPerson():vList(),acoo:()=>A.sel?vPerson():vList(),adoc:()=>A.sel?vPerson():vList(),acat:vCat,ahist:vHist}[t]||(()=>''))()},
  q(v){A.q=v;const e=document.getElementById('adm-list');if(e)e.innerHTML=listHtml()},
  fst(v){A.fst=v;const e=document.getElementById('adm-list');if(e)e.innerHTML=listHtml()},
  async open(id){
    const p=A.list.find(x=>x.id===id);if(!p)return;
    if(p.role==='prof'){return ADM.openT(id)}
    A.sel=id;A.sub=p.role==='rector'?'act':'staff';A.det=null;A.tdet=false;render();
    try{await loadDet(id)}catch(e){A.sel=null;err(e)}render();
  },
  async openT(id){
    const p=A.list.find(x=>x.id===id)||(A.det&&A.det.staff.find(x=>x.id===id));if(!p)return;
    await loadScript('colegio.js?v=2');
    DIR.onBack=()=>{A.tdet=false;if(A.role==='prof')A.sel=null};
    A.tdet=true;if(A.role==='prof')A.sel=id;
    await DIR.openAny(p);
  },
  back(){A.sel=null;A.det=null;A.tdet=false;render()},
  sub(k){A.sub=k;render()},
  async setSt(id,st){
    const{error}=await sb.from('profiles').update({teacher_status:st}).eq('id',id);
    if(error)return err(error);
    toast('✅','Guardado',st==='aprobado'?'Cuenta aprobada.':'Cuenta actualizada.');
    try{await refreshCurrent()}catch(e){return err(e)}render();
  },
  cat(k){C.sub=k;render()},
  async dep(v){C.depSel=v;C.munSel='';C.colSel='';C.colQ='';C.cols=[];C.colsTotal=0;try{await loadMuns(v)}catch(e){err(e)}render()},
  async mun(v){C.munSel=v;C.colSel='';C.colQ='';try{await loadCols()}catch(e){err(e)}render()},
  colq(v){C.colQ=v;const e=document.getElementById('cat-colsel');if(e)e.innerHTML=colOpts()},
  colsel(v){C.colSel=v;const e=document.getElementById('cat-coldet');if(e)e.innerHTML=colDet()},
  async addDep(){const n=val('cat-dnom'),c=val('cat-dcod');if(n.length<3)return toast('⚠️','Falta el nombre','Escribe el nombre del departamento.');
    const r=await sb.from('departamentos').insert({nombre:n,codigo_divipola:c||null});if(r.error)return err(r.error);toast('✅','Guardado','Departamento agregado.');await afterCat()},
  async addMun(){const n=val('cat-mnom'),c=val('cat-mcod');if(!C.depSel)return toast('⚠️','Elige el departamento','Primero elige el departamento.');if(n.length<3)return toast('⚠️','Falta el nombre','Escribe el nombre del municipio.');
    const r=await sb.from('municipios').insert({departamento_id:+C.depSel,nombre:n,codigo_divipola:c||null});if(r.error)return err(r.error);toast('✅','Guardado','Municipio agregado.');await afterCat()},
  async bulkMun(){if(!C.depSel)return toast('⚠️','Elige el departamento','Primero elige el departamento.');
    await insertMany('municipios',parse(val('cat-mbulk')).filter(r=>r[0]&&r[0].length>=3).map(r=>({departamento_id:+C.depSel,nombre:r[0],codigo_divipola:r[1]||null})),'municipio(s)')},
  async addCol(){const n=val('cat-cnom'),c=val('cat-ccod');if(!C.munSel)return toast('⚠️','Elige el municipio','Primero elige el municipio.');if(n.length<3)return toast('⚠️','Falta el nombre','Escribe el nombre del colegio.');
    const r=await sb.from('colegios').insert({municipio_id:+C.munSel,nombre:n,codinst:c||null});if(r.error)return err(r.error);toast('✅','Guardado','Colegio agregado.');await afterCat()},
  async bulkCol(){if(!C.munSel)return toast('⚠️','Elige el municipio','Primero elige el municipio.');
    await insertMany('colegios',parse(val('cat-cbulk')).filter(r=>r[0]&&r[0].length>=3).map(r=>({municipio_id:+C.munSel,nombre:r[0],codinst:r[1]||null})),'colegio(s)')},
  async addArea(){const n=val('cat-anom');if(n.length<3)return toast('⚠️','Falta el nombre','Escribe el nombre del área.');
    const r=await sb.from('areas').insert({nombre:n});if(r.error)return err(r.error);toast('✅','Guardado','Área agregada.');await afterCat()},
  async stdAreas(){const have=new Set(C.areas.map(a=>a.nombre.toLowerCase()));
    await insertMany('areas',['Lectura Crítica','Matemáticas','Sociales y Ciudadanas','Ciencias Naturales','Inglés'].filter(n=>!have.has(n.toLowerCase())).map(nombre=>({nombre})),'área(s)')},
  async addAsig(){const n=val('cat-snom'),a=val('cat-sarea'),s=val('cat-ssub');if(n.length<3)return toast('⚠️','Falta el nombre','Escribe el nombre de la asignatura.');if(!a)return toast('⚠️','Falta el área','Elige el área.');
    const r=await sb.from('asignaturas').insert({nombre:n,area_id:+a,banco_subject:s||null});if(r.error)return err(r.error);toast('✅','Guardado','Asignatura agregada.');await afterCat()},
  async del(table,id){if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.'))return;
    const r=await sb.from(table).delete().eq('id',id);if(r.error)return err(friendly(r.error));toast('✅','Eliminado','Registro eliminado.');await afterCat()}
};
})();
