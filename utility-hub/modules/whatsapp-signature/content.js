// WhatsApp Signature Content Script
// Injects a signature button into the WhatsApp Web chat footer

(function () {
    let signatureButton = null;
    let observer = null;

    let settings = {
        whatsapp_auto_enter: false,
        whatsapp_global_signature: '─ ꜱɪʟᴠɪᴏ'
    };

    async function loadSettings() {
        const result = await chrome.storage.local.get(['whatsapp_auto_enter', 'whatsapp_global_signature']);
        settings.whatsapp_auto_enter = !!result.whatsapp_auto_enter;
        if (result.whatsapp_global_signature) {
            settings.whatsapp_global_signature = result.whatsapp_global_signature;
        }
    }

    function init() {
        loadSettings();

        // Listen for setting changes
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.whatsapp_auto_enter) {
                settings.whatsapp_auto_enter = changes.whatsapp_auto_enter.newValue;
            }
            if (changes.whatsapp_global_signature) {
                settings.whatsapp_global_signature = changes.whatsapp_global_signature.newValue;
            }
        });

        // Observe DOM for the chat footer
        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });

        // Keyboard shortcut and automation listener
        document.addEventListener('keydown', (e) => {
            // Alt + S Shortcut
            if (e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                appendSignatureToInput();
                return;
            }

            // Enter key automation
            if (e.key === 'Enter' && !e.shiftKey && settings.whatsapp_auto_enter) {
                const input = getActiveInput();
                if (input && !input.innerText.includes(settings.whatsapp_global_signature)) {
                    // Prevent original Enter synchronously to allow signature insertion first
                    e.preventDefault();
                    e.stopPropagation();

                    appendSignatureToInput(true); // true means trigger send
                }
            }
        }, true); // Capture phase to intervene before WhatsApp's own handlers

        // Initial check
        injectButton();
    }

    function getActiveInput() {
        const selectors = [
            '#main footer div[contenteditable="true"][role="textbox"]',
            'footer .lexical-rich-text-input [contenteditable="true"]',
            '.copyable-text.selectable-text[contenteditable="true"]',
            'footer [contenteditable="true"]',
            '[data-tab="10"]'
        ];

        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) return input;
        }
        return null;
    }

    function handleMutations() {
        if (!document.getElementById('hub-sig-button')) {
            injectButton();
        }
    }

    function injectButton() {
        const footer = document.querySelector('footer');
        if (!footer) return;

        const targetContainer = footer.querySelector('div[title="Emoji"]') ||
            footer.querySelector('button[aria-label="Emoji"]') ||
            footer.querySelector('div.lexical-rich-text-input')?.parentElement;

        if (!targetContainer || document.getElementById('hub-sig-button')) return;

        signatureButton = document.createElement('button');
        signatureButton.id = 'hub-sig-button';
        signatureButton.title = 'Anexar Assinatura';
        signatureButton.className = 'hub-sig-btn';
        signatureButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
        `;

        signatureButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            appendSignatureToInput();
        });

        if (targetContainer.tagName === 'BUTTON' || targetContainer.hasAttribute('title')) {
            targetContainer.parentElement.insertBefore(signatureButton, targetContainer.nextSibling);
        } else {
            const actionArea = footer.querySelector('div > div > div > div > span:last-child')?.parentElement;
            if (actionArea) {
                actionArea.appendChild(signatureButton);
            }
        }
    }

    async function appendSignatureToInput(triggerSend = false) {
        const sig = settings.whatsapp_global_signature;
        const input = getActiveInput();
        if (!input) return;

        const getNormalizedText = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        const initialTextNormalized = getNormalizedText(input);
        const initialLength = (input.innerText || '').length;

        const prefix = (initialLength > 0) ? '\n\n' : '';
        const fullSig = prefix + sig;

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const tryInsert = async (methodName, action) => {
            input.focus();

            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(input);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            action();
            await wait(50);

            const currentText = input.innerText || '';
            const currentNormalized = getNormalizedText(input);

            if (currentText.length > initialLength || currentNormalized !== initialTextNormalized || currentText.includes(sig)) {
                ['input', 'change', 'keydown', 'keyup'].forEach(type => {
                    input.dispatchEvent(new Event(type, { bubbles: true }));
                });
                return true;
            }
            return false;
        };

        let success = await tryInsert('execCommand', () => {
            try {
                document.execCommand('insertText', false, fullSig);
            } catch (e) { }
        });

        if (!success) {
            success = await tryInsert('InputEvent', () => {
                const event = new InputEvent('beforeinput', {
                    inputType: 'insertText',
                    data: fullSig,
                    bubbles: true,
                    cancelable: true
                });
                input.dispatchEvent(event);
            });
        }

        if (!success) {
            const prevValue = input.innerText || '';
            input.innerText = prevValue + fullSig;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            success = true;
        }

        if (triggerSend && success) {
            await wait(150); // Give WhatsApp a bit more time to update its state
            const sendBtn = document.querySelector('footer button span[data-icon="send"]')?.parentElement ||
                document.querySelector('footer button[aria-label="Send"]') ||
                document.querySelector('footer button span[data-testid="send"]')?.parentElement;

            if (sendBtn) {
                sendBtn.click();
            } else {
                input.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                }));
            }
        }
    }

    init();
})();
