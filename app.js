/* CaseGO Cloud v0.6.3 DATES AND CALENDAR
   Supabase is the ONLY application data source.
   No localStorage, SQLite, pywebview, demo records, seed records, or fake counters. */
(function(){
'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const qs=n=>new URLSearchParams(location.search).get(n);
const money=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
const date=d=>d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
const sb=()=>window.casegoSupabase;
function phoneFormat(v){const d=String(v||'').replace(/\D/g,'').slice(0,10);if(d.length<4)return d;if(d.length<7)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;}
function navActive(){const p=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===p));}
function empty(msg){return `<div class="empty"><strong>${esc(msg)}</strong></div>`}
function toast(m){const t=$('toast');if(t){t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',1800)}}
async function rows(table,select='*',builder){let q=sb().from(table).select(select);const firmId=window.CaseGOAuth?.effectiveFirmId?.();const firmTables=new Set(['clients','cases','tasks','calendar_events','notes','payments','documents','communications','contacts','invoices','expenses','case_team_members','case_contacts','client_contact_updates','contact_updates','firm_settings','integration_connections','firm_subscriptions']);if(firmId&&firmTables.has(table))q=q.eq('firm_id',firmId);if(builder)q=builder(q);const {data,error}=await q;if(error)throw error;return data||[]}
function cname(c){return [c?.first_name,c?.last_name].filter(Boolean).join(' ')||c?.organization_name||'Unnamed Client'}
window.qs=qs; window.toast=toast;
window.globalSearchGo=()=>{const q=$('globalSearch')?.value.trim();location.href='clients.html'+(q?'?q='+encodeURIComponent(q):'')};
window.openNotifications=()=>toast('No notifications');
window.platformEnterFirm=(id)=>window.CaseGOAuth.enterFirm(id);
window.changeMonth=()=>{}; window.goToday=()=>{}; window.toggleTask=()=>{}; window.changeListPage=()=>{};

async function dashboard(){
 const admin=!!window.casegoIsFirmAdmin;
 const name=[window.casegoProfile?.first_name,window.casegoProfile?.last_name].filter(Boolean).join(' ')||'CaseGO User';
 const h=document.querySelector('.attorney-welcome h1'); if(h)h.textContent=`Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${name}`;
 document.querySelectorAll('.attorney-kpi span').forEach(el=>{if(admin&&el.textContent.trim()==='MY TASKS')el.textContent='FIRM TASKS';if(admin&&el.textContent.trim()==='MY CASES')el.textContent='ACTIVE CASES'});
 document.querySelectorAll('.panel-head span').forEach(el=>{if(admin&&el.textContent.trim()==='☑ MY TASKS')el.textContent='☑ FIRM TASKS'});
 const [clients,cases,tasks,events,notes,payments,docs,comms]=await Promise.all([
  rows('clients'),rows('cases'),rows('tasks'),rows('calendar_events'),rows('notes'),rows('payments'),rows('documents'),rows('communications')]);
 const set=(id,v)=>{if($(id))$(id).textContent=v};
 set('kpiToday',events.filter(e=>new Date(e.start_at).toDateString()===new Date().toDateString()).length);
 set('kpiTasks',tasks.filter(t=>!['completed','cancelled'].includes(t.status)).length);
 set('kpiCases',cases.filter(c=>c.case_status==='active').length);
 set('todayEventCount',events.length); set('todayTaskCount',tasks.length);
 const sched=$('attorneySchedule'); if(sched)sched.innerHTML=events.slice(0,6).map(e=>`<div class="cg-row"><div><div class="cg-title">${esc(e.title)}</div><div class="cg-sub">${date(e.start_at)} • ${esc(e.event_type||'Event')}</div></div></div>`).join('')||empty('No upcoming dates or appointments.');
 const tb=$('attorneyTasks'); if(tb)tb.innerHTML=tasks.filter(t=>!['completed','cancelled'].includes(t.status)).slice(0,6).map(t=>`<div class="cg-row"><div><div class="cg-title">${esc(t.title)}</div><div class="cg-sub">${date(t.due_at)}</div></div></div>`).join('')||empty('No open tasks.');
 const ac=$('attentionCases'); if(ac)ac.innerHTML=empty('No cases need attention.');
 const ra=$('recentActivity'); if(ra){const activity=[...notes.map(x=>({at:x.created_at,t:'Note added'})),...payments.map(x=>({at:x.created_at,t:'Payment received'})),...docs.map(x=>({at:x.created_at,t:'Document linked'}))].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,5);ra.innerHTML=activity.map(a=>`<div class="cg-row"><div><div class="cg-title">${a.t}</div><div class="cg-sub">${date(a.at)}</div></div></div>`).join('')||empty('No recent activity.');}
 const dm=$('dashboardMessages'); if(dm)dm.innerHTML=comms.filter(c=>c.communication_type==='sms').slice(0,4).map(c=>`<div class="cg-row"><div><div class="cg-title">Client message</div><div class="cg-sub">${esc(c.body||'')}</div></div></div>`).join('')||empty('No client messages yet.');
 document.querySelectorAll('.rail-badge').forEach(b=>{b.hidden=true;b.textContent='0'});
}
async function clients(){return window.CaseGORecords.directories('clients');}
async function cases(){return window.CaseGORecords.directories('cases');}
async function tasks(){const data=await rows('tasks');const body=$('tasksBody');if(body)body.innerHTML=data.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.priority||'normal')}</td><td>${date(t.due_at)}</td><td>${esc(t.status||'open')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No tasks found.</strong></td></tr>'}
async function notes(){const data=await rows('notes');const body=$('notesBody');if(body)body.innerHTML=data.map(n=>`<tr><td>${esc(n.title||n.note_type||'Note')}</td><td>${esc(n.body||'')}</td><td>${date(n.created_at)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No notes found.</strong></td></tr>'}
async function contacts(){const data=await rows('contacts');const body=$('contactsBody');if(body)body.innerHTML=data.map(c=>`<tr><td>${esc([c.first_name,c.last_name].filter(Boolean).join(' ')||c.organization_name||'—')}</td><td>${esc(c.contact_type||'other')}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty"><strong>No contacts found.</strong></td></tr>'}
async function texts(){const data=await rows('communications','*',q=>q.eq('communication_type','sms').order('occurred_at',{ascending:false}));const list=$('textThreadList'),box=$('textMessages');if(list)list.innerHTML=data.length?data.map(x=>`<div class="comm-contact"><strong>${esc(x.direction||'message')}</strong><div class="cg-sub">${esc(x.body||'')}</div></div>`).join(''):empty('No client conversations yet.');if(box)box.innerHTML=empty('No messages yet.');}
async function chat(){const box=$('firmChatMessages');if(box)box.innerHTML=empty('No firm chat messages yet.');}
async function generic(table,bodyId,label){const data=await rows(table);const body=$(bodyId);if(body&&!data.length)body.innerHTML=`<tr><td colspan="10" class="empty"><strong>No ${label} found.</strong></td></tr>`}
/* Add Client is handled by the authenticated core workflow below. */
async function settings(){const f=$('settingsForm');if(!f)return;const firm=window.casegoFirm||{};if(f.elements.firmName)f.elements.firmName.value=firm.name||'';if(f.elements.address)f.elements.address.value=firm.address_line1||'';if(f.elements.cityStateZip)f.elements.cityStateZip.value=[firm.city,firm.state,firm.postal_code].filter(Boolean).join(', ');if(f.elements.phone)f.elements.phone.value=firm.phone||'';}
async function boot(){navActive();const identity=await window.CaseGOAuth.requireAuth();if(!identity)return;window.CaseGOAuth.applyIdentityToPage();if(window.casegoProfile?.theme_preference)window.CaseGOTheme?.setTheme?.(window.casegoProfile.theme_preference);document.querySelectorAll('.rail-badge,.notification-badge').forEach(b=>{const n=Number(String(b.textContent||'').trim())||0;b.hidden=n<=0;if(n<=0)b.textContent=''});try{document.dispatchEvent(new CustomEvent('casego:auth-ready',{detail:identity}));}catch(_e){}const p=document.body.dataset.page;try{if(p==='dashboard')await dashboard();else if(p==='clients')await clients();else if(p==='cases')await cases();else if(p==='calendar')await window.CaseGORecords.calendar();else if(p==='tasks')await tasks();else if(p==='notes')await notes();else if(p==='contacts')await contacts();else if(p==='texts')await texts();else if(p==='chat')await chat();else if(p==='documents')await generic('documents','documentsBody','documents');else if(p==='invoices')await generic('invoices','invoicesBody','invoices');else if(p==='payments')await generic('payments','paymentsBody','payments');else if(p==='expenses')await generic('expenses','expensesBody','expenses');else if(p==='settings')await settings();}catch(e){console.error(e);alert(e?.message||'CaseGO could not load this page from Supabase.');}}
document.addEventListener('DOMContentLoaded',boot);
})();

/* CaseGO v0.5 client/case cloud workflow + theme */
(function(){
'use strict';
const $=id=>document.getElementById(id), sb=()=>window.casegoSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=n=>new URLSearchParams(location.search).get(n);
const nameOf=x=>[x?.first_name,x?.last_name].filter(Boolean).join(' ')||x?.organization_name||x?.email||'CaseGO User';
const firmId=()=>window.CaseGOAuth?.effectiveFirmId?.();
function phoneFormat(v){const d=String(v||'').replace(/\D/g,'').slice(0,10);if(d.length<4)return d;if(d.length<7)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;}
async function persistThemePreference(theme){
  theme=theme==='dark'?'dark':'light';
  try{
    const p=window.casegoProfile;
    if(!p?.id||!sb())return;
    const args={
      new_first_name:p.first_name||'',
      new_last_name:p.last_name||'',
      new_job_title:p.job_title||'',
      new_phone:p.phone||'',
      new_extension:p.extension||'',
      new_profile_image_url:p.profile_image_url||'',
      new_weather_location:p.weather_location||'',
      new_timezone:p.timezone||'',
      new_theme_preference:theme
    };
    const {error}=await sb().rpc('update_my_casego_profile',args);
    if(error)throw error;
    p.theme_preference=theme;
  }catch(err){console.error('CaseGO theme preference save failed',err);}
}
function setTheme(theme){theme=theme==='dark'?'dark':'light';document.body.classList.toggle('casego-dark',theme==='dark');document.documentElement.dataset.casegoTheme=theme;localStorage.setItem('casego_theme',theme);const im=$('casegoModeImage');if(im){im.src=`mode-${theme}.png`;im.alt=`${theme[0].toUpperCase()+theme.slice(1)} Mode`;im.title=`Current mode: ${theme}. Click to switch.`;}const b=$('casegoModeToggle');if(b){b.setAttribute('aria-label',`Current mode: ${theme}. Click to switch.`);b.title=`Current mode: ${theme}. Click to switch.`;}}
function initTheme(){setTheme(localStorage.getItem('casego_theme')||'light');const b=$('casegoModeToggle');if(b)b.onclick=()=>{const theme=document.body.classList.contains('casego-dark')?'light':'dark';setTheme(theme);persistThemePreference(theme);};}
window.CaseGOTheme={setTheme};
document.addEventListener('DOMContentLoaded',initTheme);

async function firmUsers(){const f=firmId();if(!f)return[];const {data,error}=await sb().from('profiles').select('id,first_name,last_name,email,active').eq('firm_id',f).eq('active',true).order('last_name');if(error)throw error;return data||[];}
async function loadTeamPicker(selectedPrimary='', selectedTeam=[]){const primary=$('primaryAttorney'),list=$('caseTeamList');if(!primary&&!list)return;const users=await firmUsers();if(primary){primary.innerHTML='<option value="">Select attorney</option>'+users.map(u=>`<option value="${u.id}">${esc(nameOf(u))}</option>`).join('');primary.value=selectedPrimary||'';}if(list){list.innerHTML=users.map(u=>`<label class="casego-team-option"><input type="checkbox" value="${u.id}" ${selectedTeam.includes(u.id)?'checked':''}><span>${esc(nameOf(u))}</span></label>`).join('')||'<span class="sub">No active firm users yet.</span>';}}
function selectedTeam(){return [...document.querySelectorAll('#caseTeamList input:checked')].map(x=>x.value);}
async function saveTeam(caseId, primary){const ids=[...new Set(selectedTeam().concat(primary?[primary]:[]))];const {error:delErr}=await sb().from('case_team_members').delete().eq('case_id',caseId).eq('firm_id',firmId());if(delErr)throw delErr;if(ids.length){const {error}=await sb().from('case_team_members').insert(ids.map(id=>({firm_id:firmId(),case_id:caseId,user_id:id,is_primary:id===primary})));if(error)throw error;}}
function caseSaveError(error,stage,id,uncertain=false){
 const detail=error?.message||String(error);
 const message=uncertain
  ? 'The save could not be confirmed. Open this client’s cases before trying again. '+detail
  : 'The case was saved, but '+stage+' could not finish. Open the saved case to review it. '+detail;
 const result=new Error(message);
 result.caseId=id;
 result.caseSaveUncertain=uncertain;
 result.cause=error;
 return result;
}
async function createCase(clientId,fd){
 const type=String(fd.get('caseType')||'').trim();
 if(!type)throw new Error('Case Type is required.');
 const current=window.casegoProfile, effectiveFirm=firmId();
 if(!current?.id||!effectiveFirm)throw new Error('Your firm session is not ready. Reload this page and try again.');
 const primary=String(fd.get('primaryAttorney')||'')||null;
 const id=window.crypto.randomUUID();
 const payload={
  id,firm_id:effectiveFirm,client_id:clientId,
  case_number:String(fd.get('caseNumber')||'').trim()||null,
  title:String(fd.get('subCaseType')||'').trim()||type,
  case_type:type,
  case_status:String(fd.get('caseStatus')||'active').toLowerCase()||'active',
  description:String(fd.get('caseNotes')||'').trim()||null,
  assigned_attorney_id:primary||(window.casegoIsFirmAdmin?null:current.id),
  access_scope:String(fd.get('accessScope')||'team'),
  created_by:current.id
 };
 await window.CaseGORecords.timezone();
 const events=window.CaseGORecords.caseDrafts(fd,clientId,id);
 // Do not chain select() onto this insert. The recovered SELECT policy calls
 // STABLE can_access_case(id), which cannot see a new row in INSERT RETURNING.
 // A separate request reads the committed row under the SAME existing RLS.
 let response;
 try{response=await sb().from('cases').insert(payload);}
 catch(error){throw caseSaveError(error,'saving',id,true);}
 if(response.error){
  // Postgres rejection is definitive; a transport/gateway error may arrive
  // after a commit. Do not let an uncertain result create a second case.
  if(/^[0-9A-Z]{5}$/.test(response.error.code||'')&&!String(response.error.code).startsWith('08'))throw response.error;
  throw caseSaveError(response.error,'saving',id,true);
 }
 let stage='loading the saved case';
 try{
  const {data,error}=await sb().from('cases').select('id').eq('id',id).eq('firm_id',effectiveFirm).single();
  if(error)throw error;
  if(!data?.id)throw new Error('The saved case could not be read.');
  stage='saving the case team';
  await saveTeam(id,payload.assigned_attorney_id);
  stage='saving the court or legal dates';

  if(events.length){const {error}=await sb().from('calendar_events').insert(events);if(error)throw error;}
  return data;
 }catch(error){throw caseSaveError(error,stage,id);}
}

async function bootAddCase(){
 if(document.body.dataset.page!=='add-case')return;
 const clientId=q('clientId');
 if(!clientId){alert('Choose a client before creating a case.');location.href='clients.html';return;}
 const f=$('addCaseForm');
 if(!f)return;
 const submit=f.querySelector('button[type="submit"],button:not([type])');
 const originalLabel=submit?.textContent||'Create Case';
 let ready=false,saving=false,saved=false;
 if(submit)submit.disabled=true;
 const profileUrl='client-profile.html?id='+encodeURIComponent(clientId);
 const cancel=$('cancelAddCase');
 if(cancel)cancel.onclick=()=>{if(!saving)location.href=profileUrl;};
 f.onsubmit=async e=>{
  e.preventDefault();
  if(!ready||saving||saved)return;
  saving=true;
  if(submit){submit.disabled=true;submit.textContent='Saving…';}
  if(cancel)cancel.disabled=true;
  try{
   await createCase(clientId,new FormData(f));
   saved=true;
   location.href=profileUrl;
  }catch(err){
   console.error('CaseGO case creation failed',err);
   if(err.caseId){
    saved=true;
    const notice=document.createElement('div');
    notice.setAttribute('role','alert');
    notice.className='case-save-notice';
    const message=document.createElement('p');
    message.textContent=err.message;
    const link=document.createElement('a');
    link.className='btn btn-secondary';
    link.href=err.caseSaveUncertain?profileUrl:'case-detail.html?id='+encodeURIComponent(err.caseId);
    link.textContent=err.caseSaveUncertain?'View client’s cases':'Open saved case';
    notice.append(message,link);
    f.appendChild(notice);
   }
   alert(err.message||'The case could not be saved.');
  }finally{
   saving=false;
   if(submit){submit.disabled=saved;submit.textContent=saved?'Review saved case':originalLabel;}
   if(cancel)cancel.disabled=false;
  }
 };
 const {data:c,error}=await sb().from('clients').select('*').eq('id',clientId).eq('firm_id',firmId()).single();
 if(error)throw error;
 if($('caseClientName'))$('caseClientName').textContent=nameOf(c);
 await loadTeamPicker();
 const intakeZone=await window.CaseGORecords.timezone();
 if($('intakeTimezone'))$('intakeTimezone').textContent='Times: '+intakeZone+'. Leave time blank for a date-only event.';
 ready=true;
 if(submit)submit.disabled=false;
}



async function bootClientProfile(){if(document.body.dataset.page!=='client-profile')return;const id=q('id');const {data:c,error}=await sb().from('clients').select('*').eq('id',id).eq('firm_id',firmId()).single();if(error)throw error;if($('clientName'))$('clientName').textContent=nameOf(c);if($('clientMeta'))$('clientMeta').textContent=[c.status,c.email,c.phone?phoneFormat(c.phone):null].filter(Boolean).join(' • ');const map={firstName:'first_name',lastName:'last_name',phone:'phone',email:'email',address:'address_line1',city:'city',state:'state',zip:'postal_code'};for(const [el,col] of Object.entries(map))if($(el))$(el).value=c[col]||'';await window.CaseGORecords.recordGear(document.querySelector('.page-head .actions'),'client',c,()=>{location.href='clients.html';});const f=$('clientInfoForm');if(f)f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),payload={};for(const [el,col] of Object.entries(map))payload[col]=String(fd.get(el)||'').trim()||null;const {error}=await sb().from('clients').update(payload).eq('id',id).eq('firm_id',firmId());if(error)alert(error.message);else{toast('Client information saved.');$('clientName').textContent=[payload.first_name,payload.last_name].filter(Boolean).join(' ')||'Client';}};await window.CaseGORecords.clientCaseList($('clientCasesBody'),id);
const updates=$('contactUpdates');if(updates)updates.innerHTML='<div class="empty"><strong>No contact updates yet.</strong></div>';}

async function bootCaseDetail(){if(document.body.dataset.page!=='case-detail')return;const id=q('id');const {data:c,error}=await sb().from('cases').select('*, clients(first_name,last_name,organization_name)').eq('id',id).eq('firm_id',firmId()).single();if(error)throw error;if($('caseTitle'))$('caseTitle').textContent=c.title||c.case_type||'Case';if($('caseMeta'))$('caseMeta').textContent=`${nameOf(c.clients)}${c.case_number?' • '+c.case_number:''}`;if($('caseStatusDisplay'))$('caseStatusDisplay').textContent=c.case_status||'';const vals={caseType:c.case_type,subCaseType:c.title,caseNumber:c.case_number,caseStatus:(c.case_status||'active').replace(/^./,m=>m.toUpperCase()),caseNotes:c.description};for(const [k,v] of Object.entries(vals))if($(k))$(k).value=v||'';if($('caseAccessScope'))$('caseAccessScope').value=c.access_scope||'team';const {data:tm,error:te}=await sb().from('case_team_members').select('user_id').eq('case_id',id).eq('firm_id',firmId());if(te)throw te;await loadTeamPicker(c.assigned_attorney_id,(tm||[]).map(x=>x.user_id));const f=$('caseForm');if(f)f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),primary=String(fd.get('primaryAttorney')||'')||null,payload={case_type:String(fd.get('caseType')||'').trim(),title:String(fd.get('subCaseType')||'').trim()||String(fd.get('caseType')||'').trim(),case_number:String(fd.get('caseNumber')||'').trim()||null,case_status:String(fd.get('caseStatus')||'active').toLowerCase(),description:String(fd.get('caseNotes')||'').trim()||null,assigned_attorney_id:primary,access_scope:String(fd.get('accessScope')||'team')};const {error}=await sb().from('cases').update(payload).eq('id',id).eq('firm_id',firmId());if(error){alert(error.message);return;}try{await saveTeam(id,primary);toast('Case saved.');}catch(err){alert(err.message);}};await window.CaseGORecords.caseDates($('caseDatesPanel'),c);await window.CaseGORecords.recordGear(document.querySelector('.page-head .actions'),'case',c,()=>{location.href='client-profile.html?id='+encodeURIComponent(c.client_id);});for(const id2 of ['caseNotesList','caseDocumentsList','caseTasksList','caseExpensesList','casePaymentsList','caseInvoicesList'])if($(id2))$(id2).innerHTML='<div class="empty"><strong>No records yet.</strong></div>';}

function clientPhoneDigits(v){return String(v||'').replace(/\D/g,'').slice(0,10);}
function clientPhoneRow(primary=false){const row=document.createElement('div');row.className='client-phone-row';row.dataset.phoneRow='';row.innerHTML=`<div class="field phone-type-field"><label>Type</label><select class="client-phone-type"><option value="cell" selected>Cell</option><option value="home">Home</option><option value="work">Work</option><option value="other">Other</option></select></div><div class="field phone-number-field"><label>Phone</label><input class="client-phone-number" inputmode="tel" placeholder="(203) 555-0123"/></div><div class="field phone-ext-field"><label>Ext.</label><input class="client-phone-ext" inputmode="numeric" placeholder="123"/></div><label class="client-phone-primary"><input class="client-phone-primary-input" type="radio" name="primaryPhone" ${primary?'checked':''}/><span>Primary</span></label><button class="client-phone-remove" type="button" title="Remove phone">×</button>`;return row;}
function wireClientPhoneRow(row){const num=row.querySelector('.client-phone-number'),ext=row.querySelector('.client-phone-ext'),remove=row.querySelector('.client-phone-remove');if(num)num.addEventListener('input',ev=>ev.target.value=phoneFormat(ev.target.value));if(ext)ext.addEventListener('input',ev=>ev.target.value=String(ev.target.value||'').replace(/\D/g,'').slice(0,8));if(remove)remove.onclick=()=>{const list=$('clientPhoneList');const wasPrimary=row.querySelector('.client-phone-primary-input')?.checked;row.remove();const rows=[...list.querySelectorAll('[data-phone-row]')];if(rows.length===1)rows[0].querySelector('.client-phone-remove').hidden=true;if(wasPrimary&&rows.length)rows[0].querySelector('.client-phone-primary-input').checked=true;};}
function setupClientPhones(){const list=$('clientPhoneList'),add=$('addClientPhoneButton');if(!list||!add)return;[...list.querySelectorAll('[data-phone-row]')].forEach(wireClientPhoneRow);add.onclick=()=>{const row=clientPhoneRow(false);list.appendChild(row);wireClientPhoneRow(row);[...list.querySelectorAll('.client-phone-remove')].forEach(b=>b.hidden=false);};}
function collectClientPhones(){const rows=[...document.querySelectorAll('#clientPhoneList [data-phone-row]')],phones=[];for(const row of rows){const digits=clientPhoneDigits(row.querySelector('.client-phone-number')?.value);if(!digits)continue;if(digits.length!==10)throw new Error('Each phone number must contain 10 digits.');phones.push({phone_type:row.querySelector('.client-phone-type')?.value||'cell',phone_number:digits,extension:String(row.querySelector('.client-phone-ext')?.value||'').trim()||null,is_primary:!!row.querySelector('.client-phone-primary-input')?.checked});}if(phones.length&&!phones.some(x=>x.is_primary))phones[0].is_primary=true;return phones;}
async function replaceAddClient(){
 if(document.body.dataset.page!=='add-client')return;
 setupClientPhones();
 const f=$('clientForm');if(!f)return;
 let requestedAction='exit';
 f.querySelectorAll('button[type=submit][name=saveAction]').forEach(b=>b.addEventListener('click',()=>{requestedAction=b.value==='case'?'case':'exit';}));
 f.onsubmit=async e=>{
  e.preventDefault();
  const buttons=[...f.querySelectorAll('button[type=submit]')];
  const fd=new FormData(f),action=(e.submitter?.value==='case'||requestedAction==='case')?'case':'exit';
  const firm=firmId();
  if(!firm){alert('No firm is selected. If you are CaseGO System Admin, enter a firm before adding a client.');return;}
  const first=String(fd.get('firstName')||'').trim(),last=String(fd.get('lastName')||'').trim();
  if(!first||!last){alert('First Name and Last Name are required.');return;}
  let phones=[];try{phones=collectClientPhones();}catch(err){alert(err.message);return;}
  const primary=phones.find(x=>x.is_primary)||phones[0]||null;
  const status=String(fd.get('clientStatus')||'active').trim().toLowerCase();
  if(!['prospective','active','inactive','closed'].includes(status)){alert('Invalid client status.');return;}
  // IMPORTANT: This payload intentionally contains only columns confirmed by the CaseGO foundation SQL.
  const payload={
   firm_id:firm,
   first_name:first,
   middle_name:String(fd.get('middleName')||'').trim()||null,
   last_name:last,
   email:String(fd.get('email')||'').trim()||null,
   phone:primary?phoneFormat(primary.phone_number):null,
   address_line1:String(fd.get('address')||'').trim()||null,
   address_line2:String(fd.get('address2')||'').trim()||null,
   city:String(fd.get('city')||'').trim()||null,
   state:String(fd.get('state')||'').trim()||null,
   postal_code:String(fd.get('zip')||'').trim()||null,
   country:'US',
   status,
   notes:String(fd.get('notes')||'').trim()||null,
   created_by:window.casegoProfile?.id||null
  };
  try{
   buttons.forEach(b=>b.disabled=true);
   const {data,error}=await sb().from('clients').insert(payload).select('id,firm_id,first_name,middle_name,last_name,email,phone,status,address_line1,address_line2,city,state,postal_code,country,notes,created_at').single();
   if(error)throw error;
   if(!data?.id)throw new Error('Supabase saved the client but did not return a client ID.');
   if(phones.length){
    const phoneRows=phones.map(x=>({...x,firm_id:firm,client_id:data.id}));
    const {error:pe}=await sb().from('client_phones').insert(phoneRows);
    if(pe){console.error('Client saved, additional phone rows failed:',pe);alert('Client saved, but one or more additional phone records could not be saved: '+pe.message);}
   }
   location.href=(action==='case'?'add-case.html?clientId=':'client-profile.html?id=')+encodeURIComponent(data.id)+(action==='case'?'&from=new-client':'');
  }catch(err){console.error('CaseGO Add Client failed',err,payload);alert('Client was not saved. '+(err?.message||String(err)));buttons.forEach(b=>b.disabled=false);}
 };
}

let coreRecordsBooted=false;async function bootCoreRecords(){if(coreRecordsBooted)return;coreRecordsBooted=true;try{await replaceAddClient();await bootAddCase();await bootClientProfile();await bootCaseDetail();}catch(e){console.error('CaseGO core record workflow',e);alert(e?.message||'CaseGO could not load this record from Supabase.');}}
document.addEventListener('casego:auth-ready',bootCoreRecords,{once:true});
window.addEventListener('load',()=>{if(window.casegoProfile&&window.casegoSession)bootCoreRecords();},{once:true});
})();


/* =========================================================
   CaseGO v0.5.3 — Settings / My Profile / User Management
   ========================================================= */
(function(){
'use strict';
const $=id=>document.getElementById(id), sb=()=>window.casegoSupabase;
const e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const firmId=()=>window.CaseGOAuth?.effectiveFirmId?.();
const fullName=p=>[p?.first_name,p?.last_name].filter(Boolean).join(' ').trim()||p?.email||'CaseGO User';
const initials=n=>String(n||'CG').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'CG';
function status(id,msg,isError=false){const el=$(id);if(!el)return;el.textContent=msg||'';el.style.color=isError?'#c23c42':'';}
function phoneFormat(v){const d=String(v||'').replace(/\D/g,'').slice(0,10);if(d.length<4)return d;if(d.length<7)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;}
function setReadonly(form,readonly){form.querySelectorAll('input,select').forEach(x=>{if(x.id!=='firmInfoToggle')x.disabled=readonly;});}

async function loadMyProfile(){
 const p=window.casegoProfile||{};
 $('profileFirstName').value=p.first_name||'';$('profileLastName').value=p.last_name||'';$('profileEmail').value=p.email||window.casegoSession?.user?.email||'';$('profileJobTitle').value=p.job_title||'';$('profilePhone').value=phoneFormat(p.phone||'');$('profileExtension').value=p.extension||'';$('profileWeatherLocation').value=p.weather_location||'';$('profileTimezone').value=p.timezone||'';$('profileTheme').value=p.theme_preference|| (document.body.classList.contains('casego-dark')?'dark':'light');
 const n=fullName(p);$('settingsProfileName').textContent=n;$('settingsAvatar').textContent=initials(n);$('settingsProfileRole').textContent=window.casegoRoles?.map(r=>r.name).join(' • ')||(p.platform_role==='system_admin'?'CaseGO System Administrator':'CaseGO User');
 if(p.profile_image_url){$('settingsAvatar').style.backgroundImage=`url("${String(p.profile_image_url).replace(/"/g,'')}")`;$('settingsAvatar').textContent='';}
 const {data:pref,error}=await sb().from('user_preferences').select('*').eq('user_id',p.id).maybeSingle();if(error)throw error;
 $('prefWeather').checked=pref?.show_weather!==false;$('prefEmail').checked=pref?.email_notifications!==false;$('prefTasks').checked=pref?.task_notifications!==false;$('prefCalendar').checked=pref?.calendar_notifications!==false;$('prefComms').checked=pref?.communication_notifications!==false;
 $('profilePhone').addEventListener('input',ev=>ev.target.value=phoneFormat(ev.target.value));
 $('profilePhotoButton').onclick=()=>toast('Profile image upload will be connected with CaseGO Storage.');
 $('myProfileForm').onsubmit=saveMyProfile;
}
async function saveMyProfile(ev){ev.preventDefault();status('profileSaveStatus','Saving…');try{
 const theme=$('profileTheme').value==='dark'?'dark':'light';
 const args={new_first_name:$('profileFirstName').value,new_last_name:$('profileLastName').value,new_job_title:$('profileJobTitle').value,new_phone:$('profilePhone').value.replace(/\D/g,''),new_extension:$('profileExtension').value,new_profile_image_url:window.casegoProfile?.profile_image_url||'',new_weather_location:$('profileWeatherLocation').value,new_timezone:$('profileTimezone').value,new_theme_preference:theme};
 const {error}=await sb().rpc('update_my_casego_profile',args);if(error)throw error;
 const {error:pe}=await sb().from('user_preferences').update({show_weather:$('prefWeather').checked,email_notifications:$('prefEmail').checked,task_notifications:$('prefTasks').checked,calendar_notifications:$('prefCalendar').checked,communication_notifications:$('prefComms').checked}).eq('user_id',window.casegoProfile.id);if(pe)throw pe;
 Object.assign(window.casegoProfile,{first_name:args.new_first_name.trim()||null,last_name:args.new_last_name.trim()||null,job_title:args.new_job_title.trim()||null,phone:args.new_phone||null,extension:args.new_extension.trim()||null,weather_location:args.new_weather_location.trim()||null,timezone:args.new_timezone||null,theme_preference:theme});
 window.CaseGOTheme?.setTheme?.(theme);window.CaseGOAuth?.applyIdentityToPage?.();const n=fullName(window.casegoProfile);$('settingsProfileName').textContent=n;$('settingsAvatar').textContent=initials(n);status('profileSaveStatus','Profile saved.');toast('My Profile saved.');
 }catch(err){console.error(err);status('profileSaveStatus',err.message||'Unable to save profile.',true);}}

function fillFirm(){const f=window.casegoFirm||{};$('firmName').value=f.name||'';$('firmEmail').value=f.email||'';$('firmPhone').value=phoneFormat(f.phone||'');$('firmWebsite').value=f.website||'';$('firmAddress1').value=f.address_line1||'';$('firmAddress2').value=f.address_line2||'';$('firmCity').value=f.city||'';$('firmState').value=f.state||'';$('firmPostal').value=f.postal_code||'';$('firmCountry').value=f.country||'US';$('firmInfoSummary').textContent=[f.name,[f.city,f.state].filter(Boolean).join(', ')].filter(Boolean).join(' • ')||'Firm details';}
function editFirm(on){const form=$('firmInformationForm');const can=!!window.casegoIsFirmAdmin;setReadonly(form,!on||!can);$('editFirmButton').hidden=on||!can;$('saveFirmButton').hidden=!on||!can;$('cancelFirmButton').hidden=!on||!can;if(!on)fillFirm();}
async function saveFirm(ev){ev.preventDefault();if(!window.casegoIsFirmAdmin)return;status('firmSaveStatus','Saving…');try{const payload={name:$('firmName').value.trim(),email:$('firmEmail').value.trim()||null,phone:$('firmPhone').value.replace(/\D/g,'')||null,website:$('firmWebsite').value.trim()||null,address_line1:$('firmAddress1').value.trim()||null,address_line2:$('firmAddress2').value.trim()||null,city:$('firmCity').value.trim()||null,state:$('firmState').value.trim()||null,postal_code:$('firmPostal').value.trim()||null,country:$('firmCountry').value.trim()||'US'};const {data,error}=await sb().from('firms').update(payload).eq('id',firmId()).select('id,name,status,phone,email,website,address_line1,address_line2,city,state,postal_code,country').single();if(error)throw error;window.casegoFirm=data;fillFirm();editFirm(false);window.CaseGOAuth?.applyIdentityToPage?.();status('firmSaveStatus','Firm information saved.');toast('Firm information saved.');}catch(err){console.error(err);status('firmSaveStatus',err.message||'Unable to save firm information.',true);}}
async function loadFirmSection(){fillFirm();const can=!!window.casegoIsFirmAdmin;$('firmInfoPermissionNote').textContent=can?'Owner/Admin access: click Edit Firm Information to make changes.':'Firm information is read-only for your account.';editFirm(false);$('firmPhone').addEventListener('input',ev=>ev.target.value=phoneFormat(ev.target.value));$('firmInfoToggle').onclick=()=>{const body=$('firmInfoBody'),open=body.hidden;body.hidden=!open;$('firmInfoToggle').classList.toggle('open',open);};$('editFirmButton').onclick=()=>editFirm(true);$('cancelFirmButton').onclick=()=>{status('firmSaveStatus','');editFirm(false);};$('firmInformationForm').onsubmit=saveFirm;}

async function roleCatalog(){const f=firmId();const {data,error}=await sb().from('roles').select('id,name,is_admin,is_system_template,firm_id').or(`firm_id.is.null,firm_id.eq.${f}`).order('is_admin',{ascending:false}).order('name');if(error)throw error;return data||[];}
async function permissionCounts(roleIds){if(!roleIds.length)return{};const {data,error}=await sb().from('role_permissions').select('role_id').in('role_id',roleIds);if(error)throw error;return (data||[]).reduce((a,x)=>(a[x.role_id]=(a[x.role_id]||0)+1,a),{});}
async function loadRolesPanel(roles){const counts=await permissionCounts(roles.map(r=>r.id));$('settingsRolesGrid').innerHTML=roles.map(r=>`<div class="settings-role-card"><h4>${e(r.name)}</h4><p>${r.is_system_template?'Built-in CaseGO role template.':'Firm-specific role.'}</p><div class="role-meta">${counts[r.id]||0} permission${(counts[r.id]||0)===1?'':'s'}${r.is_admin?' • ADMINISTRATOR':''}</div></div>`).join('')||'<div class="empty"><strong>No roles configured.</strong></div>';}
async function loadUsers(roles){const f=firmId();const [{data:users,error:ue},{data:maps,error:me}]=await Promise.all([sb().from('profiles').select('id,first_name,last_name,email,active,job_title').eq('firm_id',f).order('last_name',{ascending:true}),sb().from('user_roles').select('user_id,role_id').in('role_id',roles.map(r=>r.id))]);if(ue)throw ue;if(me)throw me;const map={};(maps||[]).forEach(x=>{(map[x.user_id]??=[]).push(x.role_id)});const meId=window.casegoProfile?.id;$('settingsUsersBody').innerHTML=(users||[]).map(u=>{const mine=u.id===meId;const current=(map[u.id]||[])[0]||'';const opts=roles.map(r=>`<option value="${r.id}" ${r.id===current?'selected':''}>${e(r.name)}</option>`).join('');return `<tr data-user-id="${u.id}"><td><div class="settings-user-name"><div class="settings-user-avatar">${e(initials(fullName(u)))}</div><div class="settings-user-copy"><strong>${e(fullName(u))}${mine?' (YOU)':''}</strong><small>${e(u.email||'')}${u.job_title?' • '+e(u.job_title):''}</small></div></div></td><td><select class="settings-user-role" data-user="${u.id}" ${mine?'disabled':''}><option value="">No role</option>${opts}</select><span class="role-saving" id="roleStatus-${u.id}"></span></td><td><span class="settings-status-pill ${u.active?'':'inactive'}">${u.active?'ACTIVE':'INACTIVE'}</span></td><td>${mine?'<span class="settings-self-protected">🔒 CURRENT ADMIN — PROTECTED</span>':`<div class="settings-account-actions"><button class="btn btn-secondary settings-toggle-user" data-user="${u.id}" data-active="${u.active?'1':'0'}">${u.active?'DEACTIVATE':'REACTIVATE'}</button></div>`}</td></tr>`;}).join('')||'<tr><td colspan="4"><div class="empty"><strong>No firm users found.</strong></div></td></tr>';
 document.querySelectorAll('.settings-user-role').forEach(sel=>sel.onchange=()=>changeUserRole(sel,roles));document.querySelectorAll('.settings-toggle-user').forEach(btn=>btn.onclick=()=>toggleUser(btn));}
async function changeUserRole(sel,roles){const uid=sel.dataset.user;if(uid===window.casegoProfile?.id)return;const statusEl=$(`roleStatus-${uid}`);statusEl.textContent='Saving…';try{const target=sel.value;const firmRoleIds=roles.map(r=>r.id);if(firmRoleIds.length){const {error:d}=await sb().from('user_roles').delete().eq('user_id',uid).in('role_id',firmRoleIds);if(d)throw d;}if(target){const {error:i}=await sb().from('user_roles').insert({user_id:uid,role_id:target});if(i)throw i;}statusEl.textContent='Saved';setTimeout(()=>statusEl.textContent='',1200);}catch(err){console.error(err);statusEl.textContent='Error';toast(err.message||'Unable to change role.');}}
async function toggleUser(btn){const uid=btn.dataset.user;if(uid===window.casegoProfile?.id)return;const active=btn.dataset.active==='1';if(!confirm(`${active?'Deactivate':'Reactivate'} this user account?`))return;try{const {error}=await sb().from('profiles').update({active:!active}).eq('id',uid).eq('firm_id',firmId());if(error)throw error;const roles=await roleCatalog();await loadUsers(roles);toast(active?'User deactivated.':'User reactivated.');}catch(err){console.error(err);toast(err.message||'Unable to update user.');}}
function setupCreateUser(roles){const modal=$('addUserModal');$('createUserRole').innerHTML='<option value="">Choose role</option>'+roles.map(r=>`<option value="${r.id}">${e(r.name)}</option>`).join('');$('addUserButton').onclick=()=>modal.hidden=false;const close=()=>modal.hidden=true;$('closeAddUserModal').onclick=close;$('cancelCreateUserButton').onclick=close;modal.addEventListener('click',ev=>{if(ev.target===modal)close();});}
async function loadAdminSettings(){if(!window.casegoIsFirmAdmin)return;document.querySelectorAll('.admin-only-settings').forEach(x=>x.hidden=false);const roles=await roleCatalog();await Promise.all([loadRolesPanel(roles),loadUsers(roles)]);setupCreateUser(roles);}
async function bootSettingsV053(){if(document.body.dataset.page!=='settings')return;try{await new Promise(r=>setTimeout(r,100));if(!window.casegoProfile)return;await loadMyProfile();await loadFirmSection();await loadAdminSettings();}catch(err){console.error('CaseGO settings v0.5.3',err);toast(err.message||'Unable to load Settings.');}}
window.addEventListener('load',()=>setTimeout(bootSettingsV053,120));
})();
