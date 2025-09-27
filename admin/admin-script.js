class AdminPanel {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.currentEditId = null;
        this.currentDeleteId = null;
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
            this.loadDashboardData();
        } else {
            this.showLogin();
        }
        this.bindEvents();
    }

    showLogin() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('admin-container').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-container').style.display = 'block';
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Add prompt form
        document.getElementById('add-prompt-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddPrompt();
        });

        // Edit prompt form
        document.getElementById('edit-prompt-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditPrompt();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadPrompts();
        });

        // Modal events
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal('edit-modal');
        });

        document.getElementById('edit-cancel').addEventListener('click', () => {
            this.closeModal('edit-modal');
        });

        document.getElementById('delete-modal-close').addEventListener('click', () => {
            this.closeModal('delete-modal');
        });

        document.getElementById('delete-cancel').addEventListener('click', () => {
            this.closeModal('delete-modal');
        });

        document.getElementById('delete-confirm').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal('edit-modal');
                this.closeModal('delete-modal');
            }
        });
    }

    async handleLogin() {
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Signing in...</span>';
        errorDiv.classList.remove('show');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.token = data.token;
            localStorage.setItem('admin_token', this.token);
            document.getElementById('admin-user').textContent = data.username;
            
            this.showDashboard();
            this.loadDashboardData();
            this.showToast('Welcome back!', 'success');

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Sign In</span>';
        }
    }

    handleLogout() {
        this.token = null;
        localStorage.removeItem('admin_token');
        this.showLogin();
        document.getElementById('login-form').reset();
        this.showToast('Logged out successfully', 'success');
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadPrompts()
        ]);
    }

    async loadStats() {
        try {
            const [promptsResponse, categoriesResponse] = await Promise.all([
                fetch('/api/prompts/count'),
                fetch('/api/categories')
            ]);

            if (!promptsResponse.ok || !categoriesResponse.ok) {
                throw new Error('Failed to load stats');
            }

            const promptsData = await promptsResponse.json();
            const categoriesData = await categoriesResponse.json();

            document.getElementById('total-prompts').textContent = promptsData.count;
            document.getElementById('total-categories').textContent = categoriesData.length - 1; // Exclude "All"

            // Calculate today's prompts (simplified - you might want to add a specific endpoint)
            const todayPromptsResponse = await fetch('/api/admin/prompts', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (todayPromptsResponse.ok) {
                const allPrompts = await todayPromptsResponse.json();
                const today = new Date().toDateString();
                const todayCount = allPrompts.filter(prompt => 
                    new Date(prompt.created_at).toDateString() === today
                ).length;
                
                document.getElementById('today-prompts').textContent = todayCount;
            }

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadPrompts() {
        const tbody = document.getElementById('prompts-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="table-loading">Loading prompts...</div></td></tr>';

        try {
            const response = await fetch('/api/admin/prompts', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.handleLogout();
                    return;
                }
                throw new Error('Failed to load prompts');
            }

            const prompts = await response.json();
            this.renderPromptsTable(prompts);

        } catch (error) {
            console.error('Error loading prompts:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        <div class="table-loading" style="color: #e53e3e;">
                            Error loading prompts: ${error.message}
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    renderPromptsTable(prompts) {
        const tbody = document.getElementById('prompts-tbody');
        
        if (prompts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        <div class="table-loading">No prompts found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = prompts.map(prompt => `
            <tr>
                <td>${prompt.id}</td>
                <td>
                    <img src="${this.escapeHtml(prompt.image_url)}" 
                         alt="Prompt image" 
                         class="table-image"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'" />
                </td>
                <td>
                    <span class="table-category">${this.escapeHtml(prompt.category)}</span>
                </td>
                <td>
                    <div class="table-prompt">${this.escapeHtml(prompt.prompt_text)}</div>
                </td>
                <td>
                    <div class="table-date">${this.formatDate(prompt.created_at)}</div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="edit-btn" onclick="adminPanel.editPrompt(${prompt.id})">
                            Edit
                        </button>
                        <button class="delete-btn" onclick="adminPanel.deletePrompt(${prompt.id})">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async handleAddPrompt() {
        const submitBtn = document.getElementById('add-prompt-btn');
        const form = document.getElementById('add-prompt-form');
        const formData = new FormData(form);

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Adding...</span>';

        try {
            const response = await fetch('/api/admin/prompts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: formData.get('category'),
                    image_url: formData.get('image_url'),
                    prompt_text: formData.get('prompt_text')
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add prompt');
            }

            form.reset();
            this.showToast('Prompt added successfully!', 'success');
            this.loadDashboardData();

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Add Prompt</span>';
        }
    }

    async editPrompt(id) {
        try {
            const response = await fetch('/api/admin/prompts', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load prompt');

            const prompts = await response.json();
            const prompt = prompts.find(p => p.id === id);

            if (!prompt) throw new Error('Prompt not found');

            // Populate edit form
            document.getElementById('edit-prompt-id').value = prompt.id;
            document.getElementById('edit-category').value = prompt.category;
            document.getElementById('edit-image-url').value = prompt.image_url;
            document.getElementById('edit-prompt-text').value = prompt.prompt_text;

            this.currentEditId = id;
            this.showModal('edit-modal');

        } catch (error) {
            this.showToast('Error loading prompt: ' + error.message, 'error');
        }
    }

    async handleEditPrompt() {
        const submitBtn = document.getElementById('edit-submit-btn');
        const form = document.getElementById('edit-prompt-form');
        const formData = new FormData(form);
        const id = document.getElementById('edit-prompt-id').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Updating...';

        try {
            const response = await fetch(`/api/admin/prompts/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: formData.get('category'),
                    image_url: formData.get('image_url'),
                    prompt_text: formData.get('prompt_text')
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update prompt');
            }

            this.closeModal('edit-modal');
            this.showToast('Prompt updated successfully!', 'success');
            this.loadPrompts();

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Prompt';
        }
    }

    deletePrompt(id) {
        this.currentDeleteId = id;
        this.showModal('delete-modal');
    }

    async confirmDelete() {
        if (!this.currentDeleteId) return;

        const deleteBtn = document.getElementById('delete-confirm');
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
            const response = await fetch(`/api/admin/prompts/${this.currentDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete prompt');
            }

            this.closeModal('delete-modal');
            this.showToast('Prompt deleted successfully!', 'success');
            this.loadDashboardData();

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
            this.currentDeleteId = null;
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        if (modalId === 'edit-modal') {
            this.currentEditId = null;
        } else if (modalId === 'delete-modal') {
            this.currentDeleteId = null;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 2) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// Handle page visibility change to refresh data
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.adminPanel && window.adminPanel.token) {
        window.adminPanel.loadDashboardData();
    }
});