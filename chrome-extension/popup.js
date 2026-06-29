document.addEventListener('DOMContentLoaded', () => {
    // URL Base da sua API (Atualize para a URL de produção quando publicar)
    const API_BASE_URL = 'http://localhost:3000'; 
    
    // Elementos da interface
    const loginView = document.getElementById('loginView');
    const captureView = document.getElementById('captureView');
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    
    const captureBtn = document.getElementById('captureBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    const statusDiv = document.getElementById('status');

    let currentUser = null;

    // Inicialização: Verifica se já está logado
    chrome.storage.local.get(['user'], (result) => {
        if (result.user && result.user.id) {
            currentUser = result.user;
            showCaptureView();
        } else {
            showLoginView();
        }
    });

    // Ação de Login
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showStatus('Preencha e-mail e senha.', 'error');
            return;
        }

        loginBtn.disabled = true;
        showStatus('Autenticando...', 'loading');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/extension`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao autenticar');
            }

            // Login com sucesso, salva o usuário
            currentUser = data.user;
            chrome.storage.local.set({ user: currentUser });
            
            showStatus('Login efetuado!', 'success');
            setTimeout(() => {
                showCaptureView();
            }, 500);

        } catch (error) {
            showStatus(error.message, 'error');
        } finally {
            loginBtn.disabled = false;
        }
    });

    // Ação de Logout
    logoutBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['user']);
        currentUser = null;
        emailInput.value = '';
        passwordInput.value = '';
        showLoginView();
    });

    // Ação de Captura
    captureBtn.addEventListener('click', () => {
        if (!currentUser || !currentUser.id) return;

        captureBtn.disabled = true;
        showStatus('Capturando e enviando...', 'loading');

        // Envia mensagem para o background worker
        chrome.runtime.sendMessage({ 
            action: "captureAndSend", 
            userId: currentUser.id 
        }, (response) => {
            captureBtn.disabled = false;
            
            if (chrome.runtime.lastError) {
                showStatus('Erro: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            if (response && response.success) {
                showStatus('Enviado com sucesso ao n8n!', 'success');
                setTimeout(() => {
                    window.close(); // Fecha o popup após sucesso
                }, 2000);
            } else {
                showStatus('Erro: ' + (response?.error || 'Falha na comunicação'), 'error');
            }
        });
    });

    // Funções auxiliares
    function showLoginView() {
        loginView.classList.add('active');
        captureView.classList.remove('active');
        showStatus('', '');
    }

    function showCaptureView() {
        loginView.classList.remove('active');
        captureView.classList.add('active');
        userNameDisplay.textContent = currentUser.name || currentUser.email;
        showStatus('', '');
    }

    function showStatus(msg, className) {
        statusDiv.textContent = msg;
        statusDiv.className = 'status ' + className;
    }
});
