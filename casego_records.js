/* CaseGO v0.6.3: shared calendar records, dates and record actions.
   Uses the established calendar_events table and existing authenticated RLS. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb=()=>window.casegoSupabase;
const firm=()=>{
 const id=window.CaseGOAuth?.effectiveFirmId?.();
 if(!id)throw new Error('Choose a firm or sign in again.');
 return id;
};
let zone='America/New_York',zoneReady,calendarState;
const permissions=new Map();
function validZone(value){try{if(!value)return false;new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;}catch(_){return false;}}
async function timezone(){
 if(!zoneReady)zoneReady=(async()=>{
  const personal=window.casegoProfile?.timezone;
  if(validZone(personal)){zone=personal;return zone;}
  const {data,error}=await sb().from('firm_settings').select('timezone').eq('firm_id',firm()).maybeSingle();
  if(!error&&validZone(data?.timezone))zone=data.timezone;
  return zone;
 })();
 return zoneReady;
}
async function can(permission){
 if(!permissions.has(permission))permissions.set(permission,(async()=>{
  const {data,error}=await sb().rpc('has_casego_permission',{requested_permission:permission});
  if(error)throw error;
  return data===true;
 })());
 return permissions.get(permission);
}
function parts(timestamp,timeZone=zone){
 const result={};
 for(const part of new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp)))
  if(part.type!=='literal')result[part.type]=part.value;
 return {date:result.year+'-'+result.month+'-'+result.day,time:result.hour+':'+result.minute,second:result.second};
}
function timestamp(date,time='',timeZone=zone){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Enter a valid date.');
 const parsed=new Date(date+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new Error('Enter a valid date.');
 if(!time)return date+'T00:00:00.000Z'; // Date-only events keep their calendar date in every zone.
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Enter a valid time.');
 const desired=Date.parse(date+'T'+time+':00Z');
 let value=desired;
 for(let i=0;i<4;i++){
  const shown=parts(value,timeZone);
  const difference=desired-Date.parse(shown.date+'T'+shown.time+':'+shown.second+'Z');
  if(!difference)return new Date(value).toISOString();
  value+=difference;
 }
 throw new Error('That local time does not exist because the clocks change. Choose a different time.');
}
function eventParts(event){return event.all_day?{date:new Date(event.start_at).toISOString().slice(0,10),time:''}:parts(event.start_at);}
function dateLabel(date){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
function eventLabel(event){
 const p=eventParts(event);
 return dateLabel(p.date)+(p.time?' · '+new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone}).format(new Date(event.start_at)):' · Date only');
}
function typeLabel(type){return {court:'Court',legal_deadline:'Legal deadline',appointment:'Appointment',meeting:'Meeting',reminder:'Reminder',other:'Other',task:'Task'}[type]||type;}
function comments(event){
 // v0.6.2 stored date comments in title; keep displaying those existing records.
 return event.description??(['court','legal_deadline'].includes(event.event_type)&&!['Court Date','Legal Deadline'].includes(event.title)?event.title:'')??'';
}
async function list(table,build=q=>q){
 let out=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await build(sb().from(table).select('*').eq('firm_id',firm())).range(offset,offset+999);
  if(error)throw error;
  out.push(...(data||[]));
  if(!data||data.length<1000)return out;
 }
}
function caseDrafts(fd,clientId,caseId){
 const events=[];
 for(const [type,dateField,timeField,noteField,title] of [
  ['court','nextCourtDate','courtTime','nextCourtDateNote','Court Date'],
  ['legal_deadline','nextLegalDate','legalTime','nextLegalDateNote','Legal Deadline']
 ]){
  const date=String(fd.get(dateField)||''),time=String(fd.get(timeField)||''),note=String(fd.get(noteField)||'').trim();
  if(!date){if(time||note)throw new Error('Enter the '+typeLabel(type).toLowerCase()+' date for its time/comments.');continue;}
  events.push({id:window.crypto.randomUUID(),firm_id:firm(),client_id:clientId,case_id:caseId,event_type:type,
   title,description:note||null,start_at:timestamp(date,time),all_day:!time,created_by:window.casegoProfile.id});
 }
 return events;
}
function message(container,error){
 const p=document.createElement('p');p.className='record-error';p.setAttribute('role','alert');
 p.textContent=error.message||String(error);container.replaceChildren(p);
}
function dialog(title){
 const el=document.createElement('dialog');el.className='record-dialog';
 el.innerHTML='<h2>'+esc(title)+'</h2><div class="dialog-content"></div>';
 document.body.appendChild(el);
 const previous=document.activeElement;
 const close=()=>{el.close();el.remove();previous?.focus?.();};
 el.addEventListener('cancel',e=>{e.preventDefault();if(el.dataset.busy!=='true')close();});
 el.showModal();
 return {el,body:el.querySelector('.dialog-content'),close};
}
async function confirmDelete(kind,name,action){
 const modal=dialog('Delete '+kind+'?');
 modal.body.innerHTML='<p>Delete <strong>'+esc(name)+'</strong> permanently?</p><p>'+
  (kind==='client'?'This also deletes the client’s linked cases and calendar dates. ':kind==='case'?'The client will remain. ':'')+
  'This cannot be undone.</p><p class="record-error" role="alert"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button type="button" class="btn btn-danger" data-delete>Delete '+esc(kind)+'</button></div>';
 modal.body.querySelector('[data-cancel]').onclick=modal.close;
 const button=modal.body.querySelector('[data-delete]');
 button.onclick=async()=>{
  button.disabled=true;modal.body.querySelector('[data-cancel]').disabled=true;modal.el.dataset.busy='true';
  const prevent=e=>e.preventDefault();modal.el.addEventListener('cancel',prevent);
  try{await action();modal.close();}
  catch(error){modal.body.querySelector('[role="alert"]').textContent=error.message;button.disabled=false;modal.body.querySelector('[data-cancel]').disabled=false;}
  finally{modal.el.dataset.busy='false';modal.el.removeEventListener('cancel',prevent);}
 };
 modal.body.querySelector('[data-cancel]').focus();
}
async function deleteRecord(table,id){
 const {data,error}=await sb().from(table).delete().eq('id',id).eq('firm_id',firm()).select('id');
 if(error)throw error;
 if(data?.length!==1)throw new Error('Nothing was deleted. The record may have changed or your permission may have been removed.');
}
async function recordGear(container,kind,record,done){
 if(!container||!await can(kind==='client'?'clients.delete':'cases.delete'))return;
 const wrap=document.createElement('div');wrap.className='record-gear';
 const label=kind==='client'?[record.first_name,record.last_name].filter(Boolean).join(' ')||record.organization_name||'Client':record.title||record.case_type||'Case';
 wrap.innerHTML='<button type="button" class="btn btn-secondary gear-toggle" aria-label="'+esc(kind)+' settings" aria-expanded="false" title="'+esc(kind)+' settings">⚙</button><div class="record-menu" hidden><button type="button" class="delete-menu-action">Delete '+esc(kind)+'</button></div>';
 const toggle=wrap.querySelector('.gear-toggle'),menu=wrap.querySelector('.record-menu');
 const hide=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){hide();toggle.focus();}});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))hide();});
 menu.querySelector('button').onclick=()=>{hide();confirmDelete(kind,label,async()=>{await deleteRecord(kind==='client'?'clients':'cases',record.id);await done();});};
 container.appendChild(wrap);
}
async function caseEvents(caseId){await timezone();return list('calendar_events',q=>q.eq('case_id',caseId).order('start_at').order('id'));}
async function saveEvent(original,fd,context={}){
 const date=String(fd.get('date')||''),time=String(fd.get('time')||'');
 const start=timestamp(date,time);
 const type=String(fd.get('type')||original?.event_type||'appointment');
 if(!['court','legal_deadline','appointment','meeting','reminder','other'].includes(type))throw new Error('Choose an event type.');
 const id=original?.id||context.draftId||window.crypto.randomUUID();
 const payload={event_type:type,title:String(fd.get('title')||'').trim()||typeLabel(type),
  description:String(fd.get('comments')||'').trim()||null,start_at:start,all_day:!time};
 if(original?.end_at){
  const duration=Math.max(0,new Date(original.end_at)-new Date(original.start_at));
  payload.end_at=time?new Date(new Date(start).getTime()+duration).toISOString():null;
 }
 if(original?.id){
  const {data,error}=await sb().from('calendar_events').update(payload).eq('id',id).eq('firm_id',firm()).select('id');
  if(error)throw error;
  if(data?.length!==1)throw new Error('The date could not be updated. Reload and check your access.');
 }else{
  const {error}=await sb().from('calendar_events').insert({...payload,id,firm_id:firm(),
   client_id:context.clientId||null,case_id:context.caseId||null,created_by:window.casegoProfile.id});
  if(error)throw error;
 }
 return id;
}
function dateFormHTML(event,initial={}){
 const p=event?.start_at?eventParts(event):{date:initial.date||parts(Date.now()).date,time:''};
 const type=event?.event_type||initial.type||'appointment';
 return '<div class="form-grid"><div class="field"><label>Type<select name="type">'+
  ['court','legal_deadline','appointment','meeting','reminder','other'].map(t=>'<option value="'+t+'" '+(t===type?'selected':'')+'>'+typeLabel(t)+'</option>').join('')+
  '</select></label></div><div class="field"><label>Title<input name="title" value="'+esc(event?.title||initial.title||typeLabel(type))+'" required maxlength="250"></label></div></div>'+
  '<div class="case-date-row court-date-row"><div class="field"><label>Date<input name="date" type="date" required value="'+p.date+'"></label></div>'+
  '<div class="field"><label>Time<input name="time" type="time" value="'+p.time+'"></label></div>'+
  '<div class="field"><label>Comments<input name="comments" value="'+esc(event?comments(event):'')+'"></label></div></div>'+
  '<p class="sub">Times: '+esc(zone)+'. Leave time blank for a date-only event.</p>';
}
async function editEvent(event,context={},done=async()=>{}){
 const modal=dialog(event?.id?'Edit date':'Add date');
 const form=document.createElement('form');
 const draftId=window.crypto.randomUUID();
 form.innerHTML=dateFormHTML(event,context)+'<p class="record-error" role="alert"></p><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button type="submit" class="btn btn-primary">Save Date</button></div>';
 modal.body.appendChild(form);
 form.querySelector('[data-cancel]').onclick=modal.close;
 let busy=false,committed=false;
 form.onsubmit=async e=>{
  e.preventDefault();if(busy||committed)return;busy=true;
  const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);modal.el.dataset.busy='true';
  const prevent=e=>e.preventDefault();modal.el.addEventListener('cancel',prevent);
  try{await saveEvent(event,new FormData(form),{...context,draftId});committed=true;await done();modal.close();}
  catch(error){
   form.querySelector('[role="alert"]').textContent=(committed?'Date saved, but the page could not refresh. Close and reload. ':'')+error.message;
   // Reuse draftId on retry, so an uncertain request cannot duplicate an event.
   if(error.code==='23505'){committed=true;form.querySelector('[role="alert"]').textContent='This date was already saved. Close and reload to see it.';}
  }finally{
   busy=false;modal.el.dataset.busy='false';buttons.forEach(b=>b.disabled=committed&&b.type==='submit');modal.el.removeEventListener('cancel',prevent);
  }
 };
 form.querySelector('[name="date"]').focus();
}
function eventCard(event,caseMap={},clientMap={}){
 const c=caseMap[event.case_id],client=clientMap[event.client_id];
 const links=(c?'<a class="link" href="case-detail.html?id='+encodeURIComponent(c.id)+'">'+esc(c.title||c.case_type)+'</a>':'')+
  (client?' · <a class="link" href="client-profile.html?id='+encodeURIComponent(client.id)+'">'+esc([client.first_name,client.last_name].filter(Boolean).join(' ')||client.organization_name||'Client')+'</a>':'');
 return '<div class="event-heading"><strong>'+esc(event.title||typeLabel(event.event_type))+'</strong><span class="event-kind">'+esc(typeLabel(event.event_type))+'</span></div>'+
  '<p>'+esc(eventLabel(event))+'</p>'+(comments(event)?'<p class="event-comments">'+esc(comments(event))+'</p>':'')+(links?'<p>'+links+'</p>':'');
}
async function caseDates(container,caseRecord){
 await timezone();
 const allowed=await can('calendar.manage');
 let events=await caseEvents(caseRecord.id);
 container.innerHTML='<div class="panel-head"><span>COURT &amp; LEGAL DATES</span><div class="actions" id="caseDateActions"></div></div><div class="panel-body"><p class="sub">Times: '+esc(zone)+'. Dates saved here also appear on Calendar.</p><div id="caseDateList"></div></div>';
 const render=()=>{
  const target=container.querySelector('#caseDateList');target.replaceChildren();
  if(!events.length){target.innerHTML='<div class="empty"><strong>No dates saved for this case.</strong></div>';return;}
  for(const event of events){
   const row=document.createElement('article');row.className='case-date-card';row.innerHTML=eventCard(event);
   if(allowed){
    const actions=document.createElement('div');actions.className='actions';
    const edit=document.createElement('button');edit.type='button';edit.className='btn btn-secondary btn-small';edit.textContent='Edit Date';
    edit.onclick=()=>editEvent(event,{},refresh);
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-secondary btn-small';remove.textContent='Remove Date';
    remove.onclick=()=>confirmDelete('date',event.title,async()=>{await deleteRecord('calendar_events',event.id);await refresh();});
    actions.append(edit,remove);row.appendChild(actions);
   }
   target.appendChild(row);
  }
 };
 const refresh=async()=>{events=await caseEvents(caseRecord.id);render();};
 if(allowed)for(const [type,label] of [['court','＋ Court Date'],['legal_deadline','＋ Legal Date']]){
  const button=document.createElement('button');button.type='button';button.className='btn btn-secondary btn-small';button.textContent=label;
  button.onclick=()=>editEvent(null,{type,caseId:caseRecord.id,clientId:caseRecord.client_id},refresh);
  container.querySelector('#caseDateActions').appendChild(button);
 }
 render();
}
function nextEvent(events,type){
 const today=parts(Date.now()).date;
 return events.filter(e=>e.event_type===type&&eventParts(e).date>=today).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at))[0];
}
function dateCell(event){return event?esc(eventLabel(event))+(comments(event)?'<div class="sub">'+esc(comments(event))+'</div>':''):'—';}
async function clientCaseList(container,clientId){
 await timezone();
 const [cases,events]=await Promise.all([list('cases',q=>q.eq('client_id',clientId).order('created_at',{ascending:false}).order('id')),list('calendar_events',q=>q.eq('client_id',clientId).order('start_at').order('id'))]);
 container.innerHTML=cases.map(c=>{
  const dates=events.filter(e=>e.case_id===c.id);
  return '<tr><td><a class="link" href="case-detail.html?id='+encodeURIComponent(c.id)+'">'+esc(c.title||c.case_type)+'</a></td><td>'+esc(c.case_number||'—')+'</td><td>'+esc(c.case_status)+'</td><td>'+dateCell(nextEvent(dates,'court'))+'</td><td>'+dateCell(nextEvent(dates,'legal_deadline'))+'</td></tr>';
 }).join('')||'<tr><td colspan="5" class="empty">No cases visible for this client.</td></tr>';
}
async function directories(page){
 const [clients,cases]=await Promise.all([list('clients',q=>q.order('id')),list('cases',q=>q.order('created_at',{ascending:false}).order('id'))]);
 const clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
 let query=new URLSearchParams(location.search).get('q')||'',letter='ALL',status='Active';
 const name=c=>[c?.first_name,c?.last_name].filter(Boolean).join(' ')||c?.organization_name||'Unnamed Client';
 const render=()=>{
  if(page==='clients'){
   $('clientsBody').innerHTML=clients.filter(c=>{
    const linked=cases.filter(x=>x.client_id===c.id);
    return (letter==='ALL'||(c.last_name||c.first_name||c.organization_name||'').toUpperCase().startsWith(letter))&&
     (name(c)+' '+(c.email||'')+' '+linked.map(x=>[x.case_number,x.title,x.description].join(' ')).join(' ')).toLowerCase().includes(query.toLowerCase());
   }).map(c=>{
    const linked=cases.filter(x=>x.client_id===c.id);
    return '<tr><td><a class="link" href="client-profile.html?id='+c.id+'">'+esc(name(c))+'</a></td><td>'+esc(c.phone||'—')+'</td><td>'+esc(c.email||'—')+'</td><td>'+
     (linked.map(x=>'<a class="link directory-case" href="case-detail.html?id='+x.id+'">'+esc(x.title||x.case_type)+(x.case_number?' · '+esc(x.case_number):'')+' <span class="sub">('+esc(x.case_status)+')</span></a>').join('')||'No visible cases')+
     '</td><td>'+esc([c.city,c.state].filter(Boolean).join(', ')||'—')+'</td></tr>';
   }).join('')||'<tr><td colspan="5" class="empty">No clients found.</td></tr>';
  }else{
   $('casesBody').innerHTML=cases.filter(c=>(status==='All'||c.case_status?.toLowerCase()===status.toLowerCase())&&
    [name(clientMap[c.client_id]),c.case_type,c.title,c.case_number].join(' ').toLowerCase().includes(query.toLowerCase())).map(c=>
    '<tr><td><a class="link" href="client-profile.html?id='+c.client_id+'">'+esc(name(clientMap[c.client_id]))+'</a></td><td>'+esc(c.case_type)+'</td><td><a class="link" href="case-detail.html?id='+c.id+'">'+esc(c.title||'Open case')+'</a></td><td>'+esc(c.case_number||'—')+'</td><td>'+esc(c.case_status)+'</td></tr>'
   ).join('')||'<tr><td colspan="5" class="empty">No cases found for this filter.</td></tr>';
  }
 };
 const search=$(page==='clients'?'clientSearch':'caseSearch');
 if(search){search.value=query;search.oninput=()=>{query=search.value;render();};}
 document.querySelectorAll(page==='clients'?'[data-letter]':'[data-status]').forEach(button=>button.onclick=()=>{
  if(page==='clients')letter=button.dataset.letter;else status=button.dataset.status;
  document.querySelectorAll(page==='clients'?'[data-letter]':'[data-status]').forEach(x=>x.classList.toggle('active',x===button));render();
 });
 render();
}
async function calendar(){
 await timezone();
 const now=parts(Date.now()).date;
 const [year,month]=now.split('-').map(Number);
 calendarState={year,month:month-1,selected:now,filter:'All',events:[],tasks:[],version:0};
 const state=calendarState;
 const [cases,clients,allowed]=await Promise.all([list('cases',q=>q.order('id')),list('clients',q=>q.order('id')),can('calendar.manage')]);
 const caseMap=Object.fromEntries(cases.map(c=>[c.id,c])),clientMap=Object.fromEntries(clients.map(c=>[c.id,c]));
 $('calendarZone').textContent='Times: '+zone;
 const dateKey=(y,m,d)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);
 function visible(){
  return [...state.events,...state.tasks].filter(e=>state.filter==='All'||({Court:'court',Legal:'legal_deadline',Task:'task',Appointment:'appointment'}[state.filter]===e.event_type));
 }
 function details(){
  const target=$('calendarDetails');target.innerHTML='<h3>'+esc(dateLabel(state.selected))+'</h3>';
  const events=visible().filter(e=>eventParts(e).date===state.selected);
  if(!events.length)target.innerHTML+='<p class="empty">No items for this date and filter.</p>';
  for(const event of events){
   const card=document.createElement('article');card.className='case-date-card';card.innerHTML=eventCard(event,caseMap,clientMap);
   if(event.event_type==='task'){
    const link=document.createElement('a');link.className='link';link.href=event.case_id?'case-detail.html?id='+event.case_id:'tasks.html';link.textContent='Open task';card.appendChild(link);
   }else if(allowed){
    const edit=document.createElement('button');edit.type='button';edit.className='btn btn-secondary btn-small';edit.textContent='Edit Date';edit.onclick=()=>editEvent(event,{},loadMonth);
    const remove=document.createElement('button');remove.type='button';remove.className='btn btn-secondary btn-small';remove.textContent='Remove Date';remove.onclick=()=>confirmDelete('date',event.title,async()=>{await deleteRecord('calendar_events',event.id);await loadMonth();});
    const actions=document.createElement('div');actions.className='actions';actions.append(edit,remove);card.appendChild(actions);
   }
   target.appendChild(card);
  }
 }
 function render(){
  $('calendarTitle').textContent=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(state.year,state.month,1)));
  const wrap=$('calendarWrap');wrap.replaceChildren();
  const grid=document.createElement('div');grid.className='cg-calendar-grid';
  for(const day of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']){const h=document.createElement('div');h.className='cg-weekday';h.textContent=day;grid.appendChild(h);}
  const start=new Date(Date.UTC(state.year,state.month,1)).getUTCDay();
  const count=new Date(Date.UTC(state.year,state.month+1,0)).getUTCDate();
  const items=visible();
  for(let i=0;i<Math.ceil((start+count)/7)*7;i++){
   const day=i-start+1,key=dateKey(state.year,state.month,day);
   const button=document.createElement('button');button.type='button';button.className='cg-calendar-day';
   button.classList.toggle('outside',day<1||day>count);button.classList.toggle('today',key===now);
   button.classList.toggle('selected',key===state.selected);button.setAttribute('aria-pressed',String(key===state.selected));
   const matching=items.filter(e=>eventParts(e).date===key);
   button.setAttribute('aria-label',dateLabel(key)+', '+matching.length+' items');
   button.innerHTML='<span class="cg-day-number">'+Number(key.slice(-2))+'</span>'+matching.slice(0,3).map(e=>'<span class="cg-calendar-item '+e.event_type+'">'+esc((eventParts(e).time||'')+' '+(e.title||typeLabel(e.event_type)))+'</span>').join('')+(matching.length>3?'<span class="sub">+'+(matching.length-3)+' more</span>':'');
   button.onclick=()=>{state.selected=key;if(day<1||day>count){const p=key.split('-').map(Number);state.year=p[0];state.month=p[1]-1;loadMonth();}else{render();details();}};
   grid.appendChild(button);
  }
  wrap.appendChild(grid);details();
 }
 async function loadMonth(){
  const version=++state.version;
  $('calendarLoadStatus').textContent='Loading dates…';
  // Expand UTC bounds for all IANA offsets; filtering uses the displayed zone.
  const from=new Date(Date.UTC(state.year,state.month,-6)).toISOString();
  const to=new Date(Date.UTC(state.year,state.month+1,8)).toISOString();
  try{
   const [events,tasks]=await Promise.all([
    list('calendar_events',q=>q.gte('start_at',from).lt('start_at',to).order('start_at').order('id')),
    list('tasks',q=>q.gte('due_at',from).lt('due_at',to).order('due_at').order('id'))
   ]);
   if(version!==state.version)return;
   state.events=events;
   state.tasks=tasks.filter(t=>!['completed','cancelled'].includes(t.status)).map(t=>({...t,event_type:'task',start_at:t.due_at,all_day:false,description:t.description}));
   render();$('calendarLoadStatus').textContent='';
  }catch(error){if(version===state.version){$('calendarLoadStatus').textContent='Could not load this month. '+error.message;$('calendarWrap').replaceChildren();$('calendarDetails').replaceChildren();}}
 }
 window.changeMonth=amount=>{const d=new Date(Date.UTC(state.year,state.month+amount,1));state.year=d.getUTCFullYear();state.month=d.getUTCMonth();state.selected=dateKey(state.year,state.month,1);return loadMonth();};
 window.goToday=()=>{state.year=year;state.month=month-1;state.selected=now;return loadMonth();};
 document.querySelectorAll('#calendarFilters [data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll('#calendarFilters [data-filter]').forEach(x=>x.classList.toggle('active',x===b));render();});
 if(allowed){
  const button=$('addCalendarDate');button.hidden=false;button.onclick=async()=>{
   const modal=dialog('Add calendar date');
   modal.body.innerHTML='<div class="field"><label>Case (optional)<select id="calendarCaseChoice"><option value="">Firm event — no case</option>'+cases.map(c=>'<option value="'+c.id+'">'+esc(c.title||c.case_type)+' · '+esc([clientMap[c.client_id]?.first_name,clientMap[c.client_id]?.last_name].filter(Boolean).join(' '))+'</option>').join('')+'</select></label></div><div class="actions"><button type="button" class="btn btn-secondary" data-cancel>Cancel</button><button type="button" class="btn btn-primary" data-next>Continue</button></div>';
   modal.body.querySelector('[data-cancel]').onclick=modal.close;
   modal.body.querySelector('[data-next]').onclick=()=>{const c=caseMap[modal.body.querySelector('select').value];modal.close();editEvent(null,{caseId:c?.id,clientId:c?.client_id,date:state.selected,type:'appointment'},loadMonth);};
  };
 }
 await loadMonth();
}
window.CaseGORecords={timezone,timestamp,parts,eventParts,eventLabel,comments,caseDrafts,list,can,caseEvents,saveEvent,
 caseDates,clientCaseList,directories,calendar,recordGear,deleteRecord,confirmDelete,editEvent};
})();
