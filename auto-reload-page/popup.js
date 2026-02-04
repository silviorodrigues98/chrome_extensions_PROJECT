let currentTabId;
let countdownInterval;

const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

// Obter informações da aba atual
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
        currentTabId = tabs[0].id;
        loadStatus();
    }
});

// Carregar status
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

// Atualizar UI
function updateUI(isActive) {
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

// Countdown
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
            document.getElementById('countdown').textContent = remaining;

            // Se o tempo acabou, esperamos o background.js atualizar o nextReload
            // e continuamos o countdown na próxima iteração
        });
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

// Botão Iniciar/Parar
document.getElementById('toggleBtn').addEventListener('click', () => {
    const key = `autoReload_${currentTabId}`;
    chrome.storage.local.get([key], (result) => {
        const data = result[key] || {};
        const isActive = data.active || false;

        if (isActive) {
            // Parar
            chrome.alarms.clear(key);
            chrome.storage.local.set({
                [key]: { ...data, active: false }
            }, () => {
                updateUI(false);
                if (countdownInterval) clearInterval(countdownInterval);
            });
        } else {
            // Iniciar
            const interval = parseInt(document.getElementById('interval').value);
            const hardReload = document.getElementById('hardReload').checked;

            if (interval < 1) {
                alert('O intervalo mínimo é de 1 segundo!');
                return;
            }

            const nextReload = Date.now() + (interval * 1000);

            chrome.storage.local.set({
                [key]: {
                    active: true,
                    interval: interval,
                    hardReload: hardReload,
                    nextReload: nextReload
                }
            }, () => {
                // Criar alarme
                chrome.alarms.create(key, {
                    delayInMinutes: interval / 60,
                    periodInMinutes: interval / 60
                });

                updateUI(true);
                startCountdown();
            });
        }
    });
});

// Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        document.getElementById('interval').value = val;
        updatePresetActive(val);

        // Se estiver ativo, aplica imediatamente
        const key = `autoReload_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key];
            if (data && data.active) {
                applyChanges(parseInt(val), document.getElementById('hardReload').checked);
            }
        });
    });
});

function updatePresetActive(value) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (btn.getAttribute('data-value') == value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Escutar mudanças no input manual
document.getElementById('interval').addEventListener('input', (e) => {
    updatePresetActive(e.target.value);
});

// Escutar mudanças no Hard Reload
document.getElementById('hardReload').addEventListener('change', (e) => {
    const key = `autoReload_${currentTabId}`;
    chrome.storage.local.get([key], (result) => {
        const data = result[key];
        if (data && data.active) {
            applyChanges(data.interval, e.target.checked);
        }
    });
});

function applyChanges(interval, hardReload) {
    const key = `autoReload_${currentTabId}`;
    const nextReload = Date.now() + (interval * 1000);

    chrome.storage.local.set({
        [key]: {
            active: true,
            interval: interval,
            hardReload: hardReload,
            nextReload: nextReload
        }
    }, () => {
        // Recriar alarme com novo intervalo
        chrome.alarms.create(key, {
            delayInMinutes: interval / 60,
            periodInMinutes: interval / 60
        });
        startCountdown();
    });
}