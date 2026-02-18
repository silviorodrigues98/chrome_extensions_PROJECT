// WhatsApp Signature Content Script
// Injects a signature button into the WhatsApp Web chat footer

(function () {
    let signatureButton = null;
    let observer = null;

    function init() {
        // Observe DOM for the chat footer
        observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial check
        injectButton();
    }

    function handleMutations() {
        if (!document.getElementById('hub-sig-button')) {
            injectButton();
        }
    }

    function injectButton() {
        // Find the chat footer where the input and icons are
        // Looking for the container of the message input or the emoji button
        const footer = document.querySelector('footer');
        if (!footer) return;

        // Find the icon group (usually at the start or end of the input bar)
        // WhatsApp Web footer structure changes, but usually there's a group of buttons
        const targetContainer = footer.querySelector('div[title="Emoji"]') ||
            footer.querySelector('button[aria-label="Emoji"]') ||
            footer.querySelector('div.lexical-rich-text-input')?.parentElement;

        if (!targetContainer || document.getElementById('hub-sig-button')) return;

        // Create the button
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

        // Insert before or after the emoji button
        if (targetContainer.tagName === 'BUTTON' || targetContainer.hasAttribute('title')) {
            targetContainer.parentElement.insertBefore(signatureButton, targetContainer.nextSibling);
        } else {
            // Fallback: just append to the footer's main action area
            const actionArea = footer.querySelector('div > div > div > div > span:last-child')?.parentElement;
            if (actionArea) {
                actionArea.appendChild(signatureButton);
            }
        }
    }

    async function appendSignatureToInput() {
        console.log('Utility Hub: Floating button clicked. Fetching signature...');

        const result = await chrome.storage.local.get(['whatsapp_global_signature']);
        const sig = result.whatsapp_global_signature || '─ ꜱɪʟᴠɪᴏ';

        console.log('Utility Hub: Signature text length:', sig.length);

        const selectors = [
            '#main footer div[contenteditable="true"][role="textbox"]',
            'footer .lexical-rich-text-input [contenteditable="true"]',
            '.copyable-text.selectable-text[contenteditable="true"]',
            'footer [contenteditable="true"]',
            '[data-tab="10"]'
        ];

        let input = null;
        for (const selector of selectors) {
            input = document.querySelector(selector);
            if (input) {
                console.log('Utility Hub: Found input using selector:', selector);
                break;
            }
        }

        if (!input) {
            console.error('Utility Hub: Message input field not found');
            return;
        }

        const getNormalizedText = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        const initialTextNormalized = getNormalizedText(input);
        const initialLength = (input.innerText || '').length;

        const prefix = (initialLength > 0) ? '\n\n' : '';
        const fullSig = prefix + sig;

        console.log('Utility Hub: Initial text length:', initialLength);

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const tryInsert = async (methodName, action) => {
            console.log(`Utility Hub: Trying method: ${methodName}`);
            input.focus();

            // Set cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(input);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            action();

            // Wait a bit for the framework to update the DOM
            await wait(50);

            const currentText = input.innerText || '';
            const currentNormalized = getNormalizedText(input);

            if (currentText.length > initialLength || currentNormalized !== initialTextNormalized || currentText.includes(sig)) {
                console.log(`Utility Hub: Success using ${methodName}`);
                ['input', 'change', 'keydown', 'keyup'].forEach(type => {
                    input.dispatchEvent(new Event(type, { bubbles: true }));
                });
                return true;
            }
            console.warn(`Utility Hub: ${methodName} seemed to fail`);
            return false;
        };

        // Method 1: execCommand
        if (await tryInsert('execCommand', () => {
            try {
                document.execCommand('insertText', false, fullSig);
            } catch (e) { console.error(e); }
        })) return;

        // Method 2: InputEvent
        if (await tryInsert('InputEvent', () => {
            const event = new InputEvent('beforeinput', {
                inputType: 'insertText',
                data: fullSig,
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(event);
        })) return;

        // Method 3: Direct Value Assignment
        console.log('Utility Hub: Final fallback: Direct manipulation');
        const prevValue = input.innerText || '';
        input.innerText = prevValue + fullSig;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    init();
})();
