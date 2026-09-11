/* CaseGO v0.6.4 — intake, court history and shared record actions. */
(function(){
'use strict';
const R=window.CaseGORecords,$=id=>document.getElementById(id),sb=()=>window.casegoSupabase;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firm=()=>window.CaseGOAuth.effectiveFirmId();
const name=c=>c?.client_type==='organization'||c?.organization_name?c.organization_name||'Organization':[c?.first_name,c?.last_name].filter(Boolean).join(' ')||'Client';
const val=(fd,k)=>String(fd.get(k)||'').trim();
const money=x=>Number(x||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
const field=(label,key,value='',type='text',required=false)=>'<label class="field">'+esc(label)+(required?' *':'')+'<input name="'+key+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>';
const area=(label,key,value='')=>'<label class="field">'+esc(label)+'<textarea name="'+key+'">'+esc(value)+'</textarea></label>';
const select=(label,key,options,value='')=>'<label class="field">'+esc(label)+'<select name="'+key+'">'+options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></label>';
function errorText(e){
 if(e?.code==='PGRST202'||e?.code==='PGRST204'||e?.code==='42703')return 'This version needs its database update first. Run CASEGO_v0.6.4_RUN_FIRST.sql in the CaseGO Supabase project, then reload.';
 return e?.message||String(e);
}
function modal(title,className=''){
 const el=document.createElement('dialog');el.className='record-dialog '+className;
 el.innerHTML='<div class="dialog-heading"><h2>'+esc(title)+'</h2><button type="button" class="dialog-x" aria-label="Close">×</button></div><div class="dialog-content"></div>';
 const previous=document.activeElement;document.body.appendChild(el);
 const result={el,body:el.querySelector('.dialog-content'),busy:false,dirty:false};
 result.close=(force=false)=>{
  if(result.busy)return;
  if(!force&&result.dirty&&!window.confirm('Discard the unsaved changes?'))return;
  el.close();el.remove();previous?.focus?.();
 };
 el.querySelector('.dialog-x').onclick=()=>result.close();
 el.addEventListener('cancel',e=>{e.preventDefault();result.close();});
 el.showModal();return result;
}
function feedback(container,text){const p=container.querySelector('[data-status]');if(p)p.textContent=text;}
function phoneRow(phone={}){
 const row=document.createElement('div');row.className='client-phone-row';row.dataset.phoneRow='';
 row.innerHTML=select('Type','phone_type',['cell','home','work','other'],phone.phone_type||'cell')+
  field('Phone','phone_number',phone.phone_number||'','tel')+field('Ext.','extension',phone.extension||'')+
  '<label class="phone-primary"><input type="radio" name="primary_phone" '+(phone.is_primary?'checked':'')+'> Primary</label><button type="button" class="client-phone-remove" aria-label="Remove phone">×</button>';
 const input=row.querySelector('[name="phone_number"]');
 const format=()=>{const d=input.value.replace(/\D/g,'').slice(0,10);input.value=d.length<4?d:d.length<7?'('+d.slice(0,3)+') '+d.slice(3):'('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6);};
 format();input.oninput=format;
 row.querySelector('.client-phone-remove').onclick=()=>{
  const parent=row.parentElement,primary=row.querySelector('[type="radio"]').checked;row.remove();
  if(primary&&parent.firstElementChild)parent.firstElementChild.querySelector('[type="radio"]').checked=true;
 };
 return row;
}
function clientForm(client={},phones=[],isNew=true){
 const form=document.createElement('form');form.className='intake-form';form.id=isNew?'clientIntakeForm':'clientInfoForm';
 form.innerHTML='<div class="intake-type-switch" role="group" aria-label="Client type"><button type="button" data-kind="individual">♙ Individual</button><button type="button" data-kind="organization">▥ Organization</button></div><input type="hidden" name="client_type">'+
  '<fieldset data-fields="individual"><div class="intake-identity-grid">'+
  field('First Name','first_name',client.first_name,'text',true)+field('Middle Name','middle_name',client.middle_name)+field('Last Name','last_name',client.last_name,'text',true)+field('Date of Birth','date_of_birth',client.date_of_birth,'date')+field('SSN (optional)','ssn',client.ssn,'password')+'<button class="btn btn-secondary btn-small" type="button" data-reveal="ssn">Show SSN</button></div></fieldset>'+
  '<fieldset data-fields="organization">'+field('Organization Name','organization_name',client.organization_name,'text',true)+'<div class="form-grid">'+
  select('Corporate Structure','corporate_structure',['','LLC','Corporation','Partnership','Sole Proprietorship','Nonprofit','Government','Other'],client.corporate_structure)+field('Industry','industry',client.industry)+field('EIN (optional)','ein',client.ein,'password')+'<button class="btn btn-secondary btn-small" type="button" data-reveal="ein">Show EIN</button></div>'+field('Registered Agent','registered_agent',client.registered_agent)+'</fieldset>'+
  '<div class="form-grid-3">'+field('Email','email',client.email,'email')+field('Preferred Language','preferred_language',client.preferred_language)+select('Client Status','status',['prospective','active','inactive','closed'],client.status||'active')+'</div>'+
  '<div class="intake-section-head"><h3>Phone Numbers</h3><button type="button" class="btn btn-secondary btn-small" data-add-phone>＋ Add Phone</button></div><div data-phones></div>'+
  '<div class="form-grid">'+field('Street Address','address_line1',client.address_line1)+field('Apt / Suite','address_line2',client.address_line2)+'</div>'+
  '<div class="form-grid-3">'+field('City','city',client.city)+field('State','state',client.state)+field('ZIP','postal_code',client.postal_code)+'</div>'+
  '<details class="intake-notes"><summary>Additional Information</summary>'+area('Notes','notes',client.notes)+'</details>'+
  (isNew?'<label class="intake-next"><input type="checkbox" name="open_case"> Continue to Add Case after saving this client</label>':'')+
  '<p class="record-error" data-status role="status" aria-live="polite"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button type="submit" class="btn btn-primary">'+(isNew?'Complete Intake':'Save Client Changes')+'</button></div>';
 const setType=kind=>{
  form.elements.client_type.value=kind;
  form.querySelectorAll('[data-kind]').forEach(b=>{b.classList.toggle('active',b.dataset.kind===kind);b.setAttribute('aria-pressed',String(b.dataset.kind===kind));});
  form.querySelectorAll('[data-fields]').forEach(group=>{group.hidden=group.dataset.fields!==kind;group.disabled=group.hidden;});
 };
 form.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>setType(b.dataset.kind));
 setType(client.client_type||(client.organization_name?'organization':'individual'));
 form.querySelectorAll('[data-reveal]').forEach(b=>{const input=form.elements[b.dataset.reveal];input.autocomplete='off';input.inputMode='numeric';b.onclick=()=>{input.type=input.type==='password'?'text':'password';b.textContent=(input.type==='password'?'Show ':'Hide ')+b.dataset.reveal.toUpperCase();};});
 const phoneList=form.querySelector('[data-phones]');
 const actual=phones.length?phones:client.phone?[{phone_number:client.phone,is_primary:true}]:[{is_primary:true}];
 actual.forEach(p=>phoneList.appendChild(phoneRow(p)));
 form.querySelector('[data-add-phone]').onclick=()=>{if(phoneList.children.length<20)phoneList.appendChild(phoneRow({is_primary:!phoneList.children.length}));};
 return form;
}
function readClient(form){
 const fd=new FormData(form),kind=val(fd,'client_type'),payload={firm_id:firm(),client_type:kind,country:'US'};
 for(const key of ['first_name','middle_name','last_name','date_of_birth','organization_name','corporate_structure','registered_agent','industry','preferred_language','email','status','address_line1','address_line2','city','state','postal_code','notes'])payload[key]=val(fd,key)||null;
 for(const key of ['ssn','ein']){const raw=val(fd,key);if(raw&&!/^[0-9 -]+$/.test(raw))throw new Error('Use 9 digits for '+key.toUpperCase()+'.');payload[key]=raw.replace(/[ -]/g,'')||null;if(payload[key]&&!/^\d{9}$/.test(payload[key]))throw new Error(key.toUpperCase()+' must contain 9 digits.');}
 if(kind==='individual'&&(!payload.first_name||!payload.last_name))throw new Error('First and last name are required.');
 if(kind==='organization'&&!payload.organization_name)throw new Error('Organization name is required.');
 const phones=[...form.querySelectorAll('[data-phone-row]')].map(row=>({
  phone_type:row.querySelector('[name="phone_type"]').value,
  phone_number:row.querySelector('[name="phone_number"]').value.replace(/\D/g,''),
  extension:row.querySelector('[name="extension"]').value.trim(),
  is_primary:row.querySelector('[type="radio"]').checked
 })).filter(p=>p.phone_number||p.extension);
 if(phones.some(p=>!/^\d{10}$/.test(p.phone_number)||!/^\d{0,8}$/.test(p.extension)))throw new Error('Use 10-digit phone numbers and a numeric extension of up to 8 digits.');
 if(phones.length&&!phones.some(p=>p.is_primary))phones[0].is_primary=true;
 return {payload,phones,openCase:fd.get('open_case')==='on'};
}
async function persistClient(form,state){
 const input=readClient(form);
 const {data,error}=await sb().rpc('save_casego_client',{requested_id:state.id,client_data:input.payload,phone_data:input.phones,create_new:state.isNew});
 if(error)throw error;
 if(data!==state.id)throw new Error('Could not confirm the saved client. Reload before trying again.');
 state.isNew=false;return {...input,id:data};
}
function wireClientForm(form,state,done,cancel,dialog){
 let busy=false;form.addEventListener('input',()=>{if(dialog)dialog.dirty=true;});
 form.querySelector('[data-cancel]').onclick=cancel;
 form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  if(!form.reportValidity())return;
  busy=true;if(dialog)dialog.busy=true;
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  feedback(form,'Saving…');
  try{
   const saved=await persistClient(form,state);
   if(dialog){dialog.dirty=false;dialog.busy=false;}
   feedback(form,'Client saved.');await done(saved);
  }catch(error){
   feedback(form,error.code==='23505'?'This client ID is already saved. Reload the client list before trying again.':errorText(error));
  }finally{busy=false;if(dialog)dialog.busy=false;buttons.forEach(b=>b.disabled=false);}
 };
}
async function openIntake(){
 try{
  if(!await R.can('clients.create'))throw new Error('Your role cannot create clients.');
  if(document.querySelector('.intake-dialog'))return;
  const d=modal('Client Intake','intake-dialog');
  d.body.innerHTML='<p class="sub">Save an individual or organization, then optionally add their first case.</p>';
  const form=clientForm();d.body.appendChild(form);
  wireClientForm(form,{id:window.crypto.randomUUID(),isNew:true},saved=>{
   d.close(true);location.href=(saved.openCase?'add-case.html?clientId=':'client-profile.html?id=')+encodeURIComponent(saved.id);
  },()=>d.close(),d);
  form.querySelector('[name="first_name"]').focus();
 }catch(error){window.alert(errorText(error));}
}
async function intakePage(){
 const mount=$('intakeMount');if(!mount)return;
 const form=clientForm();mount.replaceChildren(form);
 wireClientForm(form,{id:window.crypto.randomUUID(),isNew:true},saved=>{
  location.href=(saved.openCase?'add-case.html?clientId=':'client-profile.html?id=')+encodeURIComponent(saved.id);
 },()=>{location.href='clients.html';});
}
function snapshot(title,sections){
 return {title,sections,lines:[title,...sections.flatMap(s=>[s.title,...s.rows.map(([k,v])=>k+': '+(v??'—'))])]};
}
function printReport(report){
 let target=$('casegoPrintReport');if(target)target.remove();
 target=document.createElement('section');target.id='casegoPrintReport';
 target.innerHTML=reportHTML(report);document.body.appendChild(target);
 document.body.classList.add('printing-report');window.print();
}
window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-report');$('casegoPrintReport')?.remove();});
function reportHTML(report){return '<h1>'+esc(report.title)+'</h1>'+report.sections.map(s=>'<section><h2>'+esc(s.title)+'</h2><dl>'+s.rows.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v??'—')+'</dd></div>').join('')+'</dl></section>').join('');}
function emailDraft(report){
 const d=modal('Prepare Email');
 d.body.innerHTML='<p class="sub">Review the draft before opening your email app. Nothing is sent automatically.</p><form>'+field('To','recipient','','email',true)+field('Subject','subject',report.title)+area('Message','body',report.lines.join('\n'))+'<div class="actions"><button type="submit" class="btn btn-primary">Open Email App</button></div></form>';
 d.body.querySelector('form').onsubmit=e=>{
  e.preventDefault();const fd=new FormData(e.target);
  const a=document.createElement('a');a.href='mailto:'+encodeURIComponent(val(fd,'recipient'))+'?subject='+encodeURIComponent(val(fd,'subject'))+'&body='+encodeURIComponent(val(fd,'body'));a.click();
 };
}
function viewReport(report){const d=modal(report.title,'report-dialog');d.body.innerHTML=reportHTML(report);const actions=document.createElement('div');actions.className='actions';d.body.prepend(actions);toolbar(actions,()=>report,{view:false});}
function toolbar(container,report,options={}){
 const make=(label,handler)=>{const b=document.createElement('button');b.type='button';b.className='btn btn-secondary btn-small';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await handler();}catch(e){window.alert(errorText(e));}finally{b.disabled=false;}};container.appendChild(b);};
 if(options.view!==false)make('View',async()=>viewReport(await report()));
 if(options.save)make('Save',options.save);
 make('Print',async()=>printReport(await report()));
 make('Email',async()=>emailDraft(await report()));
}
async function completeCourt(event,done){
 const d=modal('Complete Court Date');
 d.body.innerHTML='<p><strong>'+esc(event.title)+'</strong><br>'+esc(R.eventLabel(event))+'</p><form>'+
  field('Outcome / Disposition','outcome','','text',true)+area('What happened at this hearing?','hearing_notes')+
  area('Follow-up actions / next steps','follow_up')+
  '<p class="record-error" data-status role="status"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button type="submit" class="btn btn-primary">Mark Complete</button></div></form>';
 const form=d.body.querySelector('form');form.querySelector('[data-cancel]').onclick=()=>d.close();
 form.oninput=()=>{d.dirty=true;};
 form.onsubmit=async e=>{
  e.preventDefault();if(d.busy||!form.reportValidity())return;
  d.busy=true;form.querySelector('[type="submit"]').disabled=true;
  try{
   const fd=new FormData(form);const {error}=await sb().rpc('complete_casego_court_event',{requested_id:event.id,outcome:val(fd,'outcome'),hearing_notes:val(fd,'hearing_notes'),follow_up:val(fd,'follow_up')});
   if(error)throw error;
   d.busy=false;d.dirty=false;d.close(true);await done();
  }catch(error){feedback(form,errorText(error));}
  finally{d.busy=false;form.querySelector('[type="submit"]').disabled=false;}
 };
}
function completionHTML(e){
 if(!e.completed_at)return '';
 return '<div class="completion-summary"><strong>✓ Completed</strong><p>'+esc(e.completion_outcome)+'</p>'+
  (e.completion_notes?'<p>'+esc(e.completion_notes)+'</p>':'')+(e.completion_follow_up?'<p><b>Follow-up:</b> '+esc(e.completion_follow_up)+'</p>':'')+
  '<small>Recorded '+esc(R.eventLabel({start_at:e.completed_at,all_day:false}))+'</small></div>';
}
async function dateHistory(container,caseRecord,type){
 await R.timezone();const allowed=await R.can('calendar.manage'),isCourt=type==='court';
 let expanded=false,events=[],draftId=window.crypto.randomUUID();
 const label=isCourt?'Court Date':'Appointment';
 container.innerHTML='<div class="history-split"><section class="panel"><div class="panel-head"><span>'+label.toUpperCase()+' HISTORY</span></div><div class="panel-body" data-history></div></section>'+
  '<section class="panel"><div class="panel-head"><span>＋ '+label.toUpperCase()+'</span></div><div class="panel-body" data-entry></div></section></div>';
 const history=container.querySelector('[data-history]'),entry=container.querySelector('[data-entry]');
 const render=()=>{
  history.innerHTML='';
  const shown=expanded?events:events.slice(0,3);
  if(!shown.length)history.innerHTML='<p class="empty">No '+label.toLowerCase()+'s recorded.</p>';
  for(const event of shown){
   const card=document.createElement('article');card.className='history-event '+type;
   card.innerHTML='<strong>'+esc(R.eventLabel(event))+'</strong><p>'+esc(event.title)+'</p>'+
    (R.comments(event)?'<p class="event-comments">'+esc(R.comments(event))+'</p>':'')+completionHTML(event);
   if(allowed){
    const actions=document.createElement('div');actions.className='actions history-actions';
    if(!event.completed_at){
     if(isCourt){const complete=document.createElement('button');complete.type='button';complete.className='btn btn-primary btn-small';complete.textContent='Complete';complete.onclick=()=>completeCourt(event,refresh);actions.appendChild(complete);}
     const edit=document.createElement('button');edit.type='button';edit.className='btn btn-secondary btn-small';edit.textContent='Edit';edit.onclick=()=>R.editEvent(event,{},refresh);actions.appendChild(edit);
    }
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-secondary btn-small';remove.textContent='Delete';
    remove.onclick=()=>R.confirmDelete('date',event.title,async()=>{await R.deleteRecord('calendar_events',event.id);await refresh();});
    actions.appendChild(remove);card.appendChild(actions);
   }
   history.appendChild(card);
  }
  if(events.length>3){
   const toggle=document.createElement('button');toggle.className='btn btn-secondary history-toggle';toggle.type='button';
   toggle.textContent=expanded?'▴ Show less':'▾ Show earlier dates ('+(events.length-3)+')';
   toggle.setAttribute('aria-expanded',String(expanded));toggle.onclick=()=>{expanded=!expanded;render();};history.appendChild(toggle);
  }
 };
 const refresh=async()=>{
  events=(await R.caseEvents(caseRecord.id)).filter(e=>(e.event_type==='legal_deadline'?'appointment':e.event_type)===type)
   .sort((a,b)=>new Date(b.start_at)-new Date(a.start_at));render();
 };
 if(allowed){
  const form=document.createElement('form');form.innerHTML='<div class="form-grid">'+field('Date','date','','date',true)+field('Time','time','','time',true)+'</div>'+
   field(isCourt?'Hearing / Court Date Type':'Appointment Type','title','','text',true)+area('Notes','comments')+
   '<p class="sub">Times: '+esc(await R.timezone())+'</p><p class="record-error" data-status role="status"></p><button type="submit" class="btn btn-primary">Add '+label+'</button>';
  let busy=false;form.onsubmit=async e=>{
   e.preventDefault();if(busy||!form.reportValidity())return;
   busy=true;form.querySelector('button').disabled=true;
   try{
    const fd=new FormData(form);fd.set('type',type);
    await R.saveEvent(null,fd,{caseId:caseRecord.id,clientId:caseRecord.client_id,draftId});
    draftId=window.crypto.randomUUID();form.reset();feedback(form,'Date saved.');await refresh();
   }catch(error){feedback(form,error.code==='23505'?'This date is already saved. Reload to see it.':errorText(error));}
   finally{busy=false;form.querySelector('button').disabled=false;}
  };
  entry.appendChild(form);
 }else entry.innerHTML='<p class="sub">Your role can view these dates.</p>';
 await refresh();
}
async function dashboard(){
 await R.timezone();
 const [clients,cases,events,tasks,notes]=await Promise.all(['clients','cases','calendar_events','tasks','notes'].map(t=>R.list(t,q=>q.order('id'))));
 const people=Object.fromEntries(clients.map(c=>[c.id,c])),matters=Object.fromEntries(cases.map(c=>[c.id,c]));
 const today=R.parts(Date.now()).date;
 const upcoming=events.filter(e=>!e.completed_at&&['court','appointment','legal_deadline'].includes(e.event_type)&&
  (e.all_day?R.eventParts(e).date>=today:new Date(e.start_at)>=new Date())).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
 const open=tasks.filter(t=>!['completed','cancelled'].includes(t.status));
 const isAdmin=window.casegoIsFirmAdmin;
 document.querySelector('.attorney-welcome h1').textContent=isAdmin?'Firm Overview':'My Workspace';
 $('dashDate').textContent=(window.casegoFirm?.name||'CaseGO')+' · '+new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:await R.timezone()}).format(new Date());
 for(const [id,v] of Object.entries({kpiToday:upcoming.length,todayEventCount:upcoming.length,todayTaskCount:open.length,kpiTasks:open.length,kpiCases:cases.filter(c=>c.case_status==='active').length,kpiDeadlines:clients.filter(c=>c.status==='active').length}))if($(id))$(id).textContent=v;
 $('kpiNext').textContent=upcoming[0]?R.eventLabel(upcoming[0]):'No upcoming dates';
 $('kpiHigh').textContent=open.filter(t=>['high','urgent'].includes(t.priority)).length+' high priority';
 $('kpiDeadlineNext').textContent=clients.filter(c=>c.client_type!=='organization').length+' individuals · '+clients.filter(c=>c.client_type==='organization').length+' organizations';
 $('kpiAttention').textContent=cases.length+' visible cases';
 const schedule=$('attorneySchedule');schedule.className='upcoming-date-columns';schedule.replaceChildren();
 for(const group of [upcoming.slice(0,5),upcoming.slice(5,10)]){
  const col=document.createElement('div');col.className='upcoming-date-column';
  for(const e of group){
   const p=R.eventParts(e),date=new Date(p.date+'T12:00:00Z'),client=people[e.client_id]||people[matters[e.case_id]?.client_id];
   const type=e.event_type==='court'?'court':'appointment';
   const card=document.createElement('a');card.className='upcoming-date-card '+type;
   card.href=e.case_id?'case-detail.html?id='+e.case_id+'#'+(type==='court'?'court':'appointments'):'calendar.html';
   card.innerHTML='<span class="date-type-strip">'+(type==='court'?'COURT':'APPT')+'</span><span class="date-stack"><span>'+date.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()+'</span><strong>'+String(date.getUTCDate()).padStart(2,'0')+'</strong><small>'+esc(p.time?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:await R.timezone()}).format(new Date(e.start_at)):'—')+'</small></span><span class="date-card-copy"><strong>'+esc(client?name(client):'Firm appointment')+'</strong><span>'+esc(e.title)+'</span></span><span class="date-chevron">›</span>';
   col.appendChild(card);
  }
  schedule.appendChild(col);
 }
 if(!upcoming.length)schedule.innerHTML='<p class="empty">No upcoming dates.</p>';
 $('attorneyTasks').innerHTML=open.slice(0,5).map(t=>'<div class="cg-row"><div><strong>'+esc(t.title)+'</strong><p class="sub">'+esc(t.priority)+(t.due_at?' · '+R.eventLabel({start_at:t.due_at,all_day:false}):'')+'</p></div></div>').join('')||'<p class="empty">No open tasks.</p>';
 $('attentionCases').innerHTML=cases.filter(c=>c.case_status!=='closed').slice(0,5).map(c=>'<a class="cg-row active-matter-row" href="case-detail.html?id='+c.id+'"><strong>'+esc(name(people[c.client_id]))+'</strong><span>'+esc([c.case_type,c.title,c.case_number].filter(Boolean).join(' · '))+'</span><small>'+esc(c.case_status)+'</small></a>').join('')||'<p class="empty">No active matters.</p>';
 $('recentActivity').innerHTML=notes.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4).map(n=>'<div class="cg-row"><strong>'+esc(n.title||'Case note')+'</strong><p class="sub">'+esc(n.body)+'</p></div>').join('')||'<p class="empty">No notes recorded.</p>';
 $('dashboardMessages').innerHTML='<p class="empty">No connected messaging service.</p>';
}
function activateTabs(){
 const tabs=[...document.querySelectorAll('[data-workspace-tab]')],panels=[...document.querySelectorAll('[data-workspace-panel]')];
 const activate=id=>{
  if(!panels.some(p=>p.dataset.workspacePanel===id))id='overview';
  tabs.forEach(b=>{b.classList.toggle('active',b.dataset.workspaceTab===id);b.setAttribute('aria-selected',String(b.dataset.workspaceTab===id));});
  panels.forEach(p=>{p.hidden=p.dataset.workspacePanel!==id;});
 };
 tabs.forEach(b=>b.onclick=()=>{activate(b.dataset.workspaceTab);history.replaceState(null,'','#'+b.dataset.workspaceTab);});
 activate(location.hash.slice(1));return activate;
}
async function clientPage(){
 const id=new URLSearchParams(location.search).get('id');
 const {data:c,error}=await sb().from('clients').select('*').eq('id',id).eq('firm_id',firm()).single();if(error)throw error;
 const phones=await R.list('client_phones',q=>q.eq('client_id',id).order('created_at').order('id'));
 $('clientName').textContent=name(c);$('clientMeta').textContent=(c.client_type==='organization'?'Organization':'Individual')+' · '+c.status;
 const form=clientForm(c,phones,false);$('clientEditorMount').replaceChildren(form);
 const canEdit=await R.can('clients.edit');
 if(!canEdit)form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
 else wireClientForm(form,{id,isNew:false},saved=>{Object.assign(c,saved.payload);$('clientName').textContent=name(c);feedback(form,'Client and phones saved.');},()=>{location.href='clients.html';});
 const report=()=>snapshot(name(c),[{title:'Client',rows:['client_type','organization_name','first_name','last_name','email','phone','address_line1','city','state','postal_code','status','notes'].map(k=>[k.replaceAll('_',' '),c[k]])}]);
 const actions=$('clientActions');toolbar(actions,report,{save:canEdit?()=>form.requestSubmit():null});
 $('clientAddCase').href='add-case.html?clientId='+encodeURIComponent(id);
 await R.recordGear(actions,'client',c,()=>{location.href='clients.html';});
 await R.clientCaseList($('clientCasesBody'),id);
}
async function casePage(){
 const id=new URLSearchParams(location.search).get('id');
 const {data:c,error}=await sb().from('cases').select('*').eq('id',id).eq('firm_id',firm()).single();if(error)throw error;
 const {data:client,error:ce}=await sb().from('clients').select('*').eq('id',c.client_id).eq('firm_id',firm()).single();if(ce)throw ce;
 $('caseTitle').textContent=name(client);$('caseMeta').textContent=[c.case_type,c.title,c.case_number].filter(Boolean).join(' · ');
 $('caseStatusDisplay').textContent=c.case_status;
 const form=$('caseForm');
 for(const [key,column] of Object.entries({caseType:'case_type',subCaseType:'title',caseNumber:'case_number',caseStatus:'case_status',caseNotes:'description',primaryAttorney:'assigned_attorney_id',accessScope:'access_scope'})){
  if(form.elements[key])form.elements[key].value=c[column]||'';
 }
 const users=await R.list('profiles',q=>q.eq('active',true).order('last_name').order('id'));
 const team=await R.list('case_team_members',q=>q.eq('case_id',id).order('id'));
 form.elements.primaryAttorney.innerHTML='<option value="">Unassigned</option>'+users.map(u=>'<option value="'+u.id+'">'+esc([u.first_name,u.last_name].filter(Boolean).join(' ')||u.email)+'</option>').join('');
 form.elements.primaryAttorney.value=c.assigned_attorney_id||'';
 $('caseTeamList').innerHTML=users.map(u=>'<label class="casego-team-option"><input type="checkbox" value="'+u.id+'" '+(team.some(t=>t.user_id===u.id)?'checked':'')+'><span>'+esc([u.first_name,u.last_name].filter(Boolean).join(' ')||u.email)+'</span></label>').join('');
 const canEdit=await R.can('cases.edit');
 if(!canEdit)form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
 let busy=false;form.onsubmit=async e=>{
  e.preventDefault();if(busy||!canEdit||!form.reportValidity())return;busy=true;
  const fd=new FormData(form),payload={case_type:val(fd,'caseType'),title:val(fd,'subCaseType')||val(fd,'caseType'),case_number:val(fd,'caseNumber')||null,case_status:val(fd,'caseStatus'),description:val(fd,'caseNotes')||null,assigned_attorney_id:val(fd,'primaryAttorney')||null,access_scope:val(fd,'accessScope')};
  try{
   const {data,error}=await sb().from('cases').update(payload).eq('id',id).eq('firm_id',firm()).select('id');if(error)throw error;if(data?.length!==1)throw new Error('Case was not updated. Check access.');
   Object.assign(c,payload);await window.CaseGOCore.saveTeam(id,payload.assigned_attorney_id);
   $('caseMeta').textContent=[c.case_type,c.title,c.case_number].filter(Boolean).join(' · ');$('caseStatusDisplay').textContent=c.case_status;feedback(form,'Case saved.');
  }catch(e){feedback(form,errorText(e));}finally{busy=false;}
 };
 const report=async()=>snapshot(name(client)+' — '+(c.case_number||c.case_type),[
  {title:'Case Information',rows:[['Client',name(client)],['Case type',c.case_type],['Matter',c.title],['Status',c.case_status],['Notes',c.description]]},
  {title:'Dates',rows:(await R.caseEvents(id)).map(e=>[R.eventLabel(e),(e.title||'')+(e.completed_at?' — Completed: '+e.completion_outcome:'')])}
 ]);
 toolbar($('caseActions'),report,{save:canEdit?()=>form.requestSubmit():null});
 await R.recordGear($('caseActions'),'case',c,()=>{location.href='client-profile.html?id='+c.client_id;});
 activateTabs();
 await Promise.all([dateHistory($('caseDatesPanel'),c,'court'),dateHistory($('appointmentsPanel'),c,'appointment'),relatedLists(c)]);
}
async function relatedLists(c){
 for(const [table,id,title,columns] of [
  ['tasks','caseTasksList','Tasks',['title','status','priority']],
  ['notes','caseNotesList','Notes',['title','body']],
  ['documents','caseDocumentsList','Documents',['title']],
  ['invoices','caseInvoicesList','Invoices',['invoice_number','status','total_amount']],
  ['payments','casePaymentsList','Payments',['payment_date','payment_method','amount']],
  ['expenses','caseExpensesList','Expenses',['expense_date','description','amount']]
 ]){
  const mount=$(id);if(!mount)continue;
  const rows=await R.list(table,q=>q.eq('case_id',c.id).order('created_at',{ascending:false}).order('id'));
  mount.innerHTML=rows.map(row=>'<article class="case-date-card"><strong>'+esc(row[columns[0]]||title)+'</strong>'+columns.slice(1).map(col=>'<p>'+esc(row[col]??'—')+'</p>').join('')+'</article>').join('')||'<p class="empty">No '+title.toLowerCase()+' recorded.</p>';
  if(['invoices','payments'].includes(table))for(const [i,row] of rows.entries()){
   const actions=document.createElement('div');actions.className='actions';mount.children[i].appendChild(actions);
   toolbar(actions,()=>billingReport(table,row),{save:await R.can('billing.manage')?()=>editBilling(table,row,()=>relatedLists(c)):null});
   await R.recordGear(actions,table==='invoices'?'invoice':'payment',row,()=>relatedLists(c));
  }
 }
}
function billingReport(table,row){return snapshot((table==='invoices'?'Invoice ':'Payment ')+(row.invoice_number||row.reference_number||row.id.slice(0,8)),[{title:'Record',rows:Object.entries(row).filter(([k])=>!k.endsWith('_id')&&!['id','created_by'].includes(k)).map(([k,v])=>[k.replaceAll('_',' '),v])}]);}
async function editBilling(table,row,done){
 if(!await R.can('billing.manage'))throw new Error('Your role cannot edit billing records.');
 const d=modal(table==='invoices'?'Edit Invoice':'Edit Payment'),form=document.createElement('form');
 const keys=table==='invoices'?['invoice_number','issue_date','due_date','status','subtotal','tax_amount','notes']:['payment_date','amount','payment_method','reference_number','notes'];
 form.innerHTML='<div class="form-grid">'+keys.map(k=>k==='notes'?area('Notes',k,row[k]):k==='status'?select('Status',k,['draft','sent','partial','paid','overdue','void'],row[k]):field(k.replaceAll('_',' '),k,row[k],k.includes('date')?'date':['subtotal','tax_amount','amount'].includes(k)?'number':'text')).join('')+'</div><p class="record-error" data-status></p><button type="submit" class="btn btn-primary">Save Changes</button>';
 form.querySelectorAll('[type="number"]').forEach(x=>{x.step='0.01';x.min=x.name==='amount'?'0.01':'0';x.required=true;});
 d.body.appendChild(form);form.oninput=()=>{d.dirty=true;};
 form.onsubmit=async e=>{
  e.preventDefault();if(d.busy||!form.reportValidity())return;d.busy=true;
  try{
   const fd=new FormData(form),payload=Object.fromEntries(keys.map(k=>[k,['subtotal','tax_amount','amount'].includes(k)?Number(fd.get(k)):val(fd,k)||null]));
   if(table==='invoices')payload.total_amount=Number((payload.subtotal+payload.tax_amount).toFixed(2));
   const {data,error}=await sb().from(table).update(payload).eq('id',row.id).eq('firm_id',firm()).select('id');
   if(error)throw error;if(data?.length!==1)throw new Error('Record was not updated.');
   Object.assign(row,payload);d.busy=false;d.dirty=false;d.close(true);await done();
  }catch(e){feedback(form,errorText(e));}finally{d.busy=false;}
 };
}
async function billingPage(table,bodyId){
 const rows=await R.list(table,q=>q.order('created_at',{ascending:false}).order('id'));
 const clients=Object.fromEntries((await R.list('clients',q=>q.order('id'))).map(c=>[c.id,c]));
 const body=$(bodyId);if(!body)return;
 const header=body.closest('table').querySelector('thead tr');header.innerHTML='<th>Client</th><th>Record</th><th>Date</th><th>Amount</th><th>Actions</th>';
 body.innerHTML=rows.map(row=>'<tr><td>'+esc(name(clients[row.client_id]))+'</td><td>'+esc(row.invoice_number||row.reference_number||row.payment_method||'Payment')+'</td><td>'+esc(row.issue_date||row.payment_date)+'</td><td>'+money(row.total_amount??row.amount)+'</td><td><div class="actions"></div></td></tr>').join('')||'<tr><td colspan="5" class="empty">No records.</td></tr>';
 for(const [i,row] of rows.entries()){
  const actions=body.children[i].querySelector('.actions');
  toolbar(actions,()=>billingReport(table,row),{save:await R.can('billing.manage')?()=>editBilling(table,row,()=>billingPage(table,bodyId)):null});
  await R.recordGear(actions,table==='invoices'?'invoice':'payment',row,()=>billingPage(table,bodyId));
 }
}
async function openCaseChooser(){
 try{
  const clients=await R.list('clients',q=>q.order('last_name').order('id'));
  const d=modal('Add Case');
  d.body.innerHTML='<form>'+select('Client','client',clients.map(c=>[c.id,name(c)]))+'<div class="actions"><button class="btn btn-primary" type="submit">Continue</button></div></form>';
  if(!clients.length){d.body.innerHTML='<p>Add a client before opening their case.</p><button class="btn btn-primary" data-intake>New Intake</button>';d.body.querySelector('button').onclick=()=>{d.close(true);openIntake();};return;}
  d.body.querySelector('form').onsubmit=e=>{e.preventDefault();location.href='add-case.html?clientId='+encodeURIComponent(new FormData(e.target).get('client'));};
 }catch(e){window.alert(errorText(e));}
}
function init(){
 document.querySelectorAll('a[href="add-client.html"]').forEach(a=>a.onclick=e=>{e.preventDefault();openIntake();});
 document.querySelectorAll('a[href="add-case.html"]').forEach(a=>a.onclick=e=>{e.preventDefault();openCaseChooser();});
}
window.CaseGOWorkspace={openIntake,openCaseChooser,intakePage,clientPage,casePage,dashboard,billingPage,init,clientForm,readClient,persistClient,dateHistory,completeCourt,toolbar};
R.openIntake=openIntake;
})();
