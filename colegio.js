/* AulaICFES · colegio.js
   Rector y coordinador (Fase 1). Se carga solo cuando hace falta.
   Todo es de SOLO LECTURA, salvo aprobar o rechazar cuentas (rector y administrador). */
(function(){
'use strict';
const S={school:null,sum:{},pend:[],staff:[],docs:[],sel:'',sub:'cur',det:null,hist:[],names:{},adm:[]};
const ok=r=>{if(r&&r.error)throw r.error;return(r&&r.data)||[]};
const av=a=>a.length?Math.round(a.reduce((x,y)=>x+(+y||0),0)/a.length):0;
const fd=x=>{if(!x)return'—';const d=new Date(String(x).length===10?x+'T00:00:00':x);return d.toLocaleDateString('es-CO')};
const ft=x=>x?new Date(x).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}):'—';
const ST=s=>s==='aprobado'?'✅ Aprobado':s==='rechazado'?'⛔ No aprobado':'🕒 Pendiente';
const RL={rector:'Rector',coordinador:'Coordinador',prof:'Docente',est:'Estudiante'};
const SEL='colegios(nombre,codinst,municipios(nombre,departamentos(nombre)))';
const sch=c=>c?`${E(c.nombre)} · ${E(c.municipios?.nombre||'')} (${E(c.municipios?.departamentos?.nombre||'')})`:'—';
const cnt=q=>q.then(r=>{if(r.error)throw r.error;return r.count||0});
const head=t=>sb.from(t).select('id',{count:'exact',head:true});

/* ---------- Piezas de pantalla ---------- */
const card=h=>`<div class="bg-white rounded-2xl p-4 shadow">${h}</div>`;
const stat=(n,l)=>`<div class="bg-white rounded-2xl p-4 shadow text-center"><div class="text-3xl font-extrabold text-indigo-700">${n}</div><div class="text-xs text-slate-500">${l}</div></div>`;
const tbl=(hs,rows)=>rows.length?`<div class="overflow-x-auto"><table class="w-full text-sm"><tr class="text-left text-slate-500">${hs.map(h=>`<th class="py-1" style="padding-right:12px">${h}</th>`).join('')}</tr>${rows.map(r=>`<tr class="border-t">${r.map(c=>`<td class="py-1" style="padding-right:12px">${c}</td>`).join('')}</tr>`).join('')}</table></div>`:'<p class="text-sm text-slate-500">Todavía no hay información.</p>';
const bar=p=>`<div style="background:#e2e8f0;border-radius:6px;min-width:90px"><div style="width:${Math.max(0,Math.min(100,p))}%;background:${p>=70?'#10b981':p>=50?'#f59e0b':'#ef4444'};height:8px;border-radius:6px"></div></div>`;
const btn=(fn,txt,cls)=>`<button onclick="${fn}" class="px-3 py-1.5 rounded-lg text-xs ${cls}">${txt}</button>`;

/* ---------- Carga de datos ---------- */
async function loadCol(){
  const me=await sb.from('profiles').select(SEL).eq('id',M.id).single();
  S.school=me.data?.colegios||null;
  const [dA,dP,cu,es,si,at]=await Promise.all([
    cnt(head('profiles').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','aprobado')),
    cnt(head('profiles').eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','pendiente')),
    cnt(head('courses')),
    cnt(head('profiles').eq('role','est')),
    cnt(head('simulacros')),
    cnt(head('attempts'))
  ]);
  S.sum={dA,dP,cu,es,si,at};
  const sel='id,full_name,email,phone,role,teacher_status,area,asignaturas,grados,created_at';
  S.pend=ok(await sb.from('profiles').select(sel).in('role',['prof','coordinador']).eq('colegio_id',M.colegio_id).eq('teacher_status','pendiente').order('created_at'));
  S.staff=ok(await sb.from('profiles').select(sel).eq('role','coordinador').eq('colegio_id',M.colegio_id).order('full_name'));
}
async function loadDet(tid){
  const cs=ok(await sb.from('courses').select('id,grade,name').eq('teacher_id',tid).order('grade').order('name'));
  const ids=cs.map(c=>c.id);
  const [ro,st,si,jb,cl]=await Promise.all([
    ids.length?sb.from('roster').select('id,course_id').in('course_id',ids):{data:[]},
    ids.length?sb.from('profiles').select('id,full_name,email,grade,course_id').eq('role','est').in('course_id',ids).order('full_name'):{data:[]},
    sb.from('simulacros').select('id,title,kind,subject,grade,n_questions,active,due_at,simulacro_targets(course_id)').eq('teacher_id',tid).order('created_at',{ascending:false}),
    sb.from('print_jobs').select('id,title,subject,n_questions,versions,exam_date,courses(grade,name)').eq('teacher_id',tid).order('created_at',{ascending:false}),
    sb.from('class_settings').select('title,is_live,updated_at').eq('teacher_id',tid).maybeSingle()
  ]);
  const stu=ok(st),jobs=ok(jb),sids=stu.map(x=>x.id),jids=jobs.map(x=>x.id);
  const [at,pr,ad]=await Promise.all([
    sids.length?sb.from('attempts').select('id,user_id,subject,score,created_at,simulacro_id,simulacros(title)').in('user_id',sids).order('created_at',{ascending:false}).limit(1000):{data:[]},
    jids.length?sb.from('print_results').select('job_id,nota').in('job_id',jids):{data:[]},
    sids.length?sb.from('attendance').select('user_id,session_date,present').in('user_id',sids).order('session_date',{ascending:false}).limit(2000):{data:[]}
  ]);
  S.det={cs,ro:ok(ro),st:stu,si:ok(si),jb:jobs,cl:(cl&&cl.data)||null,at:ok(at),pr:ok(pr),ad:ok(ad)};
}
async function loadDocs(){
  S.docs=ok(await sb.from('profiles').select('id,full_name,email,phone,teacher_status,area,asignaturas,grados,created_at,courses!courses_teacher_id_fkey(grade,name)').eq('role','prof').eq('colegio_id',M.colegio_id).order('full_name'));
  if(S.sel&&!S.docs.find(d=>d.id===S.sel)){S.sel='';S.det=null}
  if(S.sel)await loadDet(S.sel);
}
async function loadHist(){
  S.hist=ok(await sb.from('auditoria').select('id,user_id,accion,entidad,entidad_id,detalle,created_at').order('created_at',{ascending:false}).limit(100));
  const ids=[...new Set(S.hist.flatMap(h=>[h.user_id,h.entidad_id]).filter(Boolean))];
  S.names={};
  if(ids.length)ok(await sb.from('profiles').select('id,full_name,role').in('id',ids)).forEach(p=>{S.names[p.id]=p});
}
async function loadAdm(){
  S.adm=ok(await sb.from('profiles').select('id,full_name,email,phone,role,teacher_status,created_at,'+SEL).in('role',['rector','coordinador']).order('created_at',{ascending:false}));
  D.pendDir=S.adm.filter(x=>x.teacher_status==='pendiente').length;
}

/* ---------- Pantallas ---------- */
function vCol(){
  if(!M.colegio_id)return card('<h2 class="text-xl font-bold">🏫 Mi colegio</h2><p class="text-sm text-red-600">Tu cuenta no tiene un colegio del catálogo. Escribe al administrador para vincularla.</p>');
  const rector=M.role==='rector',s=S.sum;
  const pend=S.pend.map(p=>`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${RL[p.role]||''}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div>${p.area?`<div class="text-xs text-slate-500">Área: ${E(p.area)} · ${E((p.asignaturas||[]).join(', '))}</div>`:''}</div><div class="flex gap-2">${btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white')}${btn(`DIR.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200')}</div></div>`).join('');
  const staff=S.staff.map(p=>`<div class="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${ST(p.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div></div><div class="flex gap-2">${p.teacher_status==='aprobado'?btn(`DIR.setSt('${p.id}','rechazado')`,'Retirar permiso','bg-slate-200'):p.teacher_status==='rechazado'?btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white'):''}</div></div>`).join('');
  return`<div class="space-y-4">${card(`<h2 class="text-xl font-bold">🏫 Mi colegio</h2><p class="text-sm text-slate-600">${sch(S.school)}</p><p class="text-xs text-slate-500 mt-1">${rector?'Como rector apruebas a los docentes y coordinadores de tu colegio y consultas todo lo que hacen.':'Como coordinador consultas lo que hacen los docentes de tu colegio. La aprobación de cuentas la hace el rector.'}</p>`)}
  <div class="grid sm:grid-cols-3 gap-3">${stat(s.dA,'Docentes aprobados')}${stat(s.dP,'Docentes pendientes')}${stat(s.cu,'Cursos')}${stat(s.es,'Estudiantes con cuenta')}${stat(s.si,'Simulacros y tareas')}${stat(s.at,'Intentos realizados')}</div>
  ${rector?card(`<h3 class="font-semibold mb-2">🕒 Cuentas por aprobar</h3>${pend?`<div class="space-y-2">${pend}</div>`:'<p class="text-sm text-slate-500">No hay cuentas pendientes.</p>'}`):''}
  ${rector?card(`<h3 class="font-semibold mb-2">🧑‍💼 Coordinadores de tu colegio</h3>${staff?`<div class="space-y-2">${staff}</div>`:'<p class="text-sm text-slate-500">Todavía no hay coordinadores registrados en tu colegio.</p>'}`):''}</div>`;
}
function vDocs(){
  if(S.sel)return vDet();
  const l=S.docs.map(d=>`<div class="bg-white rounded-2xl p-4 shadow"><div class="flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(d.full_name)} <span class="text-xs text-slate-500">${ST(d.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(d.email||'')} · ${E(d.phone||'')}</div>${d.area?`<div class="text-xs text-slate-500">Área: ${E(d.area)} · Asignaturas: ${E((d.asignaturas||[]).join(', '))}</div>`:''}${(d.grados||[]).length?`<div class="text-xs text-slate-500">Grados: ${d.grados.map(g=>g+'°').join(', ')}</div>`:''}${(d.courses||[]).length?`<div class="text-xs text-slate-500">Cursos: ${[...d.courses].sort((a,b)=>a.grade-b.grade||String(a.name).localeCompare(String(b.name))).map(c=>c.grade+'° '+E(c.name)).join(', ')}</div>`:''}</div><button onclick="DIR.open('${d.id}')" class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Ver todo lo que ha hecho</button></div></div>`).join('');
  return`<div class="space-y-4">${card('<h2 class="text-xl font-bold">👩‍🏫 Docentes de tu colegio</h2><p class="text-sm text-slate-600">Elige un docente para ver, solo para consulta, sus cursos, estudiantes, simulacros, resultados, exámenes impresos y asistencia. No se puede modificar nada desde aquí.</p>')}${l||card('<p class="text-sm text-slate-500">Todavía no hay docentes registrados con el colegio de tu catálogo.</p>')}</div>`;
}
function vDet(){
  const d=S.docs.find(x=>x.id===S.sel),X=S.det;
  if(!d||!X)return card('<p class="text-sm text-slate-500">Cargando…</p>');
  const subs=[['cur','👥 Cursos y estudiantes'],['sim','🚀 Simulacros y tareas'],['res','📊 Resultados'],['imp','🖨️ Exámenes impresos'],['asi','🎥 Clase y asistencia']];
  const view=({cur:dCur,sim:dSim,res:dRes,imp:dImp,asi:dAsi}[S.sub]||dCur)(X);
  return`<div class="space-y-4">${card(`<button onclick="DIR.back()" class="text-sm text-indigo-700 underline">← Volver a docentes</button><h2 class="text-xl font-bold mt-1">${E(d.full_name)}</h2><p class="text-xs text-slate-500">${E(d.area||'')} · ${E((d.asignaturas||[]).join(', '))} · <b>Solo lectura</b></p>`)}
  <nav class="flex gap-2 overflow-x-auto">${subs.map(([k,l])=>`<button onclick="DIR.sub('${k}')" class="px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-sm ${S.sub===k?'on':'bg-white'}">${l}</button>`).join('')}</nav>${view}</div>`;
}
function dCur(X){
  if(!X.cs.length)return card('<p class="text-sm text-slate-500">Este docente todavía no tiene cursos.</p>');
  return X.cs.map(c=>{const st=X.st.filter(s=>s.course_id===c.id),ro=X.ro.filter(r=>r.course_id===c.id).length;
    return card(`<h3 class="font-semibold mb-2">${c.grade}° ${E(c.name)} <span class="text-xs text-slate-500">· ${ro} en la lista · ${st.length} con cuenta</span></h3>${tbl(['Estudiante','Correo'],st.map(s=>[E(s.full_name),E(s.email||'')]))}`)}).join('');
}
function dSim(X){
  const rows=X.si.map(s=>{const a=X.at.filter(x=>x.simulacro_id===s.id);
    return[s.kind==='tarea'?'📘 Tarea':'📝 Simulacro',E(s.title),E(s.subject),s.grade+'°',s.n_questions,s.active?'Activo':'Inactivo',fd(s.due_at),(s.simulacro_targets||[]).length,a.length,a.length?av(a.map(x=>x.score))+'%':'—']});
  return card(`<h3 class="font-semibold mb-2">🚀 Simulacros y tareas</h3>${tbl(['Tipo','Título','Materia','Grado','Preguntas','Estado','Fecha límite','Cursos','Intentos','Promedio'],rows)}`);
}
function dRes(X){
  if(!X.at.length)return card('<h3 class="font-semibold mb-2">📊 Resultados</h3><p class="text-sm text-slate-500">Los estudiantes de este docente todavía no han hecho simulacros.</p>');
  const nm=Object.fromEntries(X.st.map(s=>[s.id,s.full_name]));
  const bySub={},byStu={};
  X.at.forEach(a=>{(bySub[a.subject]=bySub[a.subject]||[]).push(a.score);(byStu[a.user_id]=byStu[a.user_id]||[]).push(a.score)});
  const stuRows=Object.entries(byStu).map(([id,v])=>({n:nm[id]||'—',c:v.length,p:av(v),m:Math.max(...v)})).sort((a,b)=>b.p-a.p);
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">📊 Resultados</h3><p class="text-sm text-slate-600">${X.at.length} intentos · promedio general <b>${av(X.at.map(a=>a.score))}%</b></p>`)}
  ${card(`<h3 class="font-semibold mb-2">Por materia</h3>${tbl(['Materia','Intentos','Promedio',''],Object.entries(bySub).map(([k,v])=>[E(k),v.length,av(v)+'%',bar(av(v))]))}`)}
  ${card(`<h3 class="font-semibold mb-2">Por estudiante</h3>${tbl(['Estudiante','Intentos','Promedio','Mejor',''],stuRows.map(r=>[E(r.n),r.c,r.p+'%',r.m+'%',bar(r.p)]))}`)}
  ${card(`<h3 class="font-semibold mb-2">Últimos intentos</h3>${tbl(['Fecha','Estudiante','Materia','Simulacro','Puntaje'],X.at.slice(0,30).map(a=>[fd(a.created_at),E(nm[a.user_id]||'—'),E(a.subject),E(a.simulacros?.title||'—'),a.score+'%']))}`)}</div>`;
}
function dImp(X){
  const rows=X.jb.map(j=>{const r=X.pr.filter(p=>p.job_id===j.id);
    return[E(j.title),j.courses?j.courses.grade+'° '+E(j.courses.name):'—',E(j.subject),j.n_questions,j.versions,fd(j.exam_date),r.length,r.length?(r.reduce((a,b)=>a+(+b.nota||0),0)/r.length).toFixed(1):'—']});
  return card(`<h3 class="font-semibold mb-2">🖨️ Exámenes impresos y calificaciones</h3>${tbl(['Examen','Curso','Materia','Preguntas','Versiones','Fecha','Calificados','Nota promedio'],rows)}`);
}
function dAsi(X){
  const c=X.cl||{};
  const dates=[...new Set(X.ad.map(a=>a.session_date))].sort().reverse();
  const per=X.st.map(s=>{const p=X.ad.filter(a=>a.user_id===s.id&&a.present).length;return[E(s.full_name),p,dates.length?Math.round(p*100/dates.length)+'%':'—']});
  return`<div class="space-y-4">${card(`<h3 class="font-semibold mb-2">🎥 Clase</h3><p class="text-sm text-slate-600">${c.title?E(c.title):'Sin clase configurada'}${c.is_live?' · <b style="color:#dc2626">● EN VIVO</b>':''}</p><p class="text-xs text-slate-500">Última actualización: ${ft(c.updated_at)}</p>`)}
  ${card(`<h3 class="font-semibold mb-2">Asistencia (${dates.length} clases con registro)</h3>${tbl(['Estudiante','Asistencias','% de asistencia'],per)}`)}
  ${card(`<h3 class="font-semibold mb-2">Por fecha</h3>${tbl(['Fecha','Presentes'],dates.slice(0,15).map(f=>[fd(f),X.ad.filter(a=>a.session_date===f&&a.present).length]))}`)}</div>`;
}
function vHist(){
  const nmOf=id=>S.names[id]?.full_name;
  const rows=S.hist.map(h=>{const d=h.detalle||{};
    return[ft(h.created_at),E(nmOf(h.user_id)||'Administrador'),h.accion==='cambio_estado'?`${ST(d.de)} → ${ST(d.a)}`:E(h.accion),E(nmOf(h.entidad_id)||'—')+' <span class="text-xs text-slate-500">'+E(RL[d.rol]||'')+'</span>']});
  return card(`<h2 class="text-xl font-bold mb-2">🧾 Historial</h2><p class="text-sm text-slate-600 mb-2">Quién aprobó o rechazó cuentas en tu colegio (últimos 100 movimientos).</p>${tbl(['Cuándo','Quién','Cambio','Cuenta'],rows)}`);
}
function vAdm(){
  const l=S.adm.map(p=>`<div class="bg-white rounded-2xl p-4 shadow"><div class="flex flex-wrap items-center justify-between gap-2"><div><div class="font-semibold">${E(p.full_name)} <span class="text-xs text-slate-500">${RL[p.role]||''} · ${ST(p.teacher_status)}</span></div><div class="text-xs text-slate-500">${E(p.email||'')} · ${E(p.phone||'')}</div><div class="text-xs text-slate-500">${sch(p.colegios)}</div></div><div class="flex gap-2">${p.teacher_status!=='aprobado'?btn(`DIR.setSt('${p.id}','aprobado')`,'Aprobar','bg-emerald-600 text-white'):''}${p.teacher_status==='pendiente'?btn(`DIR.setSt('${p.id}','rechazado')`,'Rechazar','bg-slate-200'):''}${p.teacher_status==='aprobado'?btn(`DIR.setSt('${p.id}','rechazado')`,'Retirar permiso','bg-slate-200'):''}</div></div></div>`).join('');
  return`<div class="space-y-4">${card('<h2 class="text-xl font-bold">🏫 Rectores y coordinadores</h2><p class="text-sm text-slate-600">Aquí apruebas a los rectores. Los coordinadores los aprueba el rector de su colegio, pero tú también puedes hacerlo.</p>')}${l||card('<p class="text-sm text-slate-500">Todavía no hay rectores ni coordinadores registrados.</p>')}</div>`;
}

/* ---------- Registro de rector o coordinador (pantalla de entrada) ---------- */
function vReg(headHtml){
  const deps=D.deps||[],muns=D.muns||[],rol=RG.rol==='coordinador'?'coordinador':'rector';
  return`<div class="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow p-6 space-y-3">${headHtml}<p class="text-xs text-slate-500">Regístrate como rector o coordinador de tu colegio. El administrador (o el rector, si eres coordinador) revisará tus datos antes de activar tu cuenta.</p>
  <label class="text-sm block">Soy<select class="w-full border rounded-lg p-2 mt-1" onchange="RG.rol=this.value"><option value="rector" ${rol==='rector'?'selected':''}>Rector</option><option value="coordinador" ${rol==='coordinador'?'selected':''}>Coordinador</option></select></label>
  <input class="w-full border rounded-lg p-2" placeholder="Nombre completo" value="${E(RG.nm)}" oninput="RG.nm=this.value">
  <input class="w-full border rounded-lg p-2" type="tel" placeholder="Teléfono celular" value="${E(RG.tel)}" oninput="RG.tel=this.value">
  <input class="w-full border rounded-lg p-2" type="email" placeholder="Correo electrónico" value="${E(RG.em)}" oninput="RG.em=this.value">
  <input class="w-full border rounded-lg p-2" type="password" placeholder="Contraseña (mín. 8)" value="${E(RG.pw)}" oninput="RG.pw=this.value">
  <label class="text-sm block">Departamento<select class="w-full border rounded-lg p-2 mt-1" onchange="onDep(this.value)"><option value="">Elige tu departamento…</option>${deps.map(d=>`<option value="${d.id}" ${String(d.id)===String(RG.dep)?'selected':''}>${E(d.nombre)}</option>`).join('')}</select></label>
  <label class="text-sm block">Municipio<select class="w-full border rounded-lg p-2 mt-1" ${RG.dep?'':'disabled'} onchange="onMun(this.value)"><option value="">Elige tu municipio…</option>${muns.map(x=>`<option value="${x.id}" ${String(x.id)===String(RG.mun)?'selected':''}>${E(x.nombre)}</option>`).join('')}</select></label>
  <label class="text-sm block">Colegio<input id="colq" class="w-full border rounded-lg p-2 mt-1" placeholder="Escribe para buscar tu colegio…" ${RG.mun?'':'disabled'} value="${E(RG.q)}" oninput="RG.q=this.value;paintCols()"><select id="colsel" class="w-full border rounded-lg p-2 mt-1" ${RG.mun?'':'disabled'} onchange="RG.col=this.value">${colOpts()}</select></label>
  <p class="text-xs text-slate-500">Tu colegio debe estar en la lista. Si no aparece, escribe al administrador de AulaICFES.</p>
  <button onclick="doAuth()" class="w-full py-2 bg-indigo-600 text-white rounded-lg">Enviar mi registro</button></div>`;
}
async function doReg(){
  const nm=(RG.nm||'').trim().replace(/\s+/g,' '),tel=(RG.tel||'').replace(/[^\d+]/g,''),em=(RG.em||'').trim().toLowerCase(),pw=RG.pw||'';
  const rol=RG.rol==='coordinador'?'coordinador':'rector';
  if(nm.split(' ').length<2||nm.length<5)return toast('⚠️','Falta tu nombre','Escribe tu nombre y apellido.');
  if(!/^\+?\d{7,15}$/.test(tel))return toast('⚠️','Teléfono no válido','Escribe tu número de celular, solo números.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return toast('⚠️','Correo no válido','Revisa tu correo electrónico.');
  if(pw.length<8)return toast('⚠️','Contraseña muy corta','Usa mínimo 8 caracteres.');
  if(!RG.dep||!RG.mun||!RG.col)return toast('⚠️','Falta el colegio','Elige tu departamento, tu municipio y tu colegio de la lista.');
  const{data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{account:rol,full_name:nm,phone:tel,colegio_id:String(RG.col)}}});
  if(error)return err(error);
  RG=RG0();D.muns=[];D.cols=[];
  if(!data.session){authMode='login';render();return toast('📧','Revisa tu correo','Confirma tu cuenta y luego inicia sesión. Después tu cuenta debe ser aprobada.')}
  boot();
}

/* ---------- Acciones ---------- */
/* ---------- Hoja membretada del colegio (la sube el rector o el coordinador) ---------- */
const MEMURL=p=>(AULACFG.SUPABASE_URL||'')+'/storage/v1/object/public/school-letterheads/'+encodeURI(p);
const MM={sup:35,inf:25,izq:15,der:15},MMAX={sup:120,inf:120,izq:60,der:60};
S.mem=null;S.memNew=null;S.memN=0;
async function loadMem(){
  if(!M.colegio_id){S.mem=null;return}
  const [m,n]=await Promise.all([
    sb.from('colegio_membrete').select('*').eq('colegio_id',M.colegio_id).maybeSingle(),
    sb.from('profiles').select('id',{count:'exact',head:true}).eq('role','prof').eq('colegio_id',M.colegio_id).eq('teacher_status','aprobado')]);
  if(m.error)throw m.error;
  S.mem=m.data||null;S.memN=n.count||0;
  if(S.memNew){URL.revokeObjectURL(S.memNew.url);S.memNew=null}
  if(S.mem){MM.sup=S.mem.margen_sup_mm;MM.inf=S.mem.margen_inf_mm;MM.izq=S.mem.margen_izq_mm;MM.der=S.mem.margen_der_mm}
}
function memPrev(){
  const src=S.memNew?S.memNew.url:(S.mem?MEMURL(S.mem.imagen_path):'');
  if(!src)return`<div class="border rounded-xl text-center text-sm text-slate-500" style="width:280px;height:396px;margin:auto;display:grid;place-items:center">Aún no hay hoja membretada</div>`;
  const a=`left:${MM.izq/210*100}%;right:${MM.der/210*100}%;top:${MM.sup/297*100}%;bottom:${MM.inf/297*100}%`;
  return`<div style="position:relative;width:280px;height:396px;border:1px solid #cbd5e1;background:#fff;margin:auto"><img src="${E(src)}" alt="" style="position:absolute;left:0;top:0;width:100%;height:100%"><div id="mem-area" style="position:absolute;${a};border:2px dashed #e11d48;background:rgba(225,29,72,.06);display:grid;place-items:center;font-size:11px;color:#be123c">Aquí va el texto</div></div>`;
}
function vMem(){
  if(!M.colegio_id)return card('<h2 class="text-xl font-bold">📄 Hoja membretada</h2><p class="text-sm text-red-600">Tu cuenta no tiene un colegio del catálogo. Escribe al administrador para vincularla.</p>');
  const inp=(k,l)=>`<label class="text-sm">${l}<input id="mm-${k}" type="number" min="0" max="${MMAX[k]}" value="${MM[k]}" class="w-full border rounded-lg p-2 mt-1" oninput="DIR.memMm('${k}',this.value)"></label>`;
  return`<div class="space-y-4">${card(`<h2 class="text-xl font-bold">📄 Hoja membretada del colegio</h2><p class="text-sm text-slate-600">Sube una hoja en blanco con el membrete de tu colegio (imagen PNG o JPG, o un PDF de una página). <b>Llega automáticamente a los ${S.memN} docente(s) aprobado(s) de tu colegio</b> y la plataforma la usa como fondo en los exámenes y claves que ellos generen, así no tienen que subir su propio membrete.</p>`)}<div class="grid sm:grid-cols-2 gap-4">${card(`<h3 class="font-semibold mb-2">1. Elige la hoja</h3><input id="mem-file" type="file" accept="image/png,image/jpeg,application/pdf" onchange="DIR.memPick(this)" class="text-sm">${S.memNew?'<p class="text-xs mt-2" style="color:#047857">Hoja nueva lista. Ajusta los márgenes y pulsa Guardar.</p>':''}<p class="text-xs text-slate-500 mt-2">Tamaño A4. Si es Carta u otro tamaño se ajustará a A4.</p><h3 class="font-semibold mt-4 mb-2">2. Zona para el texto (milímetros)</h3><p class="text-xs text-slate-500 mb-2">El recuadro rojo es donde se escribirá el contenido. Deja libres el encabezado y el pie de tu membrete.</p><div class="grid sm:grid-cols-2 gap-2">${inp('sup','Margen superior')}${inp('inf','Margen inferior')}${inp('izq','Margen izquierdo')}${inp('der','Margen derecho')}</div><div class="flex flex-wrap gap-2 mt-4"><button onclick="DIR.memSave()" class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Guardar y enviar a mis docentes</button>${S.mem?'<button onclick="DIR.memDel()" class="px-4 py-2 rounded-lg bg-slate-200 text-sm">Quitar hoja</button>':''}</div>`)}${card(`<h3 class="font-semibold mb-2 text-center">Vista previa (A4)</h3><div id="mem-prev">${memPrev()}</div>`)}</div>${card('<p class="text-xs text-slate-500">Las hojas de respuestas con marcas para calificar por foto no llevan este fondo, porque taparía las marcas que la cámara necesita leer. Los exámenes y las claves de respuesta sí lo llevan.</p>')}</div>`;
}
async function memFile(f){
  try{
    let blob=f,type=f.type;
    if(f.type==='application/pdf'){
      await loadScript(LIB.pdf);pdfjsLib.GlobalWorkerOptions.workerSrc=LIB.pdfw;
      const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
      const pg=await pdf.getPage(1),v0=pg.getViewport({scale:1}),vp=pg.getViewport({scale:1240/v0.width});
      const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
      await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      blob=await new Promise(r=>cv.toBlob(r,'image/png'));type='image/png';
      if(blob.size>5.5*1048576){blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.9));type='image/jpeg'}
    }else if(!/^image\/(png|jpeg)$/.test(f.type))return toast('⚠️','Formato no válido','Sube una imagen PNG o JPG, o un PDF.');
    if(blob.size>6*1048576)return toast('⚠️','Archivo muy pesado','La hoja debe pesar menos de 6 MB.');
    const url=URL.createObjectURL(blob);
    const dim=await new Promise(r=>{const im=new Image();im.onload=()=>r([im.naturalWidth,im.naturalHeight]);im.onerror=()=>r([0,0]);im.src=url});
    if(!dim[0]){URL.revokeObjectURL(url);return toast('⚠️','No pude leer la imagen','Prueba con otro archivo.')}
    if(S.memNew)URL.revokeObjectURL(S.memNew.url);
    S.memNew={blob,url,type};
    if(Math.abs(dim[1]/dim[0]-297/210)>0.05)toast('ℹ️','La hoja no es A4','Se ajustará a tamaño A4 y puede verse un poco estirada.');
    render();
  }catch(e){err(e)}
}

window.DIR={
  async load(t){
    if(t==='dmem')await loadMem();
    else if(t==='dcol')await loadCol();
    else if(t==='ddoc')await loadDocs();
    else if(t==='dhist')await loadHist();
    else if(t==='dadm')await loadAdm();
  },
  view(t){return({dcol:vCol,ddoc:vDocs,dhist:vHist,dadm:vAdm,dmem:vMem}[t]||(()=>''))()},
  async open(id){S.sel=id;S.sub='cur';S.det=null;render();try{await loadDet(id)}catch(e){S.sel='';err(e)}render()},
  back(){S.sel='';S.det=null;if(window.DIR.onBack)window.DIR.onBack();render()},
  /* Uso del administrador: abrir (solo lectura) a cualquier docente. */
  async openAny(p){S.docs=[p];S.sel=p.id;S.sub='cur';S.det=null;render();try{await loadDet(p.id)}catch(e){S.sel='';if(window.DIR.onBack)window.DIR.onBack();err(e)}render()},
  viewDet(){return vDet()},
  sub(k){S.sub=k;render()},
  async setSt(id,st){
    const{error}=await sb.from('profiles').update({teacher_status:st}).eq('id',id);
    if(error)return err(error);
    toast('✅','Guardado',st==='aprobado'?'Cuenta aprobada.':'Cuenta actualizada.');
    go(tab);
  },
  /* hoja membretada */
  memPick(inp){const f=inp.files&&inp.files[0];if(!f)return;return memFile(f)},
  memMm(k,v){const n=Math.max(0,Math.min(MMAX[k],Math.round(+v||0)));MM[k]=n;const e=document.getElementById('mem-area');if(e){e.style.left=MM.izq/210*100+'%';e.style.right=MM.der/210*100+'%';e.style.top=MM.sup/297*100+'%';e.style.bottom=MM.inf/297*100+'%'}},
  async memSave(){
    try{
      if(!S.mem&&!S.memNew)return toast('⚠️','Falta la hoja','Primero elige la hoja membretada.');
      if(MM.sup+MM.inf>230||MM.izq+MM.der>150)return toast('⚠️','Márgenes demasiado grandes','No quedaría espacio para el texto. Reduce los márgenes.');
      const old=S.mem&&S.mem.imagen_path;let path=old;
      if(S.memNew){
        path=M.colegio_id+'/membrete-'+Date.now()+'.'+(S.memNew.type==='image/png'?'png':'jpg');
        const u=await sb.storage.from('school-letterheads').upload(path,S.memNew.blob,{contentType:S.memNew.type});if(u.error)throw u.error;
      }
      const row={colegio_id:M.colegio_id,imagen_path:path,margen_sup_mm:MM.sup,margen_inf_mm:MM.inf,margen_izq_mm:MM.izq,margen_der_mm:MM.der,updated_at:new Date().toISOString()};
      const r=await sb.from('colegio_membrete').upsert(row,{onConflict:'colegio_id'});
      if(r.error){if(S.memNew)await sb.storage.from('school-letterheads').remove([path]);throw r.error}
      if(S.memNew&&old&&old!==path)await sb.storage.from('school-letterheads').remove([old]);
      toast('✅','Hoja guardada','Ya la tienen tus '+S.memN+' docente(s): la usarán en sus exámenes y claves.');
      await loadMem();render();
    }catch(e){err(e)}
  },
  async memDel(){
    if(!S.mem||!confirm('¿Quitar la hoja membretada? Tus docentes dejarán de verla en sus documentos.'))return;
    try{
      const r=await sb.from('colegio_membrete').delete().eq('colegio_id',M.colegio_id);if(r.error)throw r.error;
      await sb.storage.from('school-letterheads').remove([S.mem.imagen_path]);
      toast('✅','Hoja quitada','Ya no se usa en los documentos de tus docentes.');await loadMem();render();
    }catch(e){err(e)}
  },
  vReg,doReg
};
})();
