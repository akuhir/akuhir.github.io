// AKUHIR authentication: login verification is performed by the Render backend.
class Auth {
    constructor() {
        this.enforceExpiry();
        this.currentUser = localStorage.getItem('currentUser');
        this.initializeLoginPage();
    }
    apiBase() { return String(window.AKUHIR_API_BASE_URL || '').trim().replace(/\/$/, ''); }
    clearSession() {
        ['currentUser','currentUserName','loginExpiry','token','accessToken','authToken','currentUserRole'].forEach(k => localStorage.removeItem(k));
    }
    enforceExpiry() {
        const expiry = parseInt(localStorage.getItem('loginExpiry'), 10);
        if ((expiry && Date.now() > expiry) || !localStorage.getItem('token')) this.clearSession();
    }
    initializeLoginPage() {
        if (this.currentUser && localStorage.getItem('token') && !window.location.pathname.endsWith('/index.html') && !window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
        }
        if (document.getElementById('loginForm')) { this.setupLoginForm(); this.setupThemeToggle(); }
    }
    setupLoginForm() {
        const form=document.getElementById('loginForm'), matricInput=document.getElementById('matricNumber'), nameInput=document.getElementById('studentName'), rememberCheckbox=document.getElementById('rememberMe');
        matricInput.addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
        form.addEventListener('submit',e=>{ e.preventDefault(); this.login(matricInput.value,nameInput.value,rememberCheckbox.checked); });
    }
    async login(matric,nameInput,rememberMe=false) {
        this.clearErrors(); matric=(matric||'').trim().toUpperCase(); nameInput=(nameInput||'').trim();
        if (!matric) return this.showError('matricError','Please enter your matric number');
        if (nameInput.length<3) return this.showError('nameError','Please enter at least 3 letters of your name');
        const button=document.querySelector('.login-btn'); if(button){button.disabled=true;button.textContent='Verifying…';}
        try {
            const base=this.apiBase(); if(!base) throw new Error('The backend URL is not configured.');
            const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matric,namePart:nameInput,rememberMe})});
            const payload=await response.json().catch(()=>({}));
            if(!response.ok || !payload.success || !payload.token || !payload.user) throw new Error(payload.message || 'Login failed. Check your details and try again.');
            this.clearSession();
            localStorage.setItem('token',payload.token);
            localStorage.setItem('currentUser',payload.user.matric || payload.user.matricNo || matric);
            localStorage.setItem('currentUserName',payload.user.name || '');
            localStorage.setItem('currentUserRole',payload.user.role || 'student');
            const expiryDate=new Date(); expiryDate.setDate(expiryDate.getDate()+(rememberMe?30:1)); localStorage.setItem('loginExpiry',String(expiryDate.getTime()));
            this.showSuccessAnimation(); setTimeout(()=>window.location.href='index.html',350);
        } catch(error) {
            const msg=error.message || 'Could not connect to the login server.';
            if(/matric|name|record|detail/i.test(msg)) { this.showError('matricError',msg); this.showError('nameError',msg); }
            else this.showError('matricError',`${msg} Please check your internet connection or contact the administrator.`);
        } finally { if(button){button.disabled=false;button.textContent='Login';} }
    }
    showError(id,message){const el=document.getElementById(id);if(el){el.textContent=message;el.classList.add('show');}}
    clearErrors(){document.querySelectorAll('.error-message').forEach(el=>{el.textContent='';el.classList.remove('show');});}
    showSuccessAnimation(){const card=document.querySelector('.login-card');if(card){card.style.opacity='0.8';card.style.transform='scale(0.98)';}}
    setupThemeToggle(){const toggle=document.getElementById('themeToggleLogin');if(!toggle)return;const saved=localStorage.getItem('theme');if(saved==='dark'){document.body.classList.add('dark-mode');toggle.textContent='☀️';}else{toggle.textContent='🌙';}toggle.addEventListener('click',()=>{document.body.classList.toggle('dark-mode');const dark=document.body.classList.contains('dark-mode');localStorage.setItem('theme',dark?'dark':'light');toggle.textContent=dark?'☀️':'🌙';});}
    logout(){this.clearSession();window.location.href='login.html';}
    getCurrentUser(){return localStorage.getItem('currentUser');}
    isLoggedIn(){return !!localStorage.getItem('currentUser')&&!!localStorage.getItem('token');}
}
document.addEventListener('DOMContentLoaded',()=>{window.auth=new Auth();});
