// Portal Main Script
class ClassPortal {
    constructor() {
        this.currentUser = localStorage.getItem('currentUser');
        this.currentSection = 'home';
        this.initializePortal();
    }

    initializePortal() {
        // Check authentication (and session expiry)
        const expiry = parseInt(localStorage.getItem('loginExpiry'), 10);
        if (expiry && Date.now() > expiry) {
            this.clearSession();
            this.currentUser = null;
        }
        if (!this.currentUser || !localStorage.getItem('token')) {
            this.clearSession();
            window.location.href = 'login.html';
            return;
        }

        // Setup navigation
        this.setupNavigation();

        // Setup logout
        this.setupLogout();

        // Display user info
        this.displayUserInfo();

        // Setup event listeners
        this.setupEventListeners();

        // Monthly spotlight content and administrator tools
        this.initializeWeeklySpotlights();

        // Load home section by default
        this.loadSection('home');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const sideNavbar = document.getElementById('sideNavbar');
        
        // Hamburger menu toggle
        if (hamburgerMenu) {
            hamburgerMenu.addEventListener('click', () => {
                sideNavbar.classList.toggle('open');
            });
        }
        
        // Close menu when link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (sideNavbar) {
                    sideNavbar.classList.remove('open');
                }
                const section = link.getAttribute('data-section');
                this.loadSection(section);
            });
        });
    }

    loadSection(sectionId) {
        // Keep the dashboard out of reach through normal navigation for non-admin users.
        if (sectionId === 'admin-dashboard' && !this.isAdmin()) {
            sectionId = 'home';
        }

        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }

        // Update nav active state
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });

        // Update current section
        this.currentSection = sectionId;

        // Animate entrance
        this.animateSection(selectedSection);
    }

    animateSection(section) {
        if (section) {
            section.style.animation = 'none';
            setTimeout(() => {
                section.style.animation = '';
            }, 10);
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', () => this.logout());
    }

    clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserName');
        localStorage.removeItem('loginExpiry');
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUserRole');
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.clearSession();
            window.location.href = 'login.html';
        }
    }

    displayUserInfo() {
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = localStorage.getItem('currentUserName') || this.currentUser;
        }
    }

    setupEventListeners() {
        // Handle Google Form links
        const formLinks = document.querySelectorAll('.btn-primary');
        formLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Allow default behavior - opens Google Form in new tab
                e.target.setAttribute('target', '_blank');
            });
        });
    }

    // These checks match the existing client-side login system, as requested.
    // They are UI gating only, not secure server-side authorization.
    isAdmin() {
        const adminMatricNumbers = [
            'AKU24/FE/HIS/1034',
            'AKU24/FE/HIS/1036',
            'AKU25/FEDU/HIS/1010'
        ];
        return localStorage.getItem('currentUserRole') === 'admin' && adminMatricNumbers.includes(String(localStorage.getItem('currentUser') || '').trim().toUpperCase());
    }

    async initializeWeeklySpotlights() {
        const adminLink = document.getElementById('adminDashboardNav');
        if (adminLink) adminLink.hidden = !this.isAdmin();

        const personForm = document.getElementById('personWeekForm');
        const quoteForm = document.getElementById('quoteWeekForm');
        const personPhotoInput = document.getElementById('personWeekPhoto');
        const personPhotoPreview = document.getElementById('personWeekPhotoPreview');
        const personMessage = document.getElementById('personWeekMessage');
        const quoteMessage = document.getElementById('quoteWeekMessage');
        if (!personForm || !quoteForm) return;

        const apiBase = String(window.AKUHIR_API_BASE_URL || '').trim().replace(/\/$/, '');
        const department = String(window.AKUHIR_API_DEPARTMENT || 'hir').trim();
        let savedPerson = this.readSpotlight('akuhirPersonOfMonth');
        let savedQuote = this.readSpotlight('akuhirQuoteOfMonth');
        let pendingPhotoFile = null;

        const token = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
        const apiRequest = async (path, options = {}) => {
            if (!apiBase) throw new Error('Backend URL is not configured. Set it in api-config.js.');
            const headers = new Headers(options.headers || {});
            const jwt = token();
            if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
            if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
                headers.set('Content-Type', 'application/json');
            }
            const response = await fetch(`${apiBase}${path}`, { ...options, headers });
            let payload = {};
            try { payload = await response.json(); } catch (_) {}
            if (!response.ok || payload.success === false) {
                throw new Error(payload.message || `Backend request failed (${response.status}).`);
            }
            return payload;
        };
        const fromApiPerson = (data) => data ? ({
            name: data.name || '',
            description: data.description || '',
            photo: (() => { const value = data.photo_url || data.photoUrl || data.photo || ''; const base = String(window.AKUHIR_API_BASE_URL || '').trim().replace(/\/$/, ''); return value && value.startsWith('/uploads/') ? base + value : value; })(),
            updatedAt: data.updated_at || data.updatedAt || ''
        }) : null;
        const fromApiQuote = (data) => data ? ({
            quote: data.quote_text || data.quoteText || data.quote || '',
            author: data.quote_author || data.quoteAuthor || data.author || '',
            updatedAt: data.updated_at || data.updatedAt || ''
        }) : null;

        if (savedPerson) {
            document.getElementById('personWeekName').value = savedPerson.name || '';
            document.getElementById('personWeekDescription').value = savedPerson.description || '';
            if (savedPerson.photo) { personPhotoPreview.src = savedPerson.photo; personPhotoPreview.hidden = false; }
        }
        if (savedQuote) {
            document.getElementById('quoteWeekText').value = savedQuote.quote || '';
            document.getElementById('quoteWeekAuthor').value = savedQuote.author || '';
        }
        this.renderMonthlySpotlights(savedPerson, savedQuote);

        // Fetch the latest published content from the shared Render backend.
        if (apiBase) {
            try {
                const [personResult, quoteResult] = await Promise.all([
                    apiRequest(`/api/${encodeURIComponent(department)}/person-of-week`),
                    apiRequest(`/api/${encodeURIComponent(department)}/quote-of-week`)
                ]);
                savedPerson = fromApiPerson(personResult.data);
                savedQuote = fromApiQuote(quoteResult.data);
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                if (savedPerson) {
                    document.getElementById('personWeekName').value = savedPerson.name;
                    document.getElementById('personWeekDescription').value = savedPerson.description;
                    if (savedPerson.photo) { personPhotoPreview.src = savedPerson.photo; personPhotoPreview.hidden = false; }
                }
                if (savedQuote) {
                    document.getElementById('quoteWeekText').value = savedQuote.quote;
                    document.getElementById('quoteWeekAuthor').value = savedQuote.author;
                }
            } catch (error) {
                console.warn('Could not load monthly spotlight from backend:', error.message);
                if (personMessage) personMessage.textContent = 'Backend not reachable yet; showing the homepage default until it connects.';
            }
        }

        personPhotoInput.addEventListener('change', async () => {
            const file = personPhotoInput.files && personPhotoInput.files[0];
            if (!file) { pendingPhotoFile = null; return; }
            if (!file.type.startsWith('image/')) {
                personMessage.textContent = 'Please choose an image file.';
                personPhotoInput.value = '';
                pendingPhotoFile = null;
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                personMessage.textContent = 'Please choose an image smaller than 5 MB.';
                personPhotoInput.value = '';
                pendingPhotoFile = null;
                return;
            }
            pendingPhotoFile = file;
            try {
                const resized = await this.resizeImage(file);
                personPhotoPreview.src = resized;
                personPhotoPreview.hidden = false;
                personPhotoPreview.dataset.pendingImage = resized;
                personMessage.textContent = 'Photo ready to publish.';
            } catch (error) {
                personMessage.textContent = 'Could not read that image. Please try another one.';
            }
        });

        personForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!this.isAdmin()) return;
            const name = document.getElementById('personWeekName').value.trim();
            const description = document.getElementById('personWeekDescription').value.trim();
            if (!name || !description) { personMessage.textContent = 'Enter both a name and description.'; return; }
            const existing = savedPerson || this.readSpotlight('akuhirPersonOfMonth');
            if (!apiBase) {
                const photo = personPhotoPreview.dataset.pendingImage || (existing && existing.photo) || '';
                const person = { name, description, photo, updatedAt: new Date().toISOString() };
                if (!this.writeSpotlight('akuhirPersonOfMonth', person, personMessage)) return;
                savedPerson = person;
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                personMessage.textContent = 'Saved in this browser only. Configure the Render backend to publish to everyone.';
                return;
            }
            try {
                personMessage.textContent = 'Publishing to all students…';
                const result = await apiRequest(`/api/admin/${encodeURIComponent(department)}/person-of-week`, {
                    method: 'PUT', body: JSON.stringify({ name, description })
                });
                let person = fromApiPerson(result.data) || { name, description, photo: existing?.photo || '' };
                if (pendingPhotoFile) {
                    const formData = new FormData();
                    formData.append('photo', pendingPhotoFile, pendingPhotoFile.name || 'person-month.jpg');
                    const photoResult = await apiRequest(`/api/admin/${encodeURIComponent(department)}/person-of-week/photo`, { method: 'POST', body: formData });
                    person = fromApiPerson(photoResult.data) || person;
                    if (!person.photo) throw new Error('The upload endpoint did not return a photo URL. Check the backend photo-upload response and storage configuration.');
                }
                savedPerson = person;
                delete personPhotoPreview.dataset.pendingImage;
                pendingPhotoFile = null;
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                personMessage.textContent = 'Person of the Month published for all students.';
            } catch (error) {
                personMessage.textContent = `Could not publish: ${error.message}${!token() ? ' Your current login does not provide the JWT token required by the Render admin API.' : ''}`;
            }
        });

        quoteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!this.isAdmin()) return;
            const quote = document.getElementById('quoteWeekText').value.trim();
            const author = document.getElementById('quoteWeekAuthor').value.trim();
            if (!quote || !author) { quoteMessage.textContent = 'Enter both the quote and its owner/author.'; return; }
            if (!apiBase) {
                const record = { quote, author, updatedAt: new Date().toISOString() };
                if (!this.writeSpotlight('akuhirQuoteOfMonth', record, quoteMessage)) return;
                savedQuote = record;
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                quoteMessage.textContent = 'Saved in this browser only. Configure the Render backend to publish to everyone.';
                return;
            }
            try {
                quoteMessage.textContent = 'Publishing to all students…';
                const result = await apiRequest(`/api/admin/${encodeURIComponent(department)}/quote-of-week`, {
                    method: 'PUT', body: JSON.stringify({ quoteText: quote, quoteAuthor: author })
                });
                savedQuote = fromApiQuote(result.data) || { quote, author, updatedAt: new Date().toISOString() };
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                quoteMessage.textContent = 'Quote of the Month published for all students.';
            } catch (error) {
                quoteMessage.textContent = `Could not publish: ${error.message}${!token() ? ' Your current login does not provide the JWT token required by the Render admin API.' : ''}`;
            }
        });

        document.getElementById('deletePersonWeek').addEventListener('click', async () => {
            if (!this.isAdmin() || !confirm('Delete the current Person of the Month?')) return;
            if (!apiBase) {
                localStorage.setItem('akuhirPersonOfMonth', JSON.stringify(null));
                savedPerson = null;
                personForm.reset(); personPhotoPreview.hidden = true; personPhotoPreview.removeAttribute('src');
                delete personPhotoPreview.dataset.pendingImage; pendingPhotoFile = null;
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                personMessage.textContent = 'Deleted in this browser only.';
                return;
            }
            try {
                await apiRequest(`/api/admin/${encodeURIComponent(department)}/person-of-week`, { method: 'DELETE' });
                savedPerson = null; personForm.reset(); personPhotoPreview.hidden = true; personPhotoPreview.removeAttribute('src');
                delete personPhotoPreview.dataset.pendingImage; pendingPhotoFile = null;
                this.renderMonthlySpotlights(savedPerson, savedQuote);
                personMessage.textContent = 'Person of the Month removed for all students.';
            } catch (error) { personMessage.textContent = `Could not delete: ${error.message}`; }
        });

        document.getElementById('deleteQuoteWeek').addEventListener('click', async () => {
            if (!this.isAdmin() || !confirm('Delete the current Quote of the Month?')) return;
            if (!apiBase) {
                localStorage.setItem('akuhirQuoteOfMonth', JSON.stringify(null));
                savedQuote = null; quoteForm.reset(); this.renderMonthlySpotlights(savedPerson, savedQuote);
                quoteMessage.textContent = 'Deleted in this browser only.';
                return;
            }
            try {
                await apiRequest(`/api/admin/${encodeURIComponent(department)}/quote-of-week`, { method: 'DELETE' });
                savedQuote = null; quoteForm.reset(); this.renderMonthlySpotlights(savedPerson, savedQuote);
                quoteMessage.textContent = 'Quote of the Month removed for all students.';
            } catch (error) { quoteMessage.textContent = `Could not delete: ${error.message}`; }
        });
    }

    readSpotlight(key) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? undefined : JSON.parse(value);
        } catch (error) {
            return undefined;
        }
    }

    writeSpotlight(key, value, messageElement) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            if (messageElement) messageElement.textContent = 'Could not save. The photo may be too large; choose a smaller image.';
            return false;
        }
    }

    resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const image = new Image();
                image.onerror = reject;
                image.onload = () => {
                    const maxDimension = 1000;
                    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(image.width * scale));
                    canvas.height = Math.max(1, Math.round(image.height * scale));
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.78));
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    renderMonthlySpotlights(person, quote) {
        const personCard = document.querySelector('.person-card');
        const quoteCard = document.querySelector('.quote-card');
        if (personCard && person !== undefined) {
            const photo = personCard.querySelector('.person-photo');
            const fallback = document.getElementById('personPhotoFallback');
            const name = personCard.querySelector('.person-name');
            const description = personCard.querySelector('.person-note');
            if (person === null) {
                if (photo) { photo.hidden = true; photo.style.display = 'none'; photo.removeAttribute('src'); }
                if (fallback) fallback.style.display = 'flex';
                if (name) name.textContent = 'No Person of the Month selected yet';
                if (description) description.textContent = 'Check back soon for the next featured student.';
            } else {
                if (name && person.name) name.textContent = person.name;
                if (description && person.description) description.textContent = person.description;
                if (photo && person.photo) {
                    photo.onerror = () => { photo.hidden = true; photo.style.display = 'none'; if (fallback) fallback.style.display = 'flex'; };
                    photo.onload = () => { photo.hidden = false; photo.style.display = ''; if (fallback) fallback.style.display = 'none'; };
                    photo.hidden = false;
                    photo.src = person.photo;
                    if (fallback) fallback.style.display = 'none';
                } else if (photo) { photo.hidden = true; photo.style.display = 'none'; if (fallback) fallback.style.display = 'flex'; }
            }
        }
        if (quoteCard && quote !== undefined) {
            const quoteText = quoteCard.querySelector('.quote-text');
            const quoteAuthor = quoteCard.querySelector('.quote-author');
            if (quote === null) {
                if (quoteText) quoteText.textContent = 'No Quote of the Month selected yet.';
                if (quoteAuthor) quoteAuthor.textContent = '';
            } else {
                if (quoteText && quote.quote) quoteText.textContent = '“' + quote.quote + '”';
                if (quoteAuthor && quote.author) quoteAuthor.textContent = '— ' + quote.author;
            }
        }
    }

    // Utility functions
    getReadableDate(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
    }

    formatTime(hours, minutes) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Add new announcement (for admin/update purposes)
    addAnnouncement(title, content) {
        const container = document.querySelector('.announcements-container');
        if (container) {
            const card = document.createElement('div');
            card.className = 'announcement-card';
            card.innerHTML = `
                <div class="announcement-date">Today</div>
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(content)}</p>
            `;
            container.insertBefore(card, container.firstChild);
        }
    }

    // Add new assignment (for admin/update purposes)
    addAssignment(title, description, dueDate, status = 'pending') {
        const container = document.querySelector('.assignments-container');
        if (container) {
            const card = document.createElement('div');
            card.className = `assignment-card ${status}`;
            card.innerHTML = `
                <div class="assignment-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <span class="status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
                <p>${this.escapeHtml(description)}</p>
                <div class="assignment-meta">
                    <span>Due: ${dueDate}</span>
                </div>
                <a href="#" class="btn-small">View Details</a>
            `;
            container.appendChild(card);
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get unread announcements count
    getUnreadCount() {
        // This would be fetched from server in a real app
        const cards = document.querySelectorAll('.announcement-card');
        return cards.length;
    }

    // Search functionality
    search(query) {
        console.log('Searching for:', query);
        // Implement search functionality
    }
}

// Initialize portal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the portal page
    if (document.getElementById('logoutBtn')) {
        window.portal = new ClassPortal();
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt + L for logout
    if (e.altKey && e.key === 'l') {
        if (window.portal) {
            window.portal.logout();
        }
    }

    // Ctrl/Cmd + K for search (implement later)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Implement search modal
    }

});

// Service Worker registration (for offline support in future)
if ('serviceWorker' in navigator) {
    // Uncomment when SW is created
    // navigator.serviceWorker.register('sw.js');
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Portal hidden');
    } else {
        console.log('Portal visible');
        // Could refresh data here
    }
});

// Handle page unload
window.addEventListener('beforeunload', (e) => {
    // Optional: warn user if they have unsaved changes
});

// Handle window resize for responsive adjustments
window.addEventListener('resize', () => {
    // Could adjust layout on resize
});

// Prevent context menu (optional - can be removed)
// document.addEventListener('contextmenu', (e) => {
//     e.preventDefault();
// });

// Accessibility: Announce section changes to screen readers
function announceSection(sectionName) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `Section changed to ${sectionName}`;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClassPortal };
}
