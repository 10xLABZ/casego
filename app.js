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
function cname(c){return c?.organization_name||[c?.first_name,c?.last_name].filter(Boolean).join(' ')||c?.organization_name||'Unnamed Client'}
window.qs=qs; window.toast=toast;
window.globalSearchGo=()=>{const q=$('globalSearch')?.value.trim();location.href='clients.html'+(q?'?q='+encodeURIComponent(q):'')};
window.openNotifications=()=>toast('No notifications');
window.platformEnterFirm=(id)=>window.CaseGOAuth.enterFirm(id);
window.changeMonth=()=>{}; window.goToday=()=>{}; window.toggleTask=()=>{}; window.changeListPage=()=>{};

async function dashboard(){return window.CaseGOWorkspace.dashboard();}
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
async function boot(){navActive();const identity=await window.CaseGOAuth.requireAuth();if(!identity)return;window.CaseGOAuth.applyIdentityToPage();window.CaseGOWorkspace.init();if(window.casegoProfile?.theme_preference)window.CaseGOTheme?.setTheme?.(window.casegoProfile.theme_preference);document.querySelectorAll('.rail-badge,.notification-badge').forEach(b=>{const n=Number(String(b.textContent||'').trim())||0;b.hidden=n<=0;if(n<=0)b.textContent=''});try{document.dispatchEvent(new CustomEvent('casego:auth-ready',{detail:identity}));}catch(_e){}const p=document.body.dataset.page;try{if(p==='dashboard')await dashboard();else if(p==='clients')await clients();else if(p==='cases')await cases();else if(p==='calendar')await window.CaseGORecords.calendar();else if(p==='tasks')await tasks();else if(p==='notes')await notes();else if(p==='contacts')await contacts();else if(p==='texts')await texts();else if(p==='chat')await chat();else if(p==='documents')await generic('documents','documentsBody','documents');else if(p==='invoices')await window.CaseGOWorkspace.billingPage('invoices','invoicesBody');else if(p==='payments')await window.CaseGOWorkspace.billingPage('payments','paymentsBody');else if(p==='expenses')await generic('expenses','expensesBody','expenses');else if(p==='settings')await settings();}catch(e){console.error(e);alert(e?.message||'CaseGO could not load this page from Supabase.');}}
document.addEventListener('DOMContentLoaded',boot);
})();

/* CaseGO v0.5 client/case cloud workflow + theme */
(function(){
'use strict';
const $=id=>document.getElementById(id), sb=()=>window.casegoSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const q=n=>new URLSearchParams(location.search).get(n);
const nameOf=x=>x?.organization_name||[x?.first_name,x?.last_name].filter(Boolean).join(' ')||x?.organization_name||x?.email||'CaseGO User';
const firmId=()=>window.CaseGOAuth?.effectiveFirmId?.();
function phoneFormat(v){const d=String(v||'').replace(/\D/g,'').slice(0,10);if(d.length<4)return d;if(d.length<7)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;}
let themeSaveQueue=Promise.resolve();
function persistThemePreference(theme){
 themeSaveQueue=themeSaveQueue.then(async()=>{
  const p=window.casegoProfile;if(!p?.id||!sb())return;
  const {error}=await sb().rpc('save_casego_theme',{preference:theme});
  if(error){toast('Theme changed on this device; account preference could not save.');return;}
  p.theme_preference=theme;
 }).catch(()=>toast('Account theme could not save.'));
 return themeSaveQueue;
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
  billing_type:String(fd.get('billingType')||'flat_fee'),
  flat_fee_amount:String(fd.get('flatFeeAmount')||'').trim()===''?null:Number(fd.get('flatFeeAmount')),
  hourly_rate:String(fd.get('caseHourlyRate')||'').trim()===''?null:Number(fd.get('caseHourlyRate')),
  hybrid_included_hours:String(fd.get('hybridIncludedHours')||'').trim()===''?null:Number(fd.get('hybridIncludedHours')),
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
  stage='saving the court dates or appointments';

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



async function bootClientProfile(){if(document.body.dataset.page==='client-profile')return window.CaseGOWorkspace.clientPage();}
async function bootCaseDetail(){if(document.body.dataset.page==='case-detail')return window.CaseGOWorkspace.casePage();}

async function replaceAddClient(){if(document.body.dataset.page==='add-client')return window.CaseGOWorkspace.intakePage();}
window.CaseGOCore={saveTeam,loadTeamPicker};

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
 if(!$('profileExperience'))$('profileJobTitle').closest('.field').insertAdjacentHTML('afterend','<div class="field"><label>Experience</label><input id="profileExperience" name="experience" placeholder="Years in practice, specialties, credentials..."></div>');
 const p=window.casegoProfile||{};
 $('profileFirstName').value=p.first_name||'';$('profileLastName').value=p.last_name||'';$('profileEmail').value=p.email||window.casegoSession?.user?.email||'';$('profileJobTitle').value=p.job_title||'';$('profileExperience').value=p.experience||'';$('profilePhone').value=phoneFormat(p.phone||'');$('profileExtension').value=p.extension||'';$('profileWeatherLocation').value=p.weather_location||'';$('profileTimezone').value=p.timezone||'';$('profileTheme').value=p.theme_preference|| (document.body.classList.contains('casego-dark')?'dark':'light');
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
 const {error:experienceError}=await sb().rpc('save_my_casego_experience',{new_experience:$('profileExperience').value});if(experienceError)throw experienceError;
 const {error:pe}=await sb().from('user_preferences').update({show_weather:$('prefWeather').checked,email_notifications:$('prefEmail').checked,task_notifications:$('prefTasks').checked,calendar_notifications:$('prefCalendar').checked,communication_notifications:$('prefComms').checked}).eq('user_id',window.casegoProfile.id);if(pe)throw pe;
 Object.assign(window.casegoProfile,{first_name:args.new_first_name.trim()||null,last_name:args.new_last_name.trim()||null,job_title:args.new_job_title.trim()||null,experience:$('profileExperience').value.trim()||null,phone:args.new_phone||null,extension:args.new_extension.trim()||null,weather_location:args.new_weather_location.trim()||null,timezone:args.new_timezone||null,theme_preference:theme});
 window.CaseGOTheme?.setTheme?.(theme);window.CaseGOAuth?.applyIdentityToPage?.();const n=fullName(window.casegoProfile);$('settingsProfileName').textContent=n;$('settingsAvatar').textContent=initials(n);status('profileSaveStatus','Profile saved.');toast('My Profile saved.');
 }catch(err){console.error(err);status('profileSaveStatus',err.message||'Unable to save profile.',true);}}

function fillFirm(){const f=window.casegoFirm||{};$('firmName').value=f.name||'';$('firmEmail').value=f.email||'';$('firmPhone').value=phoneFormat(f.phone||'');$('firmWebsite').value=f.website||'';$('firmAddress1').value=f.address_line1||'';$('firmAddress2').value=f.address_line2||'';$('firmCity').value=f.city||'';$('firmState').value=f.state||'';$('firmPostal').value=f.postal_code||'';$('firmCountry').value=f.country||'US';$('firmInfoSummary').textContent=[f.name,[f.city,f.state].filter(Boolean).join(', ')].filter(Boolean).join(' • ')||'Firm details';}
function editFirm(on){const form=$('firmInformationForm');const can=!!window.casegoIsFirmAdmin;setReadonly(form,!on||!can);$('editFirmButton').hidden=on||!can;$('saveFirmButton').hidden=!on||!can;$('cancelFirmButton').hidden=!on||!can;if(!on)fillFirm();}
async function saveFirm(ev){ev.preventDefault();if(!window.casegoIsFirmAdmin)return;status('firmSaveStatus','Saving…');try{const payload={id:firmId(),name:$('firmName').value.trim(),email:$('firmEmail').value.trim()||null,phone:$('firmPhone').value.replace(/\D/g,'')||null,website:$('firmWebsite').value.trim()||null,address_line1:$('firmAddress1').value.trim()||null,address_line2:$('firmAddress2').value.trim()||null,city:$('firmCity').value.trim()||null,state:$('firmState').value.trim()||null,postal_code:$('firmPostal').value.trim()||null,country:$('firmCountry').value.trim()||'US'};const {error}=await sb().rpc('save_casego_firm_information',{firm_data:payload});if(error)throw error;Object.assign(window.casegoFirm,payload);fillFirm();editFirm(false);window.CaseGOAuth?.applyIdentityToPage?.();status('firmSaveStatus','Firm information saved.');toast('Firm information saved.');}catch(err){console.error(err);status('firmSaveStatus',err.message||'Unable to save firm information.',true);}}
async function loadFirmSection(){fillFirm();const can=!!window.casegoIsFirmAdmin;$('firmInfoPermissionNote').textContent=can?'Owner/Admin access: click Edit Firm Information to make changes.':'Firm information is read-only for your account.';editFirm(false);$('firmPhone').addEventListener('input',ev=>ev.target.value=phoneFormat(ev.target.value));$('firmInfoToggle').onclick=()=>{const body=$('firmInfoBody'),open=body.hidden;body.hidden=!open;$('firmInfoToggle').classList.toggle('open',open);};$('editFirmButton').onclick=()=>editFirm(true);$('cancelFirmButton').onclick=()=>{status('firmSaveStatus','');editFirm(false);};$('firmInformationForm').onsubmit=saveFirm;}

async function roleCatalog(){const f=firmId();const {data,error}=await sb().from('roles').select('id,name,is_admin,is_system_template,firm_id').or(`firm_id.is.null,firm_id.eq.${f}`).order('is_admin',{ascending:false}).order('name');if(error)throw error;return data||[];}
async function permissionCounts(roleIds){if(!roleIds.length)return{};const {data,error}=await sb().from('role_permissions').select('role_id').in('role_id',roleIds);if(error)throw error;return (data||[]).reduce((a,x)=>(a[x.role_id]=(a[x.role_id]||0)+1,a),{});}
async function loadRolesPanel(roles){const counts=await permissionCounts(roles.map(r=>r.id));$('settingsRolesGrid').innerHTML=roles.map(r=>`<div class="settings-role-card"><h4>${e(r.name)}</h4><p>${r.is_system_template?'Built-in CaseGO role template.':'Firm-specific role.'}</p><div class="role-meta">${counts[r.id]||0} permission${(counts[r.id]||0)===1?'':'s'}${r.is_admin?' • ADMINISTRATOR':''}</div></div>`).join('')||'<div class="empty"><strong>No roles configured.</strong></div>';}
async function loadUsers(roles){const f=firmId();const [{data:users,error:ue},{data:maps,error:me}]=await Promise.all([sb().from('profiles').select('id,first_name,last_name,email,active,job_title').eq('firm_id',f).order('last_name',{ascending:true}),sb().from('user_roles').select('user_id,role_id').in('role_id',roles.map(r=>r.id))]);if(ue)throw ue;if(me)throw me;const map={};(maps||[]).forEach(x=>{(map[x.user_id]??=[]).push(x.role_id)});const meId=window.casegoProfile?.id;$('settingsUsersBody').innerHTML=(users||[]).map(u=>{const mine=u.id===meId;const current=(map[u.id]||[])[0]||'';const opts=roles.map(r=>`<option value="${r.id}" ${r.id===current?'selected':''}>${e(r.name)}</option>`).join('');return `<tr data-user-id="${u.id}"><td><div class="settings-user-name"><div class="settings-user-avatar">${e(initials(fullName(u)))}</div><div class="settings-user-copy"><strong>${e(fullName(u))}${mine?' (YOU)':''}</strong><small>${e(u.email||'')}${u.job_title?' • '+e(u.job_title):''}</small></div></div></td><td><select class="settings-user-role" data-user="${u.id}" ${mine?'disabled':''}><option value="">No role</option>${opts}</select><span class="role-saving" id="roleStatus-${u.id}"></span></td><td><span class="settings-status-pill ${u.active?'':'inactive'}">${u.active?'ACTIVE':'INACTIVE'}</span></td><td>${mine?'<span class="settings-self-protected">🔒 CURRENT ADMIN — PROTECTED</span>':`<div class="settings-account-actions"><button class="btn btn-secondary settings-toggle-user" data-user="${u.id}" data-active="${u.active?'1':'0'}">${u.active?'DEACTIVATE':'REACTIVATE'}</button></div>`}</td></tr>`;}).join('')||'<tr><td colspan="4"><div class="empty"><strong>No firm users found.</strong></div></td></tr>';
 document.querySelectorAll('.settings-user-role').forEach(sel=>sel.onchange=()=>changeUserRole(sel,roles));document.querySelectorAll('.settings-toggle-user').forEach(btn=>btn.onclick=()=>toggleUser(btn));}
async function changeUserRole(sel,roles){const uid=sel.dataset.user;if(uid===window.casegoProfile?.id)return;const statusEl=$(`roleStatus-${uid}`);statusEl.textContent='Saving…';try{const target=sel.value;const firmRoleIds=roles.map(r=>r.id);if(firmRoleIds.length){const {error:d}=await sb().from('user_roles').delete().eq('user_id',uid).in('role_id',firmRoleIds);if(d)throw d;}if(target){const {error:i}=await sb().from('user_roles').insert({user_id:uid,role_id:target});if(i)throw i;}statusEl.textContent='Saved';setTimeout(()=>statusEl.textContent='',1200);}catch(err){console.error(err);statusEl.textContent='Error';toast(err.message||'Unable to change role.');}}
async function toggleUser(btn){const uid=btn.dataset.user;if(uid===window.casegoProfile?.id)return;const active=btn.dataset.active==='1';if(!confirm(`${active?'Deactivate':'Reactivate'} this user account?`))return;try{const {error}=await sb().from('profiles').update({active:!active}).eq('id',uid).eq('firm_id',firmId());if(error)throw error;const roles=await roleCatalog();await loadUsers(roles);toast(active?'User deactivated.':'User reactivated.');}catch(err){console.error(err);toast(err.message||'Unable to update user.');}}
function setupCreateUser(roles){const modal=$('addUserModal'),button=$('createUserButton'),message=$('createUserStatus');$('createUserRole').innerHTML='<option value="">Choose role</option>'+roles.map(r=>`<option value="${r.id}">${e(r.name)}</option>`).join('');$('addUserButton').onclick=()=>{message.textContent='';modal.hidden=false;};const close=()=>{if(!button.disabled)modal.hidden=true;};$('closeAddUserModal').onclick=close;$('cancelCreateUserButton').onclick=close;modal.addEventListener('click',ev=>{if(ev.target===modal)close();});button.onclick=async()=>{const payload={firm_id:firmId(),first_name:$('createUserFirstName').value.trim(),last_name:$('createUserLastName').value.trim(),email:$('createUserEmail').value.trim(),password:$('createUserPassword').value,role_id:$('createUserRole').value};if(!payload.email||payload.password.length<8||!payload.role_id){message.textContent='Enter an email, temporary password of at least 8 characters, and role.';return;}button.disabled=true;message.textContent='Creating user…';try{const {data,error}=await sb().functions.invoke('casego-create-user',{body:payload});if(error)throw new Error(data?.error||error.message);if(data?.error)throw new Error(data.error);message.textContent='User created.';for(const id of ['createUserFirstName','createUserLastName','createUserEmail','createUserPassword'])$(id).value='';$('createUserRole').value='';await loadUsers(roles);setTimeout(()=>{button.disabled=false;modal.hidden=true;},500);}catch(err){message.textContent=err.message||'Unable to create user.';button.disabled=false;}};}
async function loadBillingDefaults(){const {data,error}=await sb().from('firm_settings').select('default_hourly_rate,billing_increment_minutes').eq('firm_id',firmId()).maybeSingle();if(error)throw error;$('defaultHourlyRate').value=data?.default_hourly_rate??'';$('billingIncrement').value=String(data?.billing_increment_minutes||6);$('billingDefaultsForm').onsubmit=async ev=>{ev.preventDefault();const status=$('billingDefaultsStatus');status.textContent='Saving…';const payload={firm_id:firmId(),default_hourly_rate:$('defaultHourlyRate').value===''?null:Number($('defaultHourlyRate').value),billing_increment_minutes:Number($('billingIncrement').value)};const {error}=await sb().from('firm_settings').upsert(payload,{onConflict:'firm_id'});status.textContent=error?error.message:'Billing defaults saved.';};}
async function loadAdminSettings(){const f=firmId();if(!f)return;const {data:verified}=await sb().rpc('is_casego_admin_for_firm',{requested_firm:f});window.casegoIsFirmAdmin=window.casegoIsFirmAdmin||verified===true;if(!window.casegoIsFirmAdmin)return;document.querySelectorAll('.admin-only-settings').forEach(x=>x.hidden=false);const roles=await roleCatalog();setupCreateUser(roles);for(const job of [()=>loadRolesPanel(roles),()=>loadUsers(roles),()=>loadBillingDefaults()]){try{await job();}catch(err){console.error('Settings panel could not load',err);}}}
function setupSettingsCollapsibles(){
 document.querySelectorAll('.settings-panel').forEach((panel,index)=>{
  if(panel.id==='firmInformationPanel')return;
  const head=panel.querySelector(':scope > .panel-head'),body=panel.querySelector(':scope > .panel-body');if(!head||!body||head.dataset.collapseReady)return;
  head.dataset.collapseReady='1';head.classList.add('settings-collapsible-head');head.tabIndex=0;head.setAttribute('role','button');head.setAttribute('aria-expanded','true');
  const arrow=document.createElement('span');arrow.className='settings-chevron';arrow.textContent='⌃';head.appendChild(arrow);
  const toggle=()=>{const open=!body.hidden;body.hidden=open;head.setAttribute('aria-expanded',String(!open));arrow.textContent=open?'⌄':'⌃';};
  head.addEventListener('click',ev=>{if(!ev.target.closest('button,a,input,select'))toggle();});head.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle();}});
 });
}
async function bootSettingsV053(){if(document.body.dataset.page!=='settings')return;try{await new Promise(r=>setTimeout(r,100));if(!window.casegoProfile)return;setupSettingsCollapsibles();await loadMyProfile();await loadFirmSection();await loadAdminSettings();}catch(err){console.error('CaseGO settings v0.6.6',err);toast(err.message||'Unable to load Settings.');}}
window.addEventListener('load',()=>setTimeout(bootSettingsV053,120));
})();
