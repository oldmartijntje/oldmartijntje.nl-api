/**
 * Shared functionality and components for QuartzForums
 */

// Shared styles and configuration
const SHARED_CONFIG = {
    apiBase: '/forums'
};

// Get URL parameters
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        implementationKey: params.get('implementationKey'),
        subpage: params.get('subpage'),
        page: parseInt(params.get('page')) || 0,
        search: params.get('search') || '',
        filter: params.get('filter') || ''
    };
}

// Set URL parameters without page reload
function setURLParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url);
}

// Navigation helper
function navigateTo(page, params = {}) {
    let url = page;
    const searchParams = new URLSearchParams();

    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            searchParams.set(key, params[key]);
        }
    });

    if (searchParams.toString()) {
        url += '?' + searchParams.toString();
    }

    window.location.href = url;
}

// Shared navbar HTML
function getNavbarHTML() {
    return `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary">
            <div class="container">
                <a class="navbar-brand" href="index.html">
                    <i class="bi bi-chat-square-dots"></i> QuartzForums
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="recent-forums.html">Recent Forums</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="all-forums.html">Browse All</a>
                        </li>
                    </ul>
                    <ul class="navbar-nav" id="authNav">
                        <!-- Auth items will be populated by JavaScript -->
                    </ul>
                </div>
            </div>
        </nav>
    `;
}

// Shared toast HTML
function getToastHTML() {
    return `
        <div class="toast-container position-fixed top-0 end-0 p-3">
            <div id="toast" class="toast" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">QuartzForums</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body" id="toastBody"></div>
            </div>
        </div>
    `;
}

// Shared modal HTMLs
function getAuthModalHTML() {
    return `
        <div class="modal fade" id="authModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="authModalTitle">Login</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="authForm">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" required>
                            </div>
                            <div id="authError" class="alert alert-danger" style="display: none;"></div>
                            <div id="authSuccess" class="alert alert-success" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="authSubmitBtn" onclick="app.submitAuth()">Login</button>
                        <button type="button" class="btn btn-link" id="authToggleBtn" onclick="app.toggleAuthMode()">Need an account? Register</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getResetAccessKeyModalHTML() {
    return `
        <div class="modal fade" id="resetAccessKeyModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Reset Access Key</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>This will generate a new access key and invalidate your old one. You'll need to update any saved credentials.</p>
                        <form id="resetAccessKeyForm">
                            <div class="mb-3">
                                <label for="resetPassword" class="form-label">Confirm Password</label>
                                <input type="password" class="form-control" id="resetPassword" required>
                            </div>
                            <div id="resetError" class="alert alert-danger" style="display: none;"></div>
                            <div id="resetSuccess" class="alert alert-success" style="display: none;"></div>
                            <div id="newAccessKey" class="alert alert-info" style="display: none;">
                                <strong>Your new access key:</strong><br>
                                <code id="accessKeyDisplay" class="user-select-all"></code>
                                <button class="btn btn-sm btn-outline-primary ms-2" onclick="app.copyToClipboard(document.getElementById('accessKeyDisplay').textContent)">
                                    <i class="bi bi-clipboard"></i> Copy
                                </button>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-warning" onclick="app.submitResetAccessKey()">Reset Access Key</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDeleteAccountModalHTML() {
    return `
        <div class="modal fade" id="deleteAccountModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title text-danger">Delete Account</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger">
                            <strong>Warning!</strong> This action cannot be undone. Your account will be permanently deleted and all your messages will be marked as anonymous.
                        </div>
                        <form id="deleteAccountForm">
                            <div class="mb-3">
                                <label for="deletePassword" class="form-label">Confirm Password</label>
                                <input type="password" class="form-control" id="deletePassword" required>
                            </div>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="confirmDelete" required>
                                <label class="form-check-label" for="confirmDelete">
                                    I understand this action cannot be undone
                                </label>
                            </div>
                            <div id="deleteError" class="alert alert-danger" style="display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="app.submitDeleteAccount()">Delete Account</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize shared components
function initSharedComponents() {
    // Insert navbar
    const navContainer = document.getElementById('navbar-container');
    if (navContainer) {
        navContainer.innerHTML = getNavbarHTML();
    }

    // Insert toast
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        toastContainer.innerHTML = getToastHTML();
    }

    // Insert modals
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML = getAuthModalHTML() + getResetAccessKeyModalHTML() + getDeleteAccountModalHTML();
    }
}