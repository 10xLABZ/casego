/* CaseGO v0.6.9 — compact client/case workspaces and communication records. */
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
 if(e?.code==='PGRST202'||e?.code==='PGRST204'||e?.code==='42703')return 'This version needs its database update first. Run CASEGO_v0.6.5_RUN_FIRST.sql in the CaseGO Supabase project, then reload.';
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
  '<fieldset data-fields="organization" class="organization-compact-grid">'+field('Organization Name','organization_name',client.organization_name,'text',true)+'<div class="form-grid">'+
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
 form.querySelectorAll('[data-reveal]').forEach(b=>{const input=form.elements[b.dataset.reveal];input.autocomplete='off';b.onclick=()=>{input.type=input.type==='password'?'text':'password';b.textContent=(input.type==='password'?'Show ':'Hide ')+b.dataset.reveal.toUpperCase();};});
 const phoneList=form.querySelector('[data-phones]');
 const actual=phones.length?phones:client.phone?[{phone_number:client.phone,is_primary:true}]:[{is_primary:true}];
 actual.forEach(p=>phoneList.appendChild(phoneRow(p)));
 form.querySelector('[data-add-phone]').onclick=()=>{if(phoneList.children.length<20)phoneList.appendChild(phoneRow({is_primary:!phoneList.children.length}));};
 return form;
}
function readClient(form){
 const fd=new FormData(form),kind=val(fd,'client_type'),payload={firm_id:firm(),client_type:kind,country:'US'};
 for(const key of ['first_name','middle_name','last_name','date_of_birth','organization_name','corporate_structure','registered_agent','industry','preferred_language','email','status','address_line1','address_line2','city','state','postal_code','notes'])payload[key]=val(fd,key)||null;
 for(const key of ['ssn','ein'])payload[key]=val(fd,key)||null;
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
 const [clients,cases,events,tasks,notes,invoices,payments,timeEntries]=await Promise.all(['clients','cases','calendar_events','tasks','notes','invoices','payments','time_entries'].map(t=>R.list(t,q=>q.order('id'))));
 const people=Object.fromEntries(clients.map(c=>[c.id,c])),matters=Object.fromEntries(cases.map(c=>[c.id,c]));
 const today=R.parts(Date.now()).date;
 const upcoming=events.filter(e=>!e.completed_at&&['court','appointment','legal_deadline'].includes(e.event_type)&&
  (e.all_day?R.eventParts(e).date>=today:new Date(e.start_at)>=new Date())).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
 const open=tasks.filter(t=>!['completed','cancelled'].includes(t.status));
 const isAdmin=window.casegoIsFirmAdmin,heading=document.querySelector('.dash-heading h1');
 heading.textContent=isAdmin?'Firm Overview':'My Workspace';
 $('dashDate').textContent=(window.casegoFirm?.name||'CaseGO')+' · '+new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:await R.timezone()}).format(new Date());
 for(const [id,v] of Object.entries({kpiToday:upcoming.length,todayEventCount:upcoming.length,todayTaskCount:open.length,kpiTasks:open.length,kpiCases:cases.filter(c=>c.case_status==='active').length,kpiDeadlines:clients.filter(c=>c.status==='active').length}))if($(id))$(id).textContent=v;
 $('kpiNext').textContent=upcoming[0]?R.eventLabel(upcoming[0]):'No upcoming dates';
 $('kpiHigh').textContent=open.filter(t=>['high','urgent'].includes(t.priority)).length+' high priority';
 $('kpiDeadlineNext').textContent=clients.filter(c=>c.client_type!=='organization').length+' individuals · '+clients.filter(c=>c.client_type==='organization').length+' organizations';
 $('kpiAttention').textContent=cases.length+' visible cases';
 const month=today.slice(0,7),monthEntries=timeEntries.filter(x=>String(x.work_date).slice(0,7)===month&&x.billable),monthPayments=payments.filter(x=>String(x.payment_date).slice(0,7)===month);
 const hours=monthEntries.reduce((n,x)=>n+Number(x.hours||0),0),revenue=monthPayments.reduce((n,x)=>n+Number(x.amount||0),0);
 $('kpiHours').textContent=hours.toFixed(1);$('kpiRevenue').textContent=money(revenue);
 $('hoursChart').innerHTML=[.35,.55,.42,.7,.6,.85,.72].map((h,i)=>'<i style="height:'+Math.round(h*28)+'px"></i>').join('');
 $('revenueProgress').style.width=Math.min(100,revenue?62:0)+'%';
 const schedule=$('attorneySchedule');schedule.className='upcoming-date-columns';schedule.replaceChildren();
 for(const group of [upcoming.slice(0,5),upcoming.slice(5,10)]){
  const col=document.createElement('div');col.className='upcoming-date-column';
  for(const e of group){
   const p=R.eventParts(e),date=new Date(p.date+'T12:00:00Z'),client=people[e.client_id]||people[matters[e.case_id]?.client_id];
   const type=e.event_type==='court'?'court':'appointment';
   const card=document.createElement('a');card.className='upcoming-date-card '+type;
   card.href=e.case_id?'case-detail.html?id='+e.case_id:'calendar.html';
   card.innerHTML='<span class="date-type-strip">'+(type==='court'?'COURT':'APPT')+'</span><span class="date-stack"><span>'+date.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()+'</span><strong>'+String(date.getUTCDate()).padStart(2,'0')+'</strong><small>'+esc(p.time?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:await R.timezone()}).format(new Date(e.start_at)):'—')+'</small></span><span class="date-card-copy"><strong>'+esc(client?name(client):'Firm appointment')+'</strong><span>'+esc(e.title)+'</span></span><span class="date-chevron">›</span>';
   col.appendChild(card);
  }
  schedule.appendChild(col);
 }
 if(!upcoming.length)schedule.innerHTML='<p class="empty">No upcoming dates.</p>';
 $('attorneyTasks').innerHTML=open.slice(0,5).map(t=>'<a class="compact-row" href="tasks.html"><strong>'+esc(t.title)+'</strong><span>'+esc(t.priority)+(t.due_at?' · '+R.eventLabel({start_at:t.due_at,all_day:false}):'')+'</span></a>').join('')||'<p class="compact-empty">No open tasks. You’re all caught up.</p>';
 $('attentionCases').innerHTML=cases.filter(c=>c.case_status!=='closed').slice(0,5).map(c=>'<a class="compact-row" href="case-detail.html?id='+c.id+'"><strong>'+esc(name(people[c.client_id]))+'</strong><span>'+esc([c.case_type,c.title].filter(Boolean).join(' · '))+'</span><em>'+esc(c.case_status)+'</em></a>').join('')||'<p class="compact-empty">No active matters.</p>';
 $('recentActivity').innerHTML=notes.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5).map(n=>'<a class="compact-row" href="notes.html"><strong>'+esc(n.title||'Case note')+'</strong><span>'+esc(n.body)+'</span></a>').join('')||'<p class="compact-empty">No notes recorded.</p>';
 const totals={draft:0,sent:0,paid:0,overdue:0};invoices.forEach(i=>{if(i.status in totals)totals[i.status]++;});
 $('invoicePipeline').innerHTML=Object.entries(totals).map(([k,v])=>'<a class="finance-row" href="invoices.html"><span><i class="dot '+k+'"></i>'+k[0].toUpperCase()+k.slice(1)+'</span><strong>'+v+'</strong></a>').join('');
 const invoiced=invoices.filter(i=>!['draft','void'].includes(i.status)).reduce((n,i)=>n+Number(i.total_amount||0),0),outstanding=Math.max(0,invoiced-payments.reduce((n,p)=>n+Number(p.amount||0),0)),unbilled=timeEntries.filter(x=>x.billable&&x.billing_status!=='invoiced').reduce((n,x)=>n+Number(x.hours||0)*Number(x.hourly_rate||0),0);
 $('financialHealth').innerHTML='<div class="finance-row"><span>MTD Payments</span><strong>'+money(revenue)+'</strong></div><div class="finance-row"><span>Outstanding</span><strong>'+money(outstanding)+'</strong></div><div class="finance-row"><span>Unbilled Time</span><strong>'+money(unbilled)+'</strong></div>';
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
async function openRelatedCreate(kind,context,done){
 if(kind==='task')return openTaskCreate(context,done);
 const permission=kind==='task'?'tasks.manage':kind==='note'?'notes.manage':'expenses.create';
 if(!await R.can(permission)){window.alert('Your role cannot add '+kind+'s.');return;}
 const labels={task:'Task',note:'Note',expense:'Expense'},label=labels[kind],d=modal('Add '+label),form=document.createElement('form');
 if(kind==='task')form.innerHTML=field('Task Title','title','','text',true)+area('Description','description')+'<div class="form-grid-3">'+field('Due Date','due_date','','date')+field('Due Time','due_time','','time')+select('Priority','priority',['low','normal','high','urgent'],'normal')+'</div>';
 if(kind==='note')form.innerHTML=field('Note Title','title')+select('Note Type','note_type',['general','client','case','research','strategy','internal'],context.caseId?'case':'client')+area('Note','body','') ;
 if(kind==='expense')form.innerHTML='<div class="form-grid-3">'+field('Expense Date','expense_date',new Date().toISOString().slice(0,10),'date',true)+field('Category','category')+field('Amount','amount','','number',true)+'</div>'+area('Description','description')+'<label class="intake-next"><input type="checkbox" name="billable"> Bill this expense to the client</label>';
 form.innerHTML+='<p class="record-error" data-status role="status"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary">Add '+label+'</button></div>';d.body.appendChild(form);
 if(kind==='expense'){form.elements.amount.min='0';form.elements.amount.step='0.01';}
 form.querySelector('[data-cancel]').onclick=()=>d.close(true);form.oninput=()=>{d.dirty=true;};
 form.onsubmit=async ev=>{ev.preventDefault();if(d.busy||!form.reportValidity())return;d.busy=true;try{const fd=new FormData(form),base={firm_id:firm(),client_id:context.clientId||null,case_id:context.caseId||null,created_by:window.casegoProfile.id};let payload;
   if(kind==='task'){const dueDate=val(fd,'due_date'),dueTime=val(fd,'due_time');if(!dueDate&&(dueTime))throw new Error('Choose a due date for the selected time.');payload={...base,title:val(fd,'title'),description:val(fd,'description')||null,status:'open',priority:val(fd,'priority'),due_at:dueDate?R.timestamp(dueDate,dueTime):null,assigned_to:window.casegoProfile.id};}
   if(kind==='note')payload={...base,title:val(fd,'title')||null,body:val(fd,'body'),note_type:val(fd,'note_type'),is_pinned:false};
   if(kind==='expense')payload={...base,expense_date:val(fd,'expense_date'),category:val(fd,'category')||null,description:val(fd,'description'),amount:Number(val(fd,'amount')),billable:fd.get('billable')==='on'};
   if((kind==='note'||kind==='expense')&&!payload.description&&!payload.body)throw new Error('Enter '+(kind==='note'?'the note':'an expense description')+'.');
   const table=kind==='task'?'tasks':kind==='note'?'notes':'expenses',{error}=await sb().from(table).insert(payload);if(error)throw error;d.dirty=false;d.busy=false;d.close(true);await done();
  }catch(error){feedback(form,errorText(error));}finally{d.busy=false;}};
}
async function clientRelatedLists(clientId){
 const host=$('clientRelatedGrid');if(!host)return;
 for(const [table,id,columns] of [['tasks','clientTasksList',['title','status','priority']],['notes','clientNotesList',['title','body']],['expenses','clientExpensesList',['expense_date','description','amount']]]){
  const rows=await R.list(table,q=>q.eq('client_id',clientId).order('created_at',{ascending:false}).order('id'));
  $(id).innerHTML=rows.slice(0,10).map(row=>'<article class="case-date-card"><strong>'+esc(row[columns[0]]||table)+'</strong>'+columns.slice(1).map(col=>'<p>'+esc(row[col]??'—')+'</p>').join('')+'</article>').join('')||'<p class="empty">No '+table+' recorded.</p>';
 }
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
 if(!$('clientRelatedActions')){const buttons=document.createElement('div');buttons.id='clientRelatedActions';buttons.className='related-create-actions';buttons.innerHTML='<button class="btn btn-secondary btn-small" data-add-task>＋ Add Task</button><button class="btn btn-secondary btn-small" data-add-note>＋ Add Note</button><button class="btn btn-secondary btn-small" data-add-expense>＋ Add Expense</button>';actions.appendChild(buttons);buttons.querySelector('[data-add-task]').onclick=()=>openRelatedCreate('task',{clientId:id},()=>clientRelatedLists(id));buttons.querySelector('[data-add-note]').onclick=()=>openRelatedCreate('note',{clientId:id},()=>clientRelatedLists(id));buttons.querySelector('[data-add-expense]').onclick=()=>openRelatedCreate('expense',{clientId:id},()=>clientRelatedLists(id));}
 await R.recordGear(actions,'client',c,()=>{location.href='clients.html';});
 await R.clientCaseList($('clientCasesBody'),id);
 const casesPanel=$('clientCasesBody').closest('.panel');if(!$('clientRelatedGrid')){const grid=document.createElement('div');grid.id='clientRelatedGrid';grid.className='client-related-grid';grid.innerHTML='<section class="panel"><div class="panel-head">TASKS</div><div class="related-card-list" id="clientTasksList"></div></section><section class="panel"><div class="panel-head">NOTES</div><div class="related-card-list" id="clientNotesList"></div></section><section class="panel"><div class="panel-head">EXPENSES</div><div class="related-card-list" id="clientExpensesList"></div></section>';casesPanel.insertAdjacentElement('afterend',grid);}await clientRelatedLists(id);
}
async function casePage(){
 const id=new URLSearchParams(location.search).get('id');
 const {data:c,error}=await sb().from('cases').select('*').eq('id',id).eq('firm_id',firm()).single();if(error)throw error;
 const {data:client,error:ce}=await sb().from('clients').select('*').eq('id',c.client_id).eq('firm_id',firm()).single();if(ce)throw ce;
 $('caseTitle').innerHTML='<a class="case-client-link" href="client-profile.html?id='+encodeURIComponent(client.id)+'" title="View client profile">'+esc(name(client))+'</a>';$('caseMeta').textContent=[c.case_type,c.title,c.case_number].filter(Boolean).join(' · ');
 $('caseStatusDisplay').textContent=c.case_status;
 const form=$('caseForm');
 if(!form.querySelector('[name="billingType"]')){
  const save=form.querySelector('button[type="submit"],button:not([type])');
  save.insertAdjacentHTML('beforebegin','<div class="hr"></div><section class="case-billing-config"><h3 class="section-title">Billing Arrangement</h3><div class="form-grid-3">'+
   select('Billing Type','billingType',[['flat_fee','Flat Fee'],['hourly','Hourly'],['hybrid','Hybrid'],['no_charge','No Charge / Pro Bono']],c.billing_type||'flat_fee')+
   field('Flat Fee / Base Fee','flatFeeAmount',c.flat_fee_amount??'','number')+field('Case Hourly Rate','caseHourlyRate',c.hourly_rate??'','number')+
   field('Hybrid Included Hours','hybridIncludedHours',c.hybrid_included_hours??'','number')+'</div><p class="sub">Case rate overrides the attorney rate, which overrides the firm default rate. Flat-fee matters may still track internal time.</p></section>');
  form.querySelectorAll('.case-billing-config input[type="number"]').forEach(x=>{x.min='0';x.step='0.01';});
  const toggleBilling=()=>{const type=form.elements.billingType.value;form.elements.flatFeeAmount.closest('.field').hidden=!['flat_fee','hybrid'].includes(type);form.elements.caseHourlyRate.closest('.field').hidden=!['hourly','hybrid'].includes(type);form.elements.hybridIncludedHours.closest('.field').hidden=type!=='hybrid';};
  form.elements.billingType.onchange=toggleBilling;toggleBilling();
 }
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
  const fd=new FormData(form),num=k=>val(fd,k)===''?null:Number(val(fd,k)),payload={case_type:val(fd,'caseType'),title:val(fd,'subCaseType')||val(fd,'caseType'),case_number:val(fd,'caseNumber')||null,case_status:val(fd,'caseStatus'),description:val(fd,'caseNotes')||null,assigned_attorney_id:val(fd,'primaryAttorney')||null,access_scope:val(fd,'accessScope'),billing_type:val(fd,'billingType'),flat_fee_amount:num('flatFeeAmount'),hourly_rate:num('caseHourlyRate'),hybrid_included_hours:num('hybridIncludedHours')};
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
 if(!$('caseRelatedActions')){const buttons=document.createElement('div');buttons.id='caseRelatedActions';buttons.className='related-create-actions';buttons.innerHTML='<button class="btn btn-secondary btn-small" data-add-task>＋ Add Task</button><button class="btn btn-secondary btn-small" data-add-note>＋ Add Note</button><button class="btn btn-secondary btn-small" data-add-expense>＋ Add Expense</button>';$('caseActions').appendChild(buttons);const refresh=()=>relatedLists(c);buttons.querySelector('[data-add-task]').onclick=()=>openRelatedCreate('task',{clientId:c.client_id,caseId:c.id},refresh);buttons.querySelector('[data-add-note]').onclick=()=>openRelatedCreate('note',{clientId:c.client_id,caseId:c.id},refresh);buttons.querySelector('[data-add-expense]').onclick=()=>openRelatedCreate('expense',{clientId:c.client_id,caseId:c.id},refresh);}
 await R.recordGear($('caseActions'),'case',c,()=>{location.href='client-profile.html?id='+c.client_id;});
 activateTabs();
 await Promise.all([dateHistory($('caseDatesPanel'),c,'court'),dateHistory($('appointmentsPanel'),c,'appointment'),relatedLists(c),timeEntryPanel(c)]);
}
async function timeEntryPanel(c){
 const billing=$('case-panel-billing');if(!billing)return;
 let section=$('caseTimeEntriesSection');if(!section){section=document.createElement('section');section.className='panel';section.id='caseTimeEntriesSection';section.innerHTML='<div class="panel-head">TIME ENTRIES</div><div class="panel-body"><div id="caseTimeEntriesList"></div><form id="caseTimeEntryForm" class="compact-time-form"><div class="form-grid-3">'+field('Work Date','work_date',new Date().toISOString().slice(0,10),'date',true)+field('Hours','hours','','number',true)+field('Description','description','','text',true)+'</div><label class="intake-next"><input type="checkbox" name="billable" checked> Billable</label><p data-status class="record-error"></p><button class="btn btn-primary btn-small">Add Time Entry</button></form></div>';billing.prepend(section);section.querySelector('[name="hours"]').step='.1';section.querySelector('[name="hours"]').min='.01';}
 const rows=await R.list('time_entries',q=>q.eq('case_id',c.id).order('work_date',{ascending:false}).order('id'));
 $('caseTimeEntriesList').innerHTML=rows.map(x=>'<div class="compact-row"><strong>'+esc(x.work_date)+' · '+Number(x.hours).toFixed(2)+' hours</strong><span>'+esc(x.description)+'</span><em>'+(x.billable?money(Number(x.hours)*Number(x.hourly_rate)):'Internal')+'</em></div>').join('')||'<p class="compact-empty">No time entered.</p>';
 const form=$('caseTimeEntryForm');if(form.dataset.wired)return;form.dataset.wired='1';
 if(!await R.can('billing.manage')){form.hidden=true;return;}
 form.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(form);try{let rate=c.hourly_rate; if(rate==null&&c.assigned_attorney_id){const {data}=await sb().from('profiles').select('hourly_rate').eq('id',c.assigned_attorney_id).maybeSingle();rate=data?.hourly_rate;}if(rate==null){const {data}=await sb().from('firm_settings').select('default_hourly_rate').eq('firm_id',firm()).maybeSingle();rate=data?.default_hourly_rate;}const billable=fd.get('billable')==='on',payload={firm_id:firm(),case_id:c.id,user_id:window.casegoProfile.id,work_date:val(fd,'work_date'),hours:Number(val(fd,'hours')),description:val(fd,'description'),billable,hourly_rate:Number(rate||0),billing_status:billable?'draft':'nonbillable',created_by:window.casegoProfile.id};const {error}=await sb().from('time_entries').insert(payload);if(error)throw error;form.reset();form.elements.work_date.value=new Date().toISOString().slice(0,10);form.elements.billable.checked=true;form.dataset.wired='';await timeEntryPanel(c);}catch(e){feedback(form,errorText(e));}};
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

/* v0.6.9 compact client and case workspaces */
const activityLabels={task:'Tasks',note:'Notes',communication:'Communications',expense:'Expenses'};
function shortDate(value,withTime=false){
 if(!value)return '—';
 const d=new Date(value.length===10?value+'T12:00:00':value);
 return new Intl.DateTimeFormat('en-US',withTime?{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',year:'numeric'}).format(d);
}
function personLabel(p){return p?[(p.first_name?.[0]||'').toUpperCase()+(p.first_name?'.':''),p.last_name].filter(Boolean).join(' ')||p.email||'—':'—';}
function communicationMethod(value){return ({phone:'Phone Call',voicemail:'Voicemail',email:'Email',sms:'SMS',in_person:'In Person',internal:'Internal',other:'Other'})[value]||'Communication';}
async function openCommunication(context,done){
 if(!await R.can('communications.manage')){window.alert('Your role cannot add communications.');return;}
 const d=modal('Add Communication'),form=document.createElement('form'),now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 form.innerHTML='<div class="form-grid-3">'+select('Method','communication_type',[['phone','Phone Call'],['voicemail','Voicemail'],['email','Email'],['sms','SMS'],['in_person','In Person'],['other','Other']],'phone')+select('Direction','direction',[['inbound','Incoming'],['outbound','Outgoing']],'inbound')+field('Date & Time','occurred_at',now,'datetime-local',true)+'</div>'+field('Subject (optional)','subject')+area('Description / Details','body')+'<p class="sub">Entered by '+esc([window.casegoProfile?.first_name,window.casegoProfile?.last_name].filter(Boolean).join(' ')||window.casegoProfile?.email||'signed-in user')+'</p><p class="record-error" data-status role="status"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary">Add Communication</button></div>';
 d.body.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>d.close();form.oninput=()=>{d.dirty=true;};
 form.onsubmit=async ev=>{ev.preventDefault();if(d.busy||!form.reportValidity())return;d.busy=true;try{const fd=new FormData(form),payload={firm_id:firm(),client_id:context.clientId||null,case_id:context.caseId||null,communication_type:val(fd,'communication_type'),direction:val(fd,'direction'),subject:val(fd,'subject')||null,body:val(fd,'body'),occurred_at:new Date(val(fd,'occurred_at')).toISOString(),created_by:window.casegoProfile.id};if(!payload.body)throw new Error('Enter the communication details.');const {error}=await sb().from('communications').insert(payload);if(error)throw error;d.dirty=false;d.busy=false;d.close(true);await done();}catch(e){feedback(form,errorText(e));}finally{d.busy=false;}};
}
async function activityRows(scope){
 const clause=q=>scope.caseId?q.eq('case_id',scope.caseId):q.eq('client_id',scope.clientId);
 const [tasks,notes,communications,expenses,profiles]=await Promise.all([
  R.list('tasks',q=>clause(q).order('created_at',{ascending:false}).order('id')),
  R.list('notes',q=>clause(q).order('created_at',{ascending:false}).order('id')),
  R.list('communications',q=>clause(q).order('occurred_at',{ascending:false}).order('id')),
  R.list('expenses',q=>clause(q).order('created_at',{ascending:false}).order('id')),
  R.list('profiles',q=>q.order('id'))
 ]);
 const people=Object.fromEntries(profiles.map(p=>[p.id,p]));
 return {task:tasks,note:notes,communication:communications,expense:expenses,people};
}
function activityRowHTML(kind,row,people){
 if(kind==='task')return '<strong>'+esc(row.title||'Task')+'</strong><span>'+esc(row.status||'open')+(row.due_at?' · '+esc(shortDate(row.due_at)):'')+'</span>';
 if(kind==='note')return '<strong>'+esc(row.title||'Note')+'</strong><span>'+esc(shortDate(row.created_at))+' · '+esc(row.body||'')+'</span>';
 if(kind==='communication')return '<strong>'+esc(communicationMethod(row.communication_type))+'</strong><span>'+esc(shortDate(row.occurred_at,true))+' · '+esc(personLabel(people[row.created_by]))+'</span><small>'+esc(row.body||row.subject||'')+'</small>';
 return '<strong>'+esc(row.description||row.category||'Expense')+'</strong><span>'+esc(shortDate(row.expense_date))+' · '+esc(money(row.amount))+'</span>';
}
async function showAllActivity(kind,rows,people){
 const d=modal(activityLabels[kind]);
 d.body.innerHTML='<div class="activity-full-list">'+(rows.map(row=>'<article class="activity-row">'+activityRowHTML(kind,row,people)+'</article>').join('')||'<p class="empty">No records.</p>')+'</div>';
}
async function renderActivityGrid(scope){
 const host=$('recordActivityGrid');if(!host)return;const data=await activityRows(scope);
 for(const kind of ['task','note','communication','expense']){
  const card=host.querySelector('[data-activity="'+kind+'"]'),list=card.querySelector('[data-activity-list]'),rows=data[kind];
  list.innerHTML=rows.slice(0,3).map(row=>'<article class="activity-row">'+activityRowHTML(kind,row,data.people)+'</article>').join('')||'<p class="activity-empty">No '+activityLabels[kind].toLowerCase()+' recorded.</p>';
  card.querySelector('[data-add-new]').onclick=()=>kind==='communication'?openCommunication(scope,()=>renderActivityGrid(scope)):openRelatedCreate(kind,scope,()=>renderActivityGrid(scope));
  card.querySelector('[data-view-all]').onclick=()=>showAllActivity(kind,rows,data.people);
 }
}
function activityGridHTML(){return '<section class="record-activity-grid" id="recordActivityGrid">'+['task','note','communication','expense'].map(kind=>'<article class="activity-card" data-activity="'+kind+'"><header><strong>'+activityLabels[kind]+'</strong><button type="button" data-add-new>＋ ADD NEW</button></header><div data-activity-list></div><button type="button" class="activity-view-all" data-view-all>VIEW ALL →</button></article>').join('')+'</section>';}
function profileFormLayout(form,kind){
 form.classList.add('profile-compact-form');
 const common=form.querySelector('.form-grid-3');common.classList.add('profile-common-grid');
 for(const key of ['ssn','ein']){const input=form.elements[key];if(!input)continue;const box=input.closest('.field'),button=form.querySelector('[data-reveal="'+key+'"]');box.dataset.profileKind=key==='ssn'?'individual':'organization';button.dataset.profileKind=box.dataset.profileKind;common.append(box,button);}
 const sync=()=>common.querySelectorAll('[data-profile-kind]').forEach(x=>x.hidden=x.dataset.profileKind!==form.elements.client_type.value);
 form.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>setTimeout(sync)));sync();
}
async function clientPageV069(){
 const id=new URLSearchParams(location.search).get('id'),content=document.querySelector('.content');
 const {data:c,error}=await sb().from('clients').select('*').eq('id',id).eq('firm_id',firm()).single();if(error)throw error;
 const phones=await R.list('client_phones',q=>q.eq('client_id',id).order('created_at').order('id'));
 content.classList.add('record-workspace');content.innerHTML='<div class="record-page-head"><div><h1 id="clientName"></h1><p id="clientMeta"></p></div><div class="actions" id="clientActions"><a class="btn btn-primary" id="clientAddCase">＋ Add Case</a></div></div><div class="client-overview-grid"><section class="form-card record-information-card" id="clientEditorMount"></section><aside class="panel active-cases-card"><div class="panel-head"><span>ACTIVE CASES <b id="activeCaseCount"></b></span><a id="allClientCases">View All Cases</a></div><div id="activeCaseCards"></div></aside></div>'+activityGridHTML();
 $('clientName').textContent=name(c);$('clientMeta').textContent=(c.client_type==='organization'?'Organization':'Individual')+' · '+c.status;
 const form=clientForm(c,phones,false);profileFormLayout(form,c.client_type);$('clientEditorMount').replaceChildren(form);
 const canEdit=await R.can('clients.edit');if(!canEdit)form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);else wireClientForm(form,{id,isNew:false},saved=>{Object.assign(c,saved.payload);$('clientName').textContent=name(c);feedback(form,'Client and phones saved.');},()=>location.href='clients.html');
 const report=()=>snapshot(name(c),[{title:'Client',rows:Object.entries(c).filter(([k])=>!k.endsWith('_id')).map(([k,v])=>[k.replaceAll('_',' '),v])}]);toolbar($('clientActions'),report,{save:canEdit?()=>form.requestSubmit():null});$('clientAddCase').href='add-case.html?clientId='+encodeURIComponent(id);await R.recordGear($('clientActions'),'client',c,()=>location.href='clients.html');
 const [cases,events]=await Promise.all([R.list('cases',q=>q.eq('client_id',id).order('created_at',{ascending:false}).order('id')),R.list('calendar_events',q=>q.eq('client_id',id).order('start_at').order('id'))]);const active=cases.filter(x=>x.case_status!=='closed');$('activeCaseCount').textContent='('+active.length+')';$('allClientCases').href='cases.html';
 $('activeCaseCards').innerHTML=active.slice(0,3).map(x=>{const next=events.find(e=>e.case_id===x.id&&!e.completed_at&&new Date(e.start_at)>=new Date());return '<a class="active-case-row" href="case-detail.html?id='+x.id+'"><span class="case-state '+esc(x.case_status)+'">'+esc(x.case_status)+'</span><strong>'+esc([x.case_type,x.title].filter(Boolean).join(' · '))+'</strong><small>'+esc(x.case_number||'No case number')+'</small>'+(next?'<em>Next: '+esc(shortDate(next.start_at,true))+'</em>':'')+'</a>';}).join('')||'<p class="empty">No active cases.</p>';
 await renderActivityGrid({clientId:id});
}
async function openEventCreate(caseRecord,type,done){
 const label=type==='court'?'Court Date':'Appointment',d=modal('Add '+label),form=document.createElement('form'),draftId=crypto.randomUUID();
 form.innerHTML='<div class="form-grid">'+field('Date','date','','date',true)+field('Time','time','','time',true)+'</div>'+field(type==='court'?'Hearing Type':'Appointment Type','title','','text',true)+area('Notes','comments')+'<p class="record-error" data-status></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary">Add '+label+'</button></div>';d.body.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>d.close();
 form.onsubmit=async ev=>{ev.preventDefault();try{const fd=new FormData(form);fd.set('type',type);await R.saveEvent(null,fd,{caseId:caseRecord.id,clientId:caseRecord.client_id,draftId});d.close(true);await done();}catch(e){feedback(form,errorText(e));}};
}
async function renderCompactEvents(c){
 const events=await R.caseEvents(c.id),can=await R.can('calendar.manage');
 for(const type of ['court','appointment']){const list=$('compact'+(type==='court'?'Court':'Appointment')+'List'),rows=events.filter(e=>(e.event_type==='legal_deadline'?'appointment':e.event_type)===type).sort((a,b)=>new Date(b.start_at)-new Date(a.start_at));list.innerHTML=rows.slice(0,3).map(e=>'<article class="compact-event-row"><span class="event-date-tab">'+esc(new Date(e.start_at).toLocaleString('en-US',{month:'short'}).toUpperCase())+'<b>'+new Date(e.start_at).getDate()+'</b></span><span><strong>'+esc(e.title||type)+'</strong><small>'+esc(R.eventLabel(e))+'</small></span><em class="'+(e.completed_at?'completed':'upcoming')+'">'+(e.completed_at?'Completed':'Upcoming')+'</em></article>').join('')||'<p class="activity-empty">No '+type+' dates.</p>';const add=$('add'+(type==='court'?'Court':'Appointment'));add.hidden=!can;add.onclick=()=>openEventCreate(c,type,()=>renderCompactEvents(c));$('view'+(type==='court'?'Court':'Appointment')+'All').onclick=()=>{const d=modal(type==='court'?'Court Dates':'Appointments');dateHistory(d.body,c,type);};}
}
function caseStatusClass(s){return ['active','pending','closed'].includes(s)?s:'pending';}
async function casePageV069(){
 const id=new URLSearchParams(location.search).get('id'),content=document.querySelector('.content');
 const {data:c,error}=await sb().from('cases').select('*').eq('id',id).eq('firm_id',firm()).single();if(error)throw error;
 const {data:client,error:ce}=await sb().from('clients').select('*').eq('id',c.client_id).eq('firm_id',firm()).single();if(ce)throw ce;
 content.classList.add('record-workspace');content.innerHTML='<div class="record-page-head"><div><h1><a class="case-client-link" href="client-profile.html?id='+encodeURIComponent(client.id)+'">'+esc(name(client))+'</a></h1><p>'+esc([c.case_type,c.title,c.case_number].filter(Boolean).join(' · '))+'</p></div><div class="case-head-actions"><select id="caseStatusHeader" class="status-select '+caseStatusClass(c.case_status)+'"><option value="active">● Active</option><option value="pending">● Pending</option><option value="closed">● Closed</option></select><div class="actions" id="caseActions"></div></div></div><div class="case-overview-grid"><div><form class="record-section-card" id="compactCaseForm"><header>CASE DETAILS</header><div class="record-form-body"><div class="form-grid-3">'+select('Case Type','caseType',['Criminal','Civil','Family','Injury','Other'],c.case_type)+field('Subtype','subCaseType',c.title)+field('Case Number','caseNumber',c.case_number)+'</div><div class="form-grid-3">'+field('Court','courtName',c.court_name)+field('Judge','judgeName',c.judge_name)+field('Opened','openedDate',c.opened_date,'date')+'</div></div></form><section class="record-section-card"><header>PARTIES</header><div class="record-form-body parties-grid"><label class="field">Client<a class="linked-field" href="client-profile.html?id='+encodeURIComponent(client.id)+'">'+esc(name(client))+'</a></label>'+field('Prosecutor','prosecutorName',c.prosecutor_name)+field('Opposing Counsel','opposingCounselName',c.opposing_counsel_name)+field('Co-Counsel','coCounselName',c.co_counsel_name)+'</div></section><section class="record-section-card"><header>BILLING</header><div class="record-form-body form-grid-3">'+select('Billing Type','billingType',[['flat_fee','Flat Fee'],['hourly','Hourly'],['hybrid','Hybrid'],['no_charge','No Charge / Pro Bono']],c.billing_type||'flat_fee')+field('Flat Fee / Base Fee','flatFeeAmount',c.flat_fee_amount??'','number')+field('Hourly Rate','caseHourlyRate',c.hourly_rate??'','number')+'</div></section><details class="record-additional"><summary>Additional Case Information</summary><div class="record-form-body">'+area('Case Notes','caseNotes',c.description)+'</div></details><p class="record-error" id="caseSaveStatus"></p></div><aside><section class="record-section-card"><header><span>COURT DATES</span><button type="button" id="addCourt">＋ ADD NEW</button></header><div id="compactCourtList"></div><button type="button" class="activity-view-all" id="viewCourtAll">VIEW ALL COURT DATES →</button></section><section class="record-section-card"><header><span>APPOINTMENTS</span><button type="button" id="addAppointment">＋ ADD NEW</button></header><div id="compactAppointmentList"></div><button type="button" class="activity-view-all" id="viewAppointmentAll">VIEW ALL APPOINTMENTS →</button></section></aside></div>'+activityGridHTML();
 const form=$('compactCaseForm'),canEdit=await R.can('cases.edit'),status=$('caseStatusHeader');status.value=c.case_status;const report=async()=>snapshot(name(client)+' — '+(c.case_number||c.case_type),[{title:'Case Information',rows:[['Client',name(client)],['Case type',c.case_type],['Matter',c.title],['Status',c.case_status],['Court',c.court_name],['Judge',c.judge_name]]}]);toolbar($('caseActions'),report,{save:canEdit?()=>form.requestSubmit():null});await R.recordGear($('caseActions'),'case',c,()=>location.href='client-profile.html?id='+c.client_id);
 const prosecutorField=content.querySelector('[name="prosecutorName"]').closest('.field'),syncCaseFields=()=>{prosecutorField.hidden=content.querySelector('[name="caseType"]').value!=='Criminal';};content.querySelector('[name="caseType"]').addEventListener('change',syncCaseFields);syncCaseFields();
 if(!canEdit)content.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=true);const save=async()=>{if(!canEdit)return;const fd=new FormData();content.querySelectorAll('[name]').forEach(x=>fd.set(x.name,x.value));const num=k=>val(fd,k)===''?null:Number(val(fd,k)),payload={case_type:val(fd,'caseType'),title:val(fd,'subCaseType')||val(fd,'caseType'),case_number:val(fd,'caseNumber')||null,case_status:status.value,court_name:val(fd,'courtName')||null,judge_name:val(fd,'judgeName')||null,opened_date:val(fd,'openedDate')||null,prosecutor_name:val(fd,'prosecutorName')||null,opposing_counsel_name:val(fd,'opposingCounselName')||null,co_counsel_name:val(fd,'coCounselName')||null,billing_type:val(fd,'billingType'),flat_fee_amount:num('flatFeeAmount'),hourly_rate:num('caseHourlyRate'),description:val(fd,'caseNotes')||null};const {data,error}=await sb().from('cases').update(payload).eq('id',id).eq('firm_id',firm()).select('id');if(error)throw error;if(data?.length!==1)throw new Error('Case was not updated.');Object.assign(c,payload);$('caseSaveStatus').textContent='Case saved.';status.className='status-select '+caseStatusClass(c.case_status);};form.onsubmit=ev=>{ev.preventDefault();save().catch(e=>$('caseSaveStatus').textContent=errorText(e));};status.onchange=()=>save().catch(e=>window.alert(errorText(e)));
 await Promise.all([renderCompactEvents(c),renderActivityGrid({clientId:c.client_id,caseId:c.id})]);
}
function taskStatusLabel(value){return ({open:'Open',in_progress:'In Progress',completed:'Completed',cancelled:'Cancelled'})[value]||'Open';}
function taskPriorityLabel(value){return ({low:'Low',normal:'Normal',high:'High',urgent:'Urgent'})[value]||'Normal';}
function taskDue(value){return value?shortDate(value,true):'No due date';}
async function taskReferences(){const [clients,cases,people]=await Promise.all([R.list('clients',q=>q.order('organization_name').order('last_name')),R.list('cases',q=>q.order('created_at',{ascending:false})),R.list('profiles',q=>q.eq('firm_id',firm()).order('last_name').order('first_name'))]);return {clients,cases,people};}
function taskOptions(rows,selected,formatter){return '<option value="">— None —</option>'+rows.map(row=>'<option value="'+esc(row.id)+'"'+(row.id===selected?' selected':'')+'>'+esc(formatter(row))+'</option>').join('');}
async function openTaskCreate(context={},done=()=>tasksPageV070(),existing=null){
 if(!await R.can('tasks.manage')){window.alert('Your role cannot manage tasks.');return;}const ref=await taskReferences(),d=modal(existing?'Edit Task':'Add Task'),form=document.createElement('form'),task=existing||{};const local=task.due_at?new Date(new Date(task.due_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
 form.innerHTML='<div class="form-grid-2">'+field('Task title','title',task.title||'','text',true)+select('Priority','priority',[['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']],task.priority||'normal')+'</div>'+area('Description','description',task.description||'')+'<div class="form-grid-3">'+select('Status','status',[['open','Open'],['in_progress','In Progress'],['completed','Completed'],['cancelled','Cancelled']],task.status||'open')+select('Task type','task_type',[['','General'],['filing','Filing'],['call','Call'],['meeting','Meeting'],['research','Research'],['document','Document'],['follow_up','Follow-up']],task.task_type||'')+field('Due date & time','due_at',local,'datetime-local')+'</div><div class="form-grid-2"><label class="field">Client<select name="client_id">'+taskOptions(ref.clients,task.client_id,name)+'</select></label><label class="field">Assigned to<select name="assigned_to">'+taskOptions(ref.people,task.assigned_to,p=>name(p))+'</select></label></div><label class="field">Case<select name="case_id"><option value="">— None —</option></select></label><p class="sub">Created by '+esc(name(window.casegoProfile))+(task.completed_at?' · Completed '+esc(shortDate(task.completed_at,true)):'')+'</p><p class="record-error" data-status role="status"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary">'+(existing?'Save Task':'Add Task')+'</button></div>';d.body.appendChild(form);const clientSelect=form.elements.client_id,caseSelect=form.elements.case_id;const syncCases=()=>{const filtered=ref.cases.filter(c=>!clientSelect.value||c.client_id===clientSelect.value);caseSelect.innerHTML=taskOptions(filtered,task.case_id,c=>[c.case_number,c.case_type,c.title].filter(Boolean).join(' · '));};syncCases();if(context.clientId)clientSelect.value=context.clientId;if(context.caseId){syncCases();caseSelect.value=context.caseId;}clientSelect.onchange=syncCases;form.querySelector('[data-cancel]').onclick=()=>d.close();form.oninput=()=>d.dirty=true;
 form.onsubmit=async ev=>{ev.preventDefault();if(d.busy||!form.reportValidity())return;d.busy=true;try{const fd=new FormData(form),status=val(fd,'status'),payload={firm_id:firm(),title:val(fd,'title'),description:val(fd,'description')||null,priority:val(fd,'priority'),task_type:val(fd,'task_type')||null,status,client_id:val(fd,'client_id')||null,case_id:val(fd,'case_id')||null,assigned_to:val(fd,'assigned_to')||null,due_at:val(fd,'due_at')?new Date(val(fd,'due_at')).toISOString():null};if(!existing)payload.created_by=window.casegoProfile.id;if(status==='completed'&&!existing)throw new Error('Create the task first, then complete it so CaseGO can record who completed it.');let error;if(existing)({error}=await sb().from('tasks').update(payload).eq('id',existing.id).eq('firm_id',firm()));else({error}=await sb().from('tasks').insert(payload));if(error)throw error;d.dirty=false;d.close(true);await done();}catch(e){feedback(form,errorText(e));}finally{d.busy=false;}};
}
async function completeTask(task,done){const d=modal('Complete Task'),form=document.createElement('form');form.innerHTML='<p>Mark <strong>'+esc(task.title)+'</strong> complete?</p>'+area('Completion note (optional)','completion_note',task.completion_note||'')+'<p class="record-error" data-status role="status"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary">✓ Complete Task</button></div>';d.body.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>d.close();form.onsubmit=async ev=>{ev.preventDefault();try{const {error}=await sb().rpc('complete_casego_task',{task_id:task.id,completion_note_input:val(new FormData(form),'completion_note')||null});if(error)throw error;d.close(true);await done();}catch(e){feedback(form,errorText(e));}};}
async function tasksPageV070(){
 const content=document.querySelector('.content');if(!content)return;content.classList.add('tasks-workspace');content.innerHTML='<div class="record-page-head"><div><h1>Tasks</h1><p>Plan, assign, and complete firm work.</p></div><div class="actions"><button class="btn btn-primary" id="newTaskButton">＋ Add New</button></div></div><section class="task-kpis" id="taskKpis"></section><section class="task-filter-panel"><input id="taskSearch" placeholder="Search tasks…"><select id="taskStatusFilter"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select id="taskAssignmentFilter"><option value="all">Everyone</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select><select id="taskPriorityFilter"><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select><select id="taskSort"><option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="newest">Sort: newest</option></select></section><section class="panel task-list-panel"><div class="panel-head"><span>FIRM TASKS</span><span id="taskCount" class="sub"></span></div><div id="taskList" class="task-list"></div></section>';
 const refs=await taskReferences(),byId=Object.fromEntries(refs.people.map(p=>[p.id,p])),clientById=Object.fromEntries(refs.clients.map(c=>[c.id,c])),caseById=Object.fromEntries(refs.cases.map(c=>[c.id,c]));let all=[];const display=async()=>{all=await R.list('tasks',q=>q.order('due_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false}));const search=$('taskSearch').value.trim().toLowerCase(),sf=$('taskStatusFilter').value,af=$('taskAssignmentFilter').value,pf=$('taskPriorityFilter').value,sort=$('taskSort').value;let visible=all.filter(t=>{const text=[t.title,t.description,clientById[t.client_id]&&name(clientById[t.client_id]),caseById[t.case_id]?.case_number].join(' ').toLowerCase();return(!search||text.includes(search))&&(sf==='all'||t.status===sf)&&(pf==='all'||t.priority===pf)&&(af==='all'||(af==='mine'?t.assigned_to===window.casegoProfile.id:!t.assigned_to));});const rank={urgent:0,high:1,normal:2,low:3};visible.sort((a,b)=>sort==='priority'?rank[a.priority]-rank[b.priority]:sort==='newest'?new Date(b.created_at)-new Date(a.created_at):new Date(a.due_at||'2999-01-01')-new Date(b.due_at||'2999-01-01'));const open=all.filter(t=>!['completed','cancelled'].includes(t.status)),today=new Date();today.setHours(23,59,59,999);const overdue=open.filter(t=>t.due_at&&new Date(t.due_at)<new Date()).length;$('taskKpis').innerHTML=[['Open',open.length,'blue'],['Due today',open.filter(t=>t.due_at&&new Date(t.due_at)<=today).length,'orange'],['Overdue',overdue,'red'],['Completed',all.filter(t=>t.status==='completed').length,'green']].map(x=>'<article class="task-kpi '+x[2]+'"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></article>').join('');$('taskCount').textContent=visible.length+' shown';$('taskList').innerHTML=visible.map(t=>{const client=clientById[t.client_id],matter=caseById[t.case_id],who=byId[t.assigned_to];return '<article class="task-row"><button class="task-check '+(t.status==='completed'?'done':'')+'" data-complete="'+t.id+'" title="Complete task">'+(t.status==='completed'?'✓':'')+'</button><div class="task-row-main"><strong>'+esc(t.title)+'</strong><span>'+esc(t.description||'')+'</span><small>'+esc(taskDue(t.due_at))+(who?' · '+esc(name(who)):' · Unassigned')+(t.completed_at?' · Completed by '+esc(name(byId[t.completed_by])):'')+'</small></div><div class="task-row-links">'+(client?'<a href="client-profile.html?id='+client.id+'">'+esc(name(client))+'</a>':'')+(matter?'<a href="case-detail.html?id='+matter.id+'">'+esc(matter.case_number||matter.case_type||'Case')+'</a>':'')+'</div><span class="task-pill '+esc(t.priority)+'">'+esc(taskPriorityLabel(t.priority))+'</span><span class="task-status '+esc(t.status)+'">'+esc(taskStatusLabel(t.status))+'</span><button class="btn btn-secondary btn-small" data-edit="'+t.id+'">Edit</button></article>';}).join('')||'<p class="empty">No tasks match these filters.</p>';content.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openTaskCreate({},display,all.find(t=>t.id===b.dataset.edit)));content.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>{const t=all.find(x=>x.id===b.dataset.complete);if(t.status==='completed')return openTaskCreate({},display,t);completeTask(t,display);});};$('newTaskButton').onclick=()=>openTaskCreate({},display);['taskSearch','taskStatusFilter','taskAssignmentFilter','taskPriorityFilter','taskSort'].forEach(id=>$(id).addEventListener(id==='taskSearch'?'input':'change',display));await display();
}
function init(){
 document.querySelectorAll('a[href="add-client.html"]').forEach(a=>a.onclick=e=>{e.preventDefault();openIntake();});
 document.querySelectorAll('a[href="add-case.html"]').forEach(a=>a.onclick=e=>{e.preventDefault();openCaseChooser();});
 const topbar=document.querySelector('.topbar');
 if(topbar&&!document.querySelector('.casego-menu-toggle')){
  const button=document.createElement('button');button.type='button';button.className='casego-menu-toggle';button.setAttribute('aria-label','Open navigation');button.textContent='☰';
  button.onclick=()=>{const open=document.body.classList.toggle('casego-menu-open');button.textContent=open?'×':'☰';button.setAttribute('aria-label',open?'Close navigation':'Open navigation');};
  topbar.appendChild(button);
 }
}
window.CaseGOWorkspace={openIntake,openCaseChooser,intakePage,clientPage:clientPageV069,casePage:casePageV069,tasksPage:tasksPageV070,openTaskCreate, dashboard,billingPage,init,clientForm,readClient,persistClient,dateHistory,completeCourt,toolbar};
R.openIntake=openIntake;
})();
