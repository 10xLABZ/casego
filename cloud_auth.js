/* CaseGO cloud authentication + tenant identity */
(function(){
  const cfg = window.CASEGO_CONFIG || {};
  if(!window.supabase || !cfg.supabaseUrl || !cfg.supabasePublishableKey){
    console.error('CaseGO cloud configuration is missing.');
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const ADMIN_FIRM_KEY = 'casego_admin_firm_id'; // transient UI context only; no case/client data is stored here.
  window.casegoSupabase = client;
  window.casegoSession = null;
  window.casegoProfile = null;
  window.casegoFirm = null;
  window.casegoRoles = [];
  window.casegoIsFirmAdmin = false;

  function pageName(){ return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function isLoginPage(){ return pageName() === 'login.html'; }
  function isPlatformPage(){ return pageName() === 'platform-admin.html'; }
  function isSystemAdmin(){ return window.casegoProfile?.platform_role === 'system_admin'; }
  function displayName(profile, user){
    const n = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return n || profile?.email || user?.email || 'CaseGO User';
  }
  function initials(name){
    return String(name || 'CG').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'CG';
  }
  function selectedAdminFirmId(){ return sessionStorage.getItem(ADMIN_FIRM_KEY) || null; }

  async function loadRoles(profile){
    if(!profile || profile.platform_role === 'system_admin') return [];
    const { data, error } = await client
      .from('user_roles')
      .select('role_id, roles(id,name,is_admin,is_system_template,firm_id)')
      .eq('user_id', profile.id);
    if(error){ console.warn('Unable to load CaseGO roles', error); return []; }
    return (data || []).flatMap(x=>Array.isArray(x.roles)?x.roles:[x.roles]).filter(Boolean);
  }

  async function loadFirm(firmId){
    if(!firmId) return null;
    const { data, error } = await client
      .from('firms')
      .select('id, name, status, phone, email, website, address_line1, address_line2, city, state, postal_code, country')
      .eq('id', firmId)
      .single();
    if(error) throw error;
    return data;
  }

  async function loadIdentity(session){
    if(!session?.user) return null;
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, firm_id, first_name, last_name, email, platform_role, active, job_title, experience, phone, extension, profile_image_url, weather_location, timezone, theme_preference')
      .eq('id', session.user.id)
      .single();
    if(profileError) throw profileError;
    if(!profile?.active) throw new Error('This account has been disabled. Access has been revoked.');

    let firm = null;
    if(profile.platform_role === 'system_admin'){
      const adminFirmId = selectedAdminFirmId();
      if(adminFirmId) firm = await loadFirm(adminFirmId);
    }else if(profile.firm_id){
      firm = await loadFirm(profile.firm_id);
      if(firm?.status && firm.status !== 'active') throw new Error('This firm is not currently active.');
    }

    const roles = await loadRoles(profile);
    window.casegoSession = session;
    window.casegoProfile = profile;
    window.casegoFirm = firm;
    window.casegoRoles = roles;
    const effectiveFirmId=firm?.id||profile.firm_id;
    let verifiedAdmin=profile.platform_role === 'system_admin' || roles.some(r=>r?.is_admin===true||r?.is_admin==='true');
    if(!verifiedAdmin&&effectiveFirmId){
      const {data}=await client.rpc('is_casego_admin_for_firm',{requested_firm:effectiveFirmId});
      verifiedAdmin=data===true;
    }
    window.casegoIsFirmAdmin = verifiedAdmin;
    return {session, profile, firm, roles, isFirmAdmin: window.casegoIsFirmAdmin};
  }

  async function requireAuth(){
    const { data, error } = await client.auth.getSession();
    if(error) throw error;
    if(!data.session){
      if(!isLoginPage()) location.replace('login.html');
      return null;
    }
    try{
      const identity = await loadIdentity(data.session);
      if(isLoginPage()){
        location.replace(identity.profile.platform_role === 'system_admin' ? 'platform-admin.html' : 'index.html');
        return identity;
      }
      if(identity.profile.platform_role === 'system_admin'){
        if(!identity.firm && !isPlatformPage()){
          location.replace('platform-admin.html');
          return null;
        }
      }else if(isPlatformPage()){
        location.replace('index.html');
        return null;
      }
      return identity;
    }catch(err){
      console.error(err);
      await client.auth.signOut();
      sessionStorage.removeItem(ADMIN_FIRM_KEY);
      if(!isLoginPage()) location.replace('login.html?reason=disabled');
      return null;
    }
  }

  async function signIn(email, password){
    const { data, error } = await client.auth.signInWithPassword({email, password});
    if(error) throw error;
    sessionStorage.removeItem(ADMIN_FIRM_KEY);
    return await loadIdentity(data.session);
  }

  async function signOut(){
    await client.auth.signOut();
    sessionStorage.removeItem(ADMIN_FIRM_KEY);
    window.casegoSession = null;
    window.casegoProfile = null;
    window.casegoFirm = null;
    window.casegoRoles = [];
    window.casegoIsFirmAdmin = false;
    location.replace('login.html');
  }

  async function enterFirm(firmId){
    if(!isSystemAdmin()) throw new Error('Platform Administrator access required.');
    const firm = await loadFirm(firmId);
    sessionStorage.setItem(ADMIN_FIRM_KEY, firm.id);
    window.casegoFirm = firm;
    location.href = 'index.html';
  }

  function exitFirm(){
    sessionStorage.removeItem(ADMIN_FIRM_KEY);
    window.casegoFirm = null;
    location.href = 'platform-admin.html';
  }

  function effectiveFirmId(){
    return window.casegoFirm?.id || window.casegoProfile?.firm_id || null;
  }

  function addSupportBanner(){
    if(!isSystemAdmin() || !window.casegoFirm || isPlatformPage()) return;
    if(document.getElementById('platformSupportBanner')) return;
    const main = document.querySelector('.main');
    const topbar = document.querySelector('.topbar');
    if(!main || !topbar) return;
    const banner = document.createElement('div');
    banner.id = 'platformSupportBanner';
    banner.className = 'platform-support-banner';
    banner.innerHTML = `<div><strong>PLATFORM ADMIN</strong><span>Viewing ${escapeHtml(window.casegoFirm.name)}</span></div><button type="button" class="btn btn-secondary platform-exit-btn">EXIT FIRM</button>`;
    banner.querySelector('button').onclick = exitFirm;
    topbar.insertAdjacentElement('afterend', banner);
  }

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function applyIdentityToPage(){
    const profile = window.casegoProfile;
    const user = window.casegoSession?.user;
    const firm = window.casegoFirm;
    const name = displayName(profile, user);

    document.querySelectorAll('.top-user').forEach(el=>{
      el.style.cursor='default';
      el.title='Signed in to CaseGO';
      const av=el.querySelector('.casego-avatar'); if(av) av.textContent=initials(name);
      const strong=el.querySelector('strong'); if(strong) strong.textContent=name;
      const small=el.querySelector('small');
      if(small) small.textContent=profile?.platform_role==='system_admin'
        ? (firm ? `Platform Admin • ${firm.name}` : 'CaseGO Platform Administrator')
        : (firm?.name || 'CaseGO User');
      el.onclick=null;
    });

    document.querySelectorAll('.topbar').forEach(topbar=>{
      if(topbar.querySelector('.casego-signout')) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn btn-secondary casego-signout';
      btn.textContent='SIGN OUT';
      btn.onclick=()=>signOut();
      topbar.appendChild(btn);
    });

    document.querySelectorAll('.firm-card').forEach(el=>{
      const strong=el.querySelector('strong'); if(strong) strong.textContent=firm?.name || 'CaseGO';
      const spans=el.querySelectorAll('span');
      if(spans[0]) spans[0].textContent=profile?.platform_role==='system_admin'?'Platform Support Mode':'Legal Practice Management';
      if(spans[1]) spans[1].textContent=profile?.platform_role==='system_admin'?'CaseGO administrator':(window.casegoIsFirmAdmin?'Firm administration':'Assigned matter workspace');
    });

    addSupportBanner();
  }

  window.CaseGOAuth = {
    client, requireAuth, signIn, signOut, loadIdentity, applyIdentityToPage,
    enterFirm, exitFirm, effectiveFirmId, isSystemAdmin, selectedAdminFirmId
  };
})();
