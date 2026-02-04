// Auto Reload Module
// This module handles automatic page reloading at configurable intervals

const AutoReloadModule = (function () {
    let currentTabId;
    let countdownInterval;

    const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

    function init(tabId) {
        currentTabId = tabId;
        loadStatus();
        setupEventListeners();
    }

    function loadStatus() {
        const key = `autoReload_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;
            const interval = data.interval || 60;
            const hardReload = data.hardReload || false;

            document.getElementById('interval').value = interval;
            document.getElementById('hardReload').checked = hardReload;

            updatePresetActive(interval);
            updateUI(isActive);

            if (isActive) {
                startCountdown();
            }
        });
    }

    function updateUI(isActive) {
        const toggleBtn = document.getElementById('toggleBtn');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const countdownContainer = document.getElementById('countdownContainer');
        const idleState = document.getElementById('idleState');

        if (isActive) {
            toggleBtn.innerHTML = `${stopIcon} <span>Parar</span>`;
            toggleBtn.classList.add('active');
            if (statusIndicator) statusIndicator.classList.add('active');
            if (statusText) {
                statusText.textContent = 'Ativo';
                statusText.style.color = 'var(--success)';
            }
            if (countdownContainer) countdownContainer.style.display = 'block';
            if (idleState) idleState.style.display = 'none';
        } else {
            toggleBtn.innerHTML = `${playIcon} <span>Iniciar</span>`;
            toggleBtn.classList.remove('active');
            if (statusIndicator) statusIndicator.classList.remove('active');
            if (statusText) {
                statusText.textContent = 'Inativo';
                statusText.style.color = 'var(--text-muted)';
            }
            if (countdownContainer) countdownContainer.style.display = 'none';
            if (idleState) idleState.style.display = 'block';
        }
    }

    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        const key = `autoReload_${currentTabId}`;

        function update() {
            chrome.storage.local.get([key], (result) => {
                const data = result[key];
                if (!data || !data.active) {
                    clearInterval(countdownInterval);
                    return;
                }
                const remaining = Math.max(0, Math.ceil((data.nextReload - Date.now()) / 1000));
                const countdownEl = document.getElementById('countdown');
                if (countdownEl) countdownEl.textContent = remaining;
            });
        }

        update();
        countdownInterval = setInterval(update, 1000);
    }

    function toggle() {
        const key = `autoReload_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;

            if (isActive) {
                stop(key, data);
            } else {
                start(key);
            }
        });
    }

    function stop(key, data) {
        chrome.alarms.clear(key);
        chrome.action.setBadgeText({ text: '', tabId: currentTabId });
        chrome.storage.local.set({ [key]: { ...data, active: false } }, () => {
            updateUI(false);
            if (countdownInterval) clearInterval(countdownInterval);
        });
    }

    function start(key) {
        const interval = parseInt(document.getElementById('interval').value);
        const hardReload = document.getElementById('hardReload').checked;
        if (interval < 1) { alert('Mínimo 1s'); return; }

        const nextReload = Date.now() + (interval * 1000);
        chrome.action.setBadgeText({ text: 'AR', tabId: currentTabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: currentTabId });

        chrome.storage.local.set({
            [key]: { active: true, interval, hardReload, nextReload }
        }, () => {
            chrome.alarms.create(key, { delayInMinutes: interval / 60, periodInMinutes: interval / 60 });
            updateUI(true);
            startCountdown();
        });
    }

    function applyChanges(interval, hardReload) {
        const key = `autoReload_${currentTabId}`;
        const nextReload = Date.now() + (interval * 1000);
        chrome.storage.local.set({ [key]: { active: true, interval, hardReload, nextReload } }, () => {
            chrome.alarms.create(key, { delayInMinutes: interval / 60, periodInMinutes: interval / 60 });
            startCountdown();
        });
    }

    function updatePresetActive(value) {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') == value);
        });
    }

    function setupEventListeners() {
        document.getElementById('toggleBtn').addEventListener('click', toggle);

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-value');
                document.getElementById('interval').value = val;
                updatePresetActive(val);
                const key = `autoReload_${currentTabId}`;
                chrome.storage.local.get([key], (result) => {
                    if (result[key]?.active) applyChanges(parseInt(val), document.getElementById('hardReload').checked);
                });
            });
        });

        document.getElementById('interval').addEventListener('input', (e) => updatePresetActive(e.target.value));

        document.getElementById('hardReload').addEventListener('change', (e) => {
            const key = `autoReload_${currentTabId}`;
            chrome.storage.local.get([key], (result) => {
                if (result[key]?.active) applyChanges(result[key].interval, e.target.checked);
            });
        });
    }

    function cleanup() {
        if (countdownInterval) clearInterval(countdownInterval);
    }

    return {
        init,
        cleanup,
        id: 'auto-reload',
        name: 'Auto Reload',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
        description: 'Fique atualizado sem cliques'
    };
})();

// Register with core
if (typeof UtilityHub !== 'undefined') {
    UtilityHub.registerModule(AutoReloadModule);
}
