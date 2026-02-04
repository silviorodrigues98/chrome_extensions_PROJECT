// Utility Hub Core - Lightweight Module Orchestrator

const UtilityHub = (function () {
    const modules = {};
    let currentTabId;
    let currentModule = null;

    async function init() {
        // Get current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
            currentTabId = tabs[0].id;
        }

        setupNavigation();
        renderHome();
    }

    function registerModule(module) {
        modules[module.id] = module;
        console.log(`Module registered: ${module.name}`);
    }

    function setupNavigation() {
        document.getElementById('backBtn').addEventListener('click', () => {
            if (currentModule && currentModule.cleanup) {
                currentModule.cleanup();
            }
            currentModule = null;
            showScreen('homeScreen');
        });
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        const backBtn = document.getElementById('backBtn');
        const headerTitle = document.getElementById('headerTitle');
        const statusDot = document.getElementById('statusIndicator');

        if (screenId === 'homeScreen') {
            backBtn.style.display = 'none';
            headerTitle.textContent = 'Utility Hub';
            statusDot.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
            statusDot.style.display = 'block';
        }
    }

    function renderHome() {
        const grid = document.getElementById('moduleGrid');
        grid.innerHTML = '';

        // Render registered modules
        Object.values(modules).forEach(module => {
            const card = document.createElement('div');
            card.className = 'feature-card';
            card.innerHTML = `
                <div class="feature-icon">${module.icon}</div>
                <div class="feature-name">${module.name}</div>
                <div class="feature-desc">${module.description}</div>
            `;
            card.addEventListener('click', () => loadModule(module));
            grid.appendChild(card);
        });

        // Add placeholder for future modules
        const placeholder = document.createElement('div');
        placeholder.className = 'feature-card';
        placeholder.style.opacity = '0.5';
        placeholder.style.cursor = 'default';
        placeholder.innerHTML = `
            <div class="feature-icon" style="color: var(--text-muted);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
            </div>
            <div class="feature-name">Em breve...</div>
            <div class="feature-desc">Mais ferramentas vindo aí</div>
        `;
        grid.appendChild(placeholder);
    }

    async function loadModule(module) {
        currentModule = module;

        // Update header
        document.getElementById('headerTitle').textContent = module.name;

        // Load module HTML template
        const moduleScreen = document.getElementById('moduleScreen');
        try {
            const response = await fetch(`modules/${module.id}/${module.id}.html`);
            const html = await response.text();
            moduleScreen.innerHTML = html;
        } catch (e) {
            console.error(`Failed to load module template: ${module.id}`, e);
            moduleScreen.innerHTML = '<p style="color: var(--error);">Erro ao carregar módulo</p>';
        }

        showScreen('moduleScreen');

        // Initialize module
        if (module.init) {
            module.init(currentTabId);
        }
    }

    return {
        init,
        registerModule,
        showScreen,
        modules
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => UtilityHub.init());
