let currentTabId;

// Obter informações da aba atual
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
        currentTabId = tabs[0].id;
        loadStatus();
    }
});

// Carregar status
function loadStatus() {
    chrome.storage.local.get([`autoReload_${currentTabId}`], (result) => {
        const data = result[`autoReload_${currentTabId}`] || {};
        const isActive = data.active || false;
        const interval = data.interval || 60;

        document.getElementById('interval').value = interval;
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

    if (isActive) {
        toggleBtn.textContent = 'Parar';
        toggleBtn.classList.add('active');
        statusIndicator.classList.add('active');
        statusText.textContent = 'Ativo';
        countdownContainer.style.display = 'block';
    } else {
        toggleBtn.textContent = 'Iniciar';
        toggleBtn.classList.remove('active');
        statusIndicator.classList.remove('active');
        statusText.textContent = 'Inativo';
        countdownContainer.style.display = 'none';
    }
}

// Countdown
let countdownInterval;
function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        chrome.storage.local.get([`autoReload_${currentTabId}`], (result) => {
            const data = result[`autoReload_${currentTabId}`];
            if (!data || !data.active) {
                clearInterval(countdownInterval);
                return;
            }

            const remaining = Math.max(0, Math.ceil((data.nextReload - Date.now()) / 1000));
            document.getElementById('countdown').textContent = remaining;
        });
    }, 1000);
}

// Botão Iniciar/Parar
document.getElementById('toggleBtn').addEventListener('click', () => {
    chrome.storage.local.get([`autoReload_${currentTabId}`], (result) => {
        const data = result[`autoReload_${currentTabId}`] || {};
        const isActive = data.active || false;

        if (isActive) {
            // Parar
            chrome.storage.local.set({
                [`autoReload_${currentTabId}`]: { active: false }
            }, () => {
                updateUI(false);
                if (countdownInterval) clearInterval(countdownInterval);
            });
        } else {
            // Iniciar
            const interval = parseInt(document.getElementById('interval').value);
            if (interval < 5) {
                alert('O intervalo mínimo é de 5 segundos!');
                return;
            }

            chrome.storage.local.set({
                [`autoReload_${currentTabId}`]: {
                    active: true,
                    interval: interval,
                    nextReload: Date.now() + (interval * 1000)
                }
            }, () => {
                updateUI(true);
                startCountdown();
            });
        }
    });
});

// Botão Aplicar
document.getElementById('applyBtn').addEventListener('click', () => {
    const interval = parseInt(document.getElementById('interval').value);
    if (interval < 5) {
        alert('O intervalo mínimo é de 5 segundos!');
        return;
    }

    chrome.storage.local.get([`autoReload_${currentTabId}`], (result) => {
        const data = result[`autoReload_${currentTabId}`] || {};

        chrome.storage.local.set({
            [`autoReload_${currentTabId}`]: {
                ...data,
                interval: interval,
                nextReload: Date.now() + (interval * 1000)
            }
        }, () => {
            alert('Intervalo atualizado!');
            if (data.active) {
                startCountdown();
            }
        });
    });
});