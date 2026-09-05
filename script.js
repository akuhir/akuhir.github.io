// Portal Main Script
class ClassPortal {
    constructor() {
        this.currentUser = localStorage.getItem('currentUser');
        this.currentSection = 'home';
        this.initializePortal();
    }

    initializePortal() {
        // Check authentication
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize theme
        this.initializeTheme();

        // Setup navigation
        this.setupNavigation();

        // Setup logout
        this.setupLogout();

        // Display user info
        this.displayUserInfo();

        // Setup event listeners
        this.setupEventListeners();

        // Load home section by default
        this.loadSection('home');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateThemeButton();
        }

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeButton();
    }

    updateThemeButton() {
        const themeToggle = document.getElementById('themeToggle');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
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
        const navLinks = document.querySelectorAll('.nav-link');
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
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        });
    }

    displayUserInfo() {
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = localStorage.getItem('currentUserName') || this.currentUser;
        }
    }

    setupEventListeners() {
        // Handle assignment card clicks
        const assignmentCards = document.querySelectorAll('.assignment-card');
        assignmentCards.forEach(card => {
            const detailsBtn = card.querySelector('.btn-small');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const title = card.querySelector('h3').textContent;
                    this.showAssignmentDetails(title);
                });
            }
        });

        // Handle lecture file links
        const fileLinks = document.querySelectorAll('.file-link');
        fileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const fileName = link.textContent;
                this.downloadFile(fileName);
            });
        });

        // Handle photo clicks
        const photoItems = document.querySelectorAll('.photo-item');
        photoItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                const caption = item.querySelector('p');
                this.viewPhotoLarge(img.src, caption.textContent);
            });
        });

        // Handle video clicks
        const videoItems = document.querySelectorAll('.video-item');
        videoItems.forEach(item => {
            item.addEventListener('click', () => {
                const title = item.querySelector('.video-title').textContent;
                this.playVideo(title);
            });
        });

        // Handle Google Form links
        const formLinks = document.querySelectorAll('.btn-primary');
        formLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Allow default behavior - opens Google Form in new tab
                e.target.setAttribute('target', '_blank');
            });
        });
    }

    showAssignmentDetails(assignmentTitle) {
        const details = {
            'Assignment 4: Data Structures': 'Implement binary search tree operations with insert, delete, and search methods. Submit via the portal.',
            'Assignment 3: Sorting Algorithms': 'Compare different sorting algorithms (bubble, selection, merge, quick). Analyze time and space complexity.',
            'Assignment 2: Linked Lists': 'Implement singly and doubly linked lists with various operations.',
            'Assignment 1: Basics Review': 'Review of basic programming concepts including variables, loops, and functions.'
        };

        const detail = details[assignmentTitle] || 'No additional details available.';
        alert(assignmentTitle + '\n\n' + detail);
    }

    downloadFile(fileName) {
        // Show confirmation for file download
        alert('Downloading: ' + fileName + '\n\nThis would download the file in a real application.');
    }

    viewPhotoLarge(src, caption) {
        // Create modal for large photo view
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            cursor: pointer;
        `;

        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;

        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = 'max-width: 100%; max-height: 80vh; border-radius: 10px;';

        const captionEl = document.createElement('p');
        captionEl.textContent = caption;
        captionEl.style.cssText = `
            color: white;
            margin-top: 15px;
            text-align: center;
            font-size: 1.1rem;
        `;

        imgContainer.appendChild(img);
        imgContainer.appendChild(captionEl);
        modal.appendChild(imgContainer);

        // Close modal on click
        modal.addEventListener('click', () => modal.remove());

        document.body.appendChild(modal);
    }

    playVideo(videoTitle) {
        // Show alert for video playback
        alert('Playing: ' + videoTitle + '\n\nThis would open the video player in a real application.');
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
            window.portal.setupLogout();
        }
    }

    // Ctrl/Cmd + K for search (implement later)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Implement search modal
    }

    // Alt + D for dark mode toggle
    if (e.altKey && e.key === 'd') {
        if (window.portal) {
            window.portal.toggleTheme();
        }
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
