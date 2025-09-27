class PromptGallery {
    constructor() {
        this.prompts = [];
        this.categories = [];
        this.currentCategory = 'All';
        this.init();
    }

    async init() {
        await this.loadPrompts();
        await this.loadCategories();
        this.bindEvents();
        this.startLiveUpdates();
    }

    async loadPrompts(category = 'All') {
        try {
            const url = category === 'All' 
                ? '/api/prompts' 
                : `/api/prompts?category=${encodeURIComponent(category)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch prompts');
            
            this.prompts = await response.json();
            this.renderGallery();
            this.updateStats();
        } catch (error) {
            console.error('Error loading prompts:', error);
            this.showError('Failed to load prompts. Please try again.');
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error('Failed to fetch categories');
            
            this.categories = await response.json();
            this.renderFilters();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async updateStats() {
        try {
            const response = await fetch('/api/prompts/count');
            if (!response.ok) throw new Error('Failed to fetch count');
            
            const data = await response.json();
            document.getElementById('prompt-count').textContent = data.count;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    renderFilters() {
        const filtersContainer = document.querySelector('.filters');
        filtersContainer.innerHTML = '';

        this.categories.forEach((category, index) => {
            const count = category === 'All' 
                ? this.prompts.length 
                : this.prompts.filter(p => p.category === category).length;

            const button = document.createElement('button');
            button.className = `filter-btn ${index === 0 ? 'active' : ''}`;
            button.dataset.category = category;
            button.innerHTML = `
                ${category === 'All' ? 'All Prompts' : category}
                <span class="count">${count}</span>
            `;
            
            filtersContainer.appendChild(button);
        });
    }

    renderGallery() {
        const gallery = document.getElementById('gallery');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('empty-state');
        const showingCount = document.getElementById('showing-count');

        loading.style.display = 'none';

        if (this.prompts.length === 0) {
            gallery.innerHTML = '';
            emptyState.style.display = 'block';
            showingCount.textContent = '0';
            return;
        }

        emptyState.style.display = 'none';
        showingCount.textContent = this.prompts.length;

        gallery.innerHTML = this.prompts.map(prompt => `
            <div class="prompt-card" data-id="${prompt.id}">
                <img 
                    src="${this.escapeHtml(prompt.image_url)}" 
                    alt="${this.escapeHtml(prompt.prompt_text.substring(0, 100))}"
                    class="card-image"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='"
                >
                <div class="card-content">
                    <div class="card-category">${this.escapeHtml(prompt.category)}</div>
                    <p class="card-prompt">${this.escapeHtml(prompt.prompt_text)}</p>
                    <button class="copy-btn" onclick="gallery.copyPrompt('${this.escapeHtml(prompt.prompt_text).replace(/'/g, "\\'")}', this)">
                        📋 Copy Prompt
                    </button>
                </div>
            </div>
        `).join('');

        // Update filter counts
        this.updateFilterCounts();
    }

    updateFilterCounts() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const category = btn.dataset.category;
            const count = category === 'All' 
                ? this.prompts.length 
                : this.prompts.filter(p => p.category === category).length;
            
            const countSpan = btn.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        });
    }

    async copyPrompt(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Update button state
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copied!';
            button.classList.add('copied');
            
            // Show toast
            this.showToast('Prompt copied to clipboard!');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Copy failed. Please try again.', 'error');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.style.background = type === 'error' ? '#e53e3e' : '#48bb78';
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showError(message) {
        const gallery = document.getElementById('gallery');
        const loading = document.getElementById('loading');
        
        loading.style.display = 'none';
        gallery.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; color: white; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin-bottom: 0.5rem;">Error Loading Prompts</h3>
                <p style="opacity: 0.8;">${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; background: white; color: #667eea; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Reload Page
                </button>
            </div>
        `;
    }

    bindEvents() {
        // Filter button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn') || e.target.closest('.filter-btn')) {
                const btn = e.target.classList.contains('filter-btn') ? e.target : e.target.closest('.filter-btn');
                const category = btn.dataset.category;
                
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Load prompts for category
                this.currentCategory = category;
                this.loadPrompts(category);
            }
        });

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Clear any active states or modals
                document.querySelectorAll('.copied').forEach(btn => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '📋 Copy Prompt';
                });
            }
        });
    }

    startLiveUpdates() {
        // Check for new prompts every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/prompts/count');
                if (!response.ok) return;
                
                const data = await response.json();
                const currentCount = parseInt(document.getElementById('prompt-count').textContent);
                
                if (data.count > currentCount) {
                    // New prompts available, reload
                    await this.loadPrompts(this.currentCategory);
                    await this.loadCategories();
                    this.showToast('New prompts added!');
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }, 30000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new PromptGallery();
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed, but app still works
        });
    });
}