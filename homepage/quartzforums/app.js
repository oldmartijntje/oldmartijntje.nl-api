/**
 * QuartzForums Frontend JavaScript
 * Handles all user interactions and API communications
 */

class QuartzForumsApp {
    constructor() {
        this.apiBase = '/forums';
        this.currentUser = this.loadUserFromStorage();
        this.currentPage = 'home';
        this.currentForum = null;
        this.currentImplementationKey = localStorage.getItem('qf_implementation_key') || 'test-key-123';
        this.currentSubpage = localStorage.getItem('qf_subpage') || '/test-forum';
        this.navigationHistory = [];

        this.init();
    }

    init() {
        this.updateAuthNav();
        if (document.getElementById('userWelcome') && document.getElementById('guestWelcome')) {
            this.updateWelcomeSection();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form submissions
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitAuth();
            });
        }

        const postMessageForm = document.getElementById('postMessageForm');
        if (postMessageForm) {
            postMessageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitMessage();
            });
        }

        // Search functionality is now handled in individual page scripts
    }

    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toastBody');

        toastBody.textContent = message;
        toast.className = `toast ${type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : 'text-bg-info'}`;

        new bootstrap.Toast(toast).show();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    getUserAvatar(username) {
        if (!username) return '?';
        return username.charAt(0).toUpperCase();
    }

    // Local Storage Methods
    saveUserToStorage(user) {
        localStorage.setItem('qf_user', JSON.stringify(user));
        this.currentUser = user;
    }

    loadUserFromStorage() {
        const stored = localStorage.getItem('qf_user');
        return stored ? JSON.parse(stored) : null;
    }

    clearUserFromStorage() {
        localStorage.removeItem('qf_user');
        this.currentUser = null;
    }

    // Navigation Methods - updated for multi-page structure
    showHome() {
        window.location.href = 'index.html';
    }

    showRecentForums() {
        window.location.href = 'recent-forums.html';
    }

    showAllForums() {
        window.location.href = 'all-forums.html';
    }

    showUserProfile() {
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }
        window.location.href = 'user-profile.html';
    }

    showForum(implementationKey, subpage) {
        navigateTo('forum-view.html', { implementationKey, subpage });
    }

    // Authentication Methods
    updateAuthNav() {
        const authNav = document.getElementById('authNav');

        // Check if authNav element exists before trying to modify it
        if (!authNav) {
            console.warn('authNav element not found, skipping navigation update');
            return;
        }

        if (this.currentUser) {
            authNav.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <div class="user-avatar me-1">${this.getUserAvatar(this.currentUser.username)}</div>
                        ${this.currentUser.username}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="user-profile.html">
                            <i class="bi bi-person"></i> Profile
                        </a></li>
                        <li><a class="dropdown-item" href="#" onclick="app.showResetAccessKeyModal()">
                            <i class="bi bi-key"></i> Reset Access Key
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="app.logout()">
                            <i class="bi bi-box-arrow-right"></i> Logout
                        </a></li>
                    </ul>
                </li>
            `;
        } else {
            authNav.innerHTML = `
                <li class="nav-item">
                    <button class="btn btn-outline-primary me-2" onclick="app.showAuthModal('login')">Login</button>
                </li>
                <li class="nav-item">
                    <button class="btn btn-primary" onclick="app.showAuthModal('register')">Register</button>
                </li>
            `;
        }
    }

    updateWelcomeSection() {
        const userWelcome = document.getElementById('userWelcome');
        const guestWelcome = document.getElementById('guestWelcome');

        if (this.currentUser) {
            userWelcome.style.display = 'block';
            guestWelcome.style.display = 'none';
        } else {
            userWelcome.style.display = 'none';
            guestWelcome.style.display = 'block';
        }
    }

    showAuthModal(mode) {
        const modal = new bootstrap.Modal(document.getElementById('authModal'));
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleBtn = document.getElementById('authToggleBtn');

        if (mode === 'login') {
            title.textContent = 'Login';
            submitBtn.textContent = 'Login';
            toggleBtn.textContent = 'Need an account? Register';
            submitBtn.setAttribute('data-mode', 'login');
        } else {
            title.textContent = 'Register';
            submitBtn.textContent = 'Register';
            toggleBtn.textContent = 'Already have an account? Login';
            submitBtn.setAttribute('data-mode', 'register');
        }

        // Clear form
        document.getElementById('authForm').reset();
        document.getElementById('authError').style.display = 'none';
        document.getElementById('authSuccess').style.display = 'none';

        modal.show();
    }

    toggleAuthMode() {
        const currentMode = document.getElementById('authSubmitBtn').getAttribute('data-mode');
        const newMode = currentMode === 'login' ? 'register' : 'login';

        // Just update the existing modal content instead of creating a new one
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleBtn = document.getElementById('authToggleBtn');

        if (newMode === 'login') {
            title.textContent = 'Login';
            submitBtn.textContent = 'Login';
            toggleBtn.textContent = 'Need an account? Register';
            submitBtn.setAttribute('data-mode', 'login');
        } else {
            title.textContent = 'Register';
            submitBtn.textContent = 'Register';
            toggleBtn.textContent = 'Already have an account? Login';
            submitBtn.setAttribute('data-mode', 'register');
        }

        // Clear form
        document.getElementById('authForm').reset();
        document.getElementById('authError').style.display = 'none';
        document.getElementById('authSuccess').style.display = 'none';
    }

    async submitAuth() {
        const mode = document.getElementById('authSubmitBtn').getAttribute('data-mode');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const errorDiv = document.getElementById('authError');
        const successDiv = document.getElementById('authSuccess');

        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        try {
            const endpoint = mode === 'login' ? '/account/login' : '/account/register';
            const response = await fetch(this.apiBase + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.saveUserToStorage(data);
                this.updateAuthNav();
                this.updateWelcomeSection();

                successDiv.textContent = mode === 'login' ? 'Login successful!' : 'Account created successfully!';
                successDiv.style.display = 'block';

                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
                    this.showToast(mode === 'login' ? 'Welcome back!' : 'Welcome to QuartzForums!', 'success');
                }, 1000);
            } else {
                errorDiv.textContent = data.message || 'An error occurred';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error occurred';
            errorDiv.style.display = 'block';
        }
    }

    logout() {
        this.clearUserFromStorage();
        this.updateAuthNav();
        if (document.getElementById('userWelcome') && document.getElementById('guestWelcome')) {
            this.updateWelcomeSection();
        }
        this.showToast('Logged out successfully', 'info');
        this.showHome();
    }

    // Forum Loading Methods
    async loadRecentForums() {
        const container = document.getElementById('recentForumsList');
        container.innerHTML = '<div class="loading"><i class="bi bi-arrow-clockwise"></i> Loading recent forums...</div>';

        try {
            const url = new URL(this.apiBase + '/forums/recent', window.location.origin);
            if (this.currentUser) {
                url.searchParams.append('requesterAccessKey', this.currentUser.accessKey);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                this.renderForumsList(data.forums, container);
            } else {
                container.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load recent forums</div>';
        }
    }

    // Load implementation key options for the dropdown
    async loadImplementationKeyOptions() {
        try {
            // Get all forums to extract unique implementation keys
            const response = await fetch(`${this.apiBase}/forums?limit=1000`);
            const data = await response.json();

            if (response.ok && data.forums) {
                // Extract unique implementation keys
                const uniqueKeys = [...new Set(data.forums.map(forum => forum.implementationKey))];

                // Load domains for each implementation key
                const keyDetails = await Promise.all(
                    uniqueKeys.map(async (key) => {
                        try {
                            const keyResponse = await fetch(`${this.apiBase}/implementation-key/${key}`);
                            if (keyResponse.ok) {
                                const keyData = await keyResponse.json();
                                return { key, domain: keyData.domain };
                            }
                            return { key, domain: key }; // fallback to key as domain
                        } catch (error) {
                            return { key, domain: key }; // fallback
                        }
                    })
                );

                // Populate the dropdown
                this.populateImplementationKeyDropdown(keyDetails);
            }
        } catch (error) {
            console.error('Failed to load implementation keys:', error);
        }
    }

    populateImplementationKeyDropdown(keyDetails) {
        const select = document.getElementById('implementationKeyFilter');
        if (!select) return;

        // Clear existing options except "All Websites"
        select.innerHTML = '<option value="">All Websites</option>';

        // Sort by domain for better UX
        keyDetails.sort((a, b) => a.domain.localeCompare(b.domain));

        // Add options
        keyDetails.forEach(({ key, domain }) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = domain;
            select.appendChild(option);
        });

        // Add change event listener
        select.addEventListener('change', () => {
            this.loadAllForums(0);
        });
    }

    async loadAllForums(page = 0) {
        const container = document.getElementById('allForumsList');
        container.innerHTML = '<div class="loading"><i class="bi bi-arrow-clockwise"></i> Loading forums...</div>';

        try {
            const url = new URL(this.apiBase + '/forums', window.location.origin);
            url.searchParams.append('limit', '10');
            url.searchParams.append('offset', page * 10);

            if (this.currentUser) {
                url.searchParams.append('requesterAccessKey', this.currentUser.accessKey);
            }

            const searchTerm = document.getElementById('forumSearch')?.value;
            if (searchTerm) {
                url.searchParams.append('subpage', searchTerm);
            }

            const implementationKeyFilter = document.getElementById('implementationKeyFilter')?.value;
            if (implementationKeyFilter) {
                url.searchParams.append('implementationKey', implementationKeyFilter);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                this.renderForumsList(data.forums, container);
                this.renderPagination(data.total, page);
            } else {
                container.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load forums</div>';
        }
    }

    async renderForumsList(forums, container) {
        if (forums.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No forums found</div>';
            return;
        }

        // Get domains for all implementation keys
        const keyToDomainMap = new Map();
        const uniqueKeys = [...new Set(forums.map(forum => forum.implementationKey))];

        await Promise.all(uniqueKeys.map(async (key) => {
            try {
                const response = await fetch(`${this.apiBase}/implementation-key/${key}`);
                if (response.ok) {
                    const data = await response.json();
                    keyToDomainMap.set(key, data.domain || key);
                } else {
                    keyToDomainMap.set(key, key);
                }
            } catch (error) {
                keyToDomainMap.set(key, key);
            }
        }));

        const html = forums.map(forum => {
            const domain = keyToDomainMap.get(forum.implementationKey) || forum.implementationKey;
            const forumUrl = `forum-view.html?implementationKey=${encodeURIComponent(forum.implementationKey)}&subpage=${encodeURIComponent(forum.subpage)}`;
            return `
            <div class="list-group-item forum-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1" onclick="app.visitExternalForum('${forum.implementationKey}', '${forum.subpage}')" style="cursor: pointer;">
                        <h6 class="mb-1">${forum.subpage}</h6>
                        <p class="mb-1 text-muted">${domain}</p>
                        <small class="text-muted">${this.formatDate(forum.lastPush)}</small>
                    </div>
                    <div class="d-flex flex-column gap-2">
                        <a href="${forumUrl}" class="btn btn-sm btn-primary">
                            <i class="bi bi-eye"></i> View Here
                        </a>
                        <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); app.visitExternalForum('${forum.implementationKey}', '${forum.subpage}')">
                            <i class="bi bi-box-arrow-up-right"></i> Original
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');

        container.innerHTML = `<div class="list-group">${html}</div>`;
    }

    renderPagination(total, currentPage) {
        const pagination = document.getElementById('forumsPagination');
        const totalPages = Math.ceil(total / 10);

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'block';
        const paginationList = pagination.querySelector('.pagination');

        let html = '';

        // Get current URL params
        const urlParams = getURLParams();

        // Previous button
        if (currentPage > 0) {
            const prevParams = { ...urlParams, page: currentPage - 1 };
            const prevUrl = '?' + new URLSearchParams(prevParams).toString();
            html += `
                <li class="page-item">
                    <a class="page-link" href="${prevUrl}">Previous</a>
                </li>
            `;
        } else {
            html += `
                <li class="page-item disabled">
                    <span class="page-link">Previous</span>
                </li>
            `;
        }

        // Page numbers
        const startPage = Math.max(0, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `
                    <li class="page-item active">
                        <span class="page-link">${i + 1}</span>
                    </li>
                `;
            } else {
                const pageParams = { ...urlParams, page: i };
                const pageUrl = '?' + new URLSearchParams(pageParams).toString();
                html += `
                    <li class="page-item">
                        <a class="page-link" href="${pageUrl}">${i + 1}</a>
                    </li>
                `;
            }
        }

        // Next button
        if (currentPage < totalPages - 1) {
            const nextParams = { ...urlParams, page: currentPage + 1 };
            const nextUrl = '?' + new URLSearchParams(nextParams).toString();
            html += `
                <li class="page-item">
                    <a class="page-link" href="${nextUrl}">Next</a>
                </li>
            `;
        } else {
            html += `
                <li class="page-item disabled">
                    <span class="page-link">Next</span>
                </li>
            `;
        }

        paginationList.innerHTML = html;
    }

    searchForums() {
        this.loadAllForums(0);
    }

    // Forum Viewing Methods
    async loadForum(implementationKey, subpage) {
        const container = document.getElementById('forumMessages');
        const titleElement = document.getElementById('forumTitle');
        const metaElement = document.getElementById('forumMeta');
        const postBtn = document.getElementById('postMessageBtn');
        const originalWebsiteBtn = document.getElementById('originalWebsiteBtn');

        this.currentForum = { implementationKey, subpage };

        titleElement.innerHTML = `<i class="bi bi-chat-square-text"></i> ${subpage}`;

        // Get domain for this implementation key
        try {
            const keyResponse = await fetch(`${this.apiBase}/implementation-key/${implementationKey}`);
            if (keyResponse.ok) {
                const keyData = await keyResponse.json();
                metaElement.textContent = keyData.domain || implementationKey;
            } else {
                metaElement.textContent = implementationKey;
            }
        } catch (error) {
            metaElement.textContent = implementationKey;
        }

        if (this.currentUser) {
            postBtn.style.display = 'inline-block';
        } else {
            postBtn.style.display = 'none';
        }

        // Always show original website button
        if (originalWebsiteBtn) {
            originalWebsiteBtn.style.display = 'inline-block';
        }

        container.innerHTML = '<div class="loading"><i class="bi bi-arrow-clockwise"></i> Loading messages...</div>';

        try {
            const url = new URL(this.apiBase + '/forum', window.location.origin);
            url.searchParams.append('implementationKey', implementationKey);
            url.searchParams.append('subpage', subpage);

            if (this.currentUser) {
                url.searchParams.append('requesterAccessKey', this.currentUser.accessKey);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                this.renderMessages(data.messages, container);
            } else {
                container.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load forum messages</div>';
        }
    }

    renderMessages(messages, container) {
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-chat-square"></i>
                    <p class="mb-0">No messages yet. Be the first to start the conversation!</p>
                </div>
            `;
            return;
        }

        const html = messages.map(message => `
            <div class="message-content ${message.limbo ? 'limbo-message' : ''}">
                <div class="message-meta">
                    <div class="user-avatar me-2">${this.getUserAvatar(message.username)}</div>
                    ${message.username ?
                `<strong class="username-link" onclick="app.viewUserProfile('${message.accountId}', '${message.username}')" style="cursor: pointer; color: #58a6ff;">${message.username}</strong>` :
                '<strong>[Deleted User]</strong>'
            }
                    <span class="text-muted ms-2">${this.formatDate(message.createdAt)}</span>
                    ${message.limbo ? '<span class="badge bg-warning ms-2">Limbo</span>' : ''}
                    ${this.currentUser && message.accountId === this.currentUser.userId ? `
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="app.deleteMessage('${message.messageId}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="message-text">${this.escapeHtml(message.content)}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Message Posting Methods
    showPostMessageModal() {
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        if (!this.currentForum) {
            this.showImplementationKeyModal();
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('postMessageModal'));
        document.getElementById('postMessageForm').reset();
        document.getElementById('postError').style.display = 'none';
        modal.show();
    }

    async submitMessage() {
        const content = document.getElementById('messageContent').value;
        const errorDiv = document.getElementById('postError');

        errorDiv.style.display = 'none';

        if (!content.trim()) {
            errorDiv.textContent = 'Please enter a message';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': this.currentUser.accessKey
                },
                body: JSON.stringify({
                    implementationKey: this.currentForum.implementationKey,
                    subpage: this.currentForum.subpage,
                    content: content
                })
            });

            const data = await response.json();

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('postMessageModal')).hide();
                this.showToast('Message posted successfully!', 'success');
                // Reload the forum to show the new message
                this.loadForum(this.currentForum.implementationKey, this.currentForum.subpage);
            } else {
                errorDiv.textContent = data.message || 'Failed to post message';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error occurred';
            errorDiv.style.display = 'block';
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/message/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'X-Access-Key': this.currentUser.accessKey
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Message deleted successfully', 'success');
                // Reload the forum
                this.loadForum(this.currentForum.implementationKey, this.currentForum.subpage);
            } else {
                this.showToast(data.message || 'Failed to delete message', 'error');
            }
        } catch (error) {
            this.showToast('Network error occurred', 'error');
        }
    }

    showImplementationKeyModal() {
        const modal = new bootstrap.Modal(document.getElementById('implementationKeyModal'));
        document.getElementById('implementationKey').value = this.currentImplementationKey;
        document.getElementById('subpage').value = this.currentSubpage;
        modal.show();
    }

    setImplementationKey() {
        const implementationKey = document.getElementById('implementationKey').value;
        const subpage = document.getElementById('subpage').value;

        if (!implementationKey || !subpage) {
            this.showToast('Please enter both implementation key and subpage', 'error');
            return;
        }

        this.currentImplementationKey = implementationKey;
        this.currentSubpage = subpage;

        localStorage.setItem('qf_implementation_key', implementationKey);
        localStorage.setItem('qf_subpage', subpage);

        bootstrap.Modal.getInstance(document.getElementById('implementationKeyModal')).hide();

        // Show the forum
        this.showForum(implementationKey, subpage);
    }

    // User Profile Methods
    async loadUserProfile(userId = null) {
        // Use provided userId or current user's userId
        const targetUserId = userId || (this.currentUser ? this.currentUser.userId : null);

        if (!targetUserId) {
            console.error('No user ID found. Current user:', this.currentUser);
            this.showToast('User ID not found', 'error');
            return;
        }

        const container = document.getElementById('userProfileContent');
        container.innerHTML = '<div class="loading"><i class="bi bi-arrow-clockwise"></i> Loading profile...</div>';

        try {
            const url = new URL(`${this.apiBase}/account/${targetUserId}`, window.location.origin);
            if (this.currentUser) {
                url.searchParams.append('requesterAccessKey', this.currentUser.accessKey);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                // Pass true for isOtherUser only when explicitly viewing someone else's profile
                this.renderUserProfile(data, container, userId !== null && userId !== this.currentUser?.userId);
            } else {
                container.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            console.error('Profile load error:', error);
            container.innerHTML = '<div class="alert alert-danger">Failed to load profile</div>';
        }
    } renderUserProfile(profile, container, isOtherUser = false) {
        const forumsHtml = profile.forums.length > 0 ?
            profile.forums.map(forum => {
                const forumUrl = `forum-view.html?implementationKey=${encodeURIComponent(forum.implementationKey)}&subpage=${encodeURIComponent(forum.subpage)}`;
                return `
                <a href="${forumUrl}" class="list-group-item forum-item text-decoration-none">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${forum.subpage}</h6>
                            <p class="mb-1 text-muted">${forum.implementationKey}</p>
                        </div>
                        <span class="badge bg-secondary">${forum.messageCount} messages</span>
                    </div>
                </a>
            `}).join('') :
            '<div class="list-group-item text-center text-muted">No forum activity yet</div>';

        // Different layouts for viewing own profile vs other users' profiles
        const profileActions = isOtherUser ? '' : `
            <div class="mb-3">
                <label class="form-label small text-muted">Access Key:</label>
                <div class="d-flex gap-2 align-items-center">
                    <code class="flex-grow-1 user-select-all" style="font-size: 0.75rem; word-break: break-all;">${this.currentUser.accessKey}</code>
                    <button class="btn btn-sm btn-outline-secondary" onclick="app.copyToClipboard('${this.currentUser.accessKey}')">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-outline-primary" onclick="app.showResetAccessKeyModal()">
                    <i class="bi bi-key"></i> Reset Access Key
                </button>
                <button class="btn btn-outline-danger" onclick="app.showDeleteAccountModal()">
                    <i class="bi bi-trash"></i> Delete Account
                </button>
            </div>
        `;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <div class="user-avatar mx-auto mb-3" style="width: 64px; height: 64px; font-size: 1.5rem;">
                                ${this.getUserAvatar(profile.username)}
                            </div>
                            <h5>${profile.username}</h5>
                            <p class="text-muted">User ID: ${profile.userId}</p>
                            ${profileActions}
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-chat-square-dots"></i> Forum Activity</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush">
                                ${forumsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Additional Modal Methods
    showResetAccessKeyModal() {
        const modal = new bootstrap.Modal(document.getElementById('resetAccessKeyModal'));
        document.getElementById('resetAccessKeyForm').reset();
        document.getElementById('resetError').style.display = 'none';
        document.getElementById('resetSuccess').style.display = 'none';
        modal.show();
    }

    async submitResetAccessKey() {
        const password = document.getElementById('resetPassword').value;
        const errorDiv = document.getElementById('resetError');
        const successDiv = document.getElementById('resetSuccess');

        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        try {
            const response = await fetch(this.apiBase + '/account/reset-access-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.currentUser.username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Update stored user data with new access key
                this.currentUser.accessKey = data.accessKey;
                this.saveUserToStorage(this.currentUser);

                // Show the new access key
                const accessKeyDisplay = document.getElementById('accessKeyDisplay');
                const newAccessKeyDiv = document.getElementById('newAccessKey');
                if (accessKeyDisplay && newAccessKeyDiv) {
                    accessKeyDisplay.textContent = data.accessKey;
                    newAccessKeyDiv.style.display = 'block';
                }

                successDiv.textContent = 'Access key reset successfully!';
                successDiv.style.display = 'block';

                // Don't auto-close the modal so user can copy the key
                this.showToast('Access key updated successfully', 'success');
            } else {
                errorDiv.textContent = data.message || 'Failed to reset access key';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error occurred';
            errorDiv.style.display = 'block';
        }
    }

    showDeleteAccountModal() {
        const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
        document.getElementById('deleteAccountForm').reset();
        document.getElementById('deleteError').style.display = 'none';
        modal.show();
    }

    async submitDeleteAccount() {
        const password = document.getElementById('deletePassword').value;
        const confirmed = document.getElementById('confirmDelete').checked;
        const errorDiv = document.getElementById('deleteError');

        errorDiv.style.display = 'none';

        if (!confirmed) {
            errorDiv.textContent = 'Please confirm that you understand this action cannot be undone';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.currentUser.username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal')).hide();
                this.logout();
                this.showToast('Account deleted successfully', 'info');
                this.showHome();
            } else {
                errorDiv.textContent = data.message || 'Failed to delete account';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error occurred';
            errorDiv.style.display = 'block';
        }
    }

    // New utility functions
    async visitExternalForum(implementationKey, subpage) {
        try {
            // Get the domain for this implementation key from the API
            const response = await fetch(`${this.apiBase}/implementation-key/${implementationKey}`);
            let domain = implementationKey; // fallback

            if (response.ok) {
                const data = await response.json();
                domain = data.domain || implementationKey;

            }

            // Construct the URL
            let url;
            if (domain.startsWith("http") && domain.includes("://")) {
                url = `${domain}/${subpage}`;
            } else {
                url = `https://${domain}/${subpage}`;
            }
            window.open(url, '_blank');
        } catch (error) {
            // Fallback - try to construct URL with implementation key
            const url = `https://${implementationKey}/${subpage}`;
            window.open(url, '_blank');
        }
    }

    async visitOriginalWebsite() {
        if (!this.currentForum) return;
        this.visitExternalForum(this.currentForum.implementationKey, this.currentForum.subpage);
    }

    // Profile viewing functionality
    viewUserProfile(userId, username) {
        if (!userId || userId === 'null') {
            this.showToast('Cannot view profile of deleted user', 'info');
            return;
        }

        // Navigate to a user profile page with the user ID as parameter
        navigateTo('user-profile.html', { userId: userId });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        });
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', function () {
    app = new QuartzForumsApp();
});

// Global functions for onclick handlers
function showHome() { app.showHome(); }
function showRecentForums() { app.showRecentForums(); }
function showAllForums() { app.showAllForums(); }
function showUserProfile() { app.showUserProfile(); }
function goBack() { app.goBack(); }
function showAuthModal(mode) { app.showAuthModal(mode); }
function toggleAuthMode() { app.toggleAuthMode(); }
function submitAuth() { app.submitAuth(); }
function logout() { app.logout(); }
function showPostMessageModal() { app.showPostMessageModal(); }
function submitMessage() { app.submitMessage(); }
function setImplementationKey() { app.setImplementationKey(); }
function showResetAccessKeyModal() { app.showResetAccessKeyModal(); }
function submitResetAccessKey() { app.submitResetAccessKey(); }
function showDeleteAccountModal() { app.showDeleteAccountModal(); }
function submitDeleteAccount() { app.submitDeleteAccount(); }
function visitOriginalWebsite() { app.visitOriginalWebsite(); }
function viewUserProfile(userId, username) { app.viewUserProfile(userId, username); }
function copyAccessKey() {
    const accessKey = document.getElementById('accessKeyDisplay').textContent;
    app.copyToClipboard(accessKey);
}