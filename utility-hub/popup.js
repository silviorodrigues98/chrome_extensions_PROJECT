let currentTabId;
let countdownInterval;

const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

// --- Core Hub Logic ---

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
        if (screenId === 'reloadScreen') headerTitle.textContent = 'Auto Reload';
    }
}

document.getElementById('btnReloadTool').addEventListener('click', () => showScreen('reloadScreen'));
document.getElementById('backBtn').addEventListener('click', () => showScreen('homeScreen'));

// --- Auto Reload Module ---

// Obter informações da aba atual
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
        currentTabId = tabs[0].id;
        loadReloadStatus();
    }
});

function loadReloadStatus() {
    const key = `autoReload_${currentTabId}`;
    chrome.storage.local.get([key], (result) => {
        const data = result[key] || {};
        const isActive = data.active || false;
        const interval = data.interval || 60;
        const hardReload = data.hardReload || false;

        document.getElementById('interval').value = interval;
        document.getElementById('hardReload').checked = hardReload;

        updatePresetActive(interval);
        updateReloadUI(isActive);

        if (isActive) {
            startCountdown();
        }
    });
}

function updateReloadUI(isActive) {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const countdownContainer = document.getElementById('countdownContainer');
    const idleState = document.getElementById('idleState');

    if (isActive) {
        toggleBtn.innerHTML = `${stopIcon} <span>Parar</span>`;
        toggleBtn.classList.add('active');
        statusIndicator.classList.add('active');
        statusText.textContent = 'Ativo';
        statusText.style.color = 'var(--success)';
        countdownContainer.style.display = 'block';
        idleState.style.display = 'none';
    } else {
        toggleBtn.innerHTML = `${playIcon} <span>Iniciar</span>`;
        toggleBtn.classList.remove('active');
        statusIndicator.classList.remove('active');
        statusText.textContent = 'Inativo';
        statusText.style.color = 'var(--text-muted)';
        countdownContainer.style.display = 'none';
        idleState.style.display = 'block';
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

document.getElementById('toggleBtn').addEventListener('click', () => {
    const key = `autoReload_${currentTabId}`;
    chrome.storage.local.get([key], (result) => {
        const data = result[key] || {};
        const isActive = data.active || false;

        if (isActive) {
            chrome.alarms.clear(key);
            chrome.action.setBadgeText({ text: '', tabId: currentTabId });
            chrome.storage.local.set({ [key]: { ...data, active: false } }, () => {
                updateReloadUI(false);
                if (countdownInterval) clearInterval(countdownInterval);
            });
        } else {
            const interval = parseInt(document.getElementById('interval').value);
            const hardReload = document.getElementById('hardReload').checked;
            if (interval < 1) { alert('Mínimo 1s'); return; }

            const nextReload = Date.now() + (interval * 1000);
            chrome.action.setBadgeText({ text: 'ON', tabId: currentTabId });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: currentTabId });

            chrome.storage.local.set({
                [key]: { active: true, interval, hardReload, nextReload }
            }, () => {
                chrome.alarms.create(key, { delayInMinutes: interval / 60, periodInMinutes: interval / 60 });
                updateReloadUI(true);
                startCountdown();
            });
        }
    });
});

// Presets & Listeners (Auto Reload)
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        document.getElementById('interval').value = val;
        updatePresetActive(val);
        const key = `autoReload_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            if (result[key]?.active) applyReloadChanges(parseInt(val), document.getElementById('hardReload').checked);
        });
    });
});

function updatePresetActive(value) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-value') == value);
    });
}

document.getElementById('interval').addEventListener('input', (e) => updatePresetActive(e.target.value));
document.getElementById('hardReload').addEventListener('change', (e) => {
    const key = `autoReload_${currentTabId}`;
    chrome.storage.local.get([key], (result) => {
        if (result[key]?.active) applyReloadChanges(result[key].interval, e.target.checked);
    });
});

function applyReloadChanges(interval, hardReload) {
    const key = `autoReload_${currentTabId}`;
    const nextReload = Date.now() + (interval * 1000);
    chrome.storage.local.set({ [key]: { active: true, interval, hardReload, nextReload } }, () => {
        chrome.alarms.create(key, { delayInMinutes: interval / 60, periodInMinutes: interval / 60 });
        startCountdown();
    });
}
