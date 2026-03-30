(function () {
    'use strict';

    // ====================================================================
    // Auth Token Storage Utility (localStorage)
    // ====================================================================
    var AuthStorage = {
        TOKEN_KEY: 'theron_auth_token',
        USER_KEY: 'theron_auth_user',

        /**
         * Save token and user data to localStorage.
         * @param {string} token - JWT token
         * @param {object} user - User data (email, fullName, id, roles)
         */
        setAuth: function (token, user) {
            try {
                localStorage.setItem(this.TOKEN_KEY, token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(user || {}));
            } catch (e) {
                console.error('Failed to save auth:', e);
            }
        },

        /**
         * Get token from localStorage.
         * @returns {string|null}
         */
        getToken: function () {
            try {
                return localStorage.getItem(this.TOKEN_KEY) || null;
            } catch (e) {
                return null;
            }
        },

        /**
         * Get user data from localStorage.
         * @returns {object|null}
         */
        getUser: function () {
            try {
                var data = localStorage.getItem(this.USER_KEY);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                return null;
            }
        },

        /**
         * Check if user is authenticated.
         * @returns {boolean}
         */
        isAuthenticated: function () {
            return this.getToken() !== null;
        },

        /**
         * Clear auth data (logout).
         */
        clear: function () {
            try {
                localStorage.removeItem(this.TOKEN_KEY);
                localStorage.removeItem(this.USER_KEY);
            } catch (e) {
                console.error('Failed to clear auth:', e);
            }
        }
    };

    // Make AuthStorage globally available
    window.AuthStorage = AuthStorage;

    // ====================================================================
    // Login Page Handler
    // ====================================================================
    function initLoginPage() {
        var form = document.querySelector('#tt-login-form');
        var emailInput = document.querySelector('#tt-login-email');
        var passwordInput = document.querySelector('#tt-login-password');
        var submitBtn = document.querySelector('#tt-login-submit');
        var feedbackNode = document.querySelector('#tt-login-feedback');

        if (!form) return;

        function showMessage(text, isError) {
            feedbackNode.textContent = text;
            feedbackNode.classList.remove('hidden');
            feedbackNode.classList.toggle('error', isError);
            feedbackNode.classList.toggle('success', !isError);
        }

        function clearMessage() {
            feedbackNode.textContent = '';
            feedbackNode.classList.add('hidden');
            feedbackNode.classList.remove('error', 'success');
        }

        function getReturnUrl() {
            var params = new URLSearchParams(window.location.search);
            var returnUrl = params.get('return') || '/theron-tour';
            // Basic validation to prevent open redirects
            if (returnUrl.startsWith('http') || returnUrl.startsWith('//')) {
                return '/theron-tour';
            }
            return returnUrl;
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            clearMessage();

            var email = (emailInput.value || '').trim();
            var password = passwordInput.value || '';

            // Client-side validation
            if (!email) {
                showMessage('Por favor, preencha seu e-mail.', true);
                emailInput.focus();
                return;
            }

            if (!password) {
                showMessage('Por favor, preencha sua senha.', true);
                passwordInput.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
                .then(function (response) {
                    return response.json().catch(function () { return {}; });
                })
                .then(function (json) {
                    var payload = json && json.data !== undefined ? json.data : json;

                    // Check success
                    if (!json.success || !payload || !payload.token) {
                        var msg = (json.message || 'Falha na autenticacao.').toLowerCase();
                        if (msg.indexOf('invalid') !== -1 || msg.indexOf('email') !== -1) {
                            showMessage('E-mail ou senha invalidos.', true);
                        } else if (msg.indexOf('validation') !== -1) {
                            showMessage('Por favor, preencha todos os campos corretamente.', true);
                        } else {
                            showMessage(json.message || 'Erro ao fazer login. Tente novamente.', true);
                        }
                        return;
                    }

                    // Save token and user
                    AuthStorage.setAuth(payload.token, {
                        id: payload.id,
                        email: payload.email,
                        fullName: payload.fullName,
                        roles: payload.roles || ['USER']
                    });

                    // Redirect to return URL
                    var returnUrl = getReturnUrl();
                    setTimeout(function () {
                        window.location.href = returnUrl;
                    }, 300);
                })
                .catch(function (err) {
                    console.error('Login error:', err);
                    showMessage('Nao foi possivel conectar ao servidor. Tente novamente.', true);
                })
                .finally(function () {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Entrar';
                });
        });

        // Prefill if redirected back from checkout
        var returnParam = new URLSearchParams(window.location.search).get('return');
        if (returnParam) {
            var hint = new URLSearchParams(window.location.search).get('email');
            if (hint) {
                emailInput.value = hint;
            }
        }
    }

    // ====================================================================
    // Signup Page Handler
    // ====================================================================
    function initSignupPage() {
        var form = document.querySelector('#tt-signup-form');
        var fullNameInput = document.querySelector('#tt-signup-fullname');
        var emailInput = document.querySelector('#tt-signup-email');
        var phoneInput = document.querySelector('#tt-signup-phone');
        var passwordInput = document.querySelector('#tt-signup-password');
        var passwordConfirmInput = document.querySelector('#tt-signup-password-confirm');
        var submitBtn = document.querySelector('#tt-signup-submit');
        var feedbackNode = document.querySelector('#tt-signup-feedback');

        if (!form) return;

        function showMessage(text, isError) {
            feedbackNode.textContent = text;
            feedbackNode.classList.remove('hidden');
            feedbackNode.classList.toggle('error', isError);
            feedbackNode.classList.toggle('success', !isError);
        }

        function clearMessage() {
            feedbackNode.textContent = '';
            feedbackNode.classList.add('hidden');
            feedbackNode.classList.remove('error', 'success');
        }

        function getReturnUrl() {
            var params = new URLSearchParams(window.location.search);
            var returnUrl = params.get('return') || '/theron-tour';
            if (returnUrl.startsWith('http') || returnUrl.startsWith('//')) {
                return '/theron-tour';
            }
            return returnUrl;
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            clearMessage();

            var fullName = (fullNameInput.value || '').trim();
            var email = (emailInput.value || '').trim();
            var phone = (phoneInput.value || '').trim();
            var password = passwordInput.value || '';
            var passwordConfirm = passwordConfirmInput.value || '';

            // Client-side validation
            if (!fullName) {
                showMessage('Por favor, preencha seu nome completo.', true);
                fullNameInput.focus();
                return;
            }

            if (!email) {
                showMessage('Por favor, preencha seu e-mail.', true);
                emailInput.focus();
                return;
            }

            // Basic email validation
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Por favor, preencha um e-mail valido.', true);
                emailInput.focus();
                return;
            }

            if (!phone) {
                showMessage('Por favor, preencha seu telefone.', true);
                phoneInput.focus();
                return;
            }

            if (!password) {
                showMessage('Por favor, preencha sua senha.', true);
                passwordInput.focus();
                return;
            }

            if (password.length < 6) {
                showMessage('A senha deve ter no minimo 6 caracteres.', true);
                passwordInput.focus();
                return;
            }

            if (password !== passwordConfirm) {
                showMessage('As senhas nao conferem. Tente novamente.', true);
                passwordConfirmInput.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';

            fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    password: password
                })
            })
                .then(function (response) {
                    return response.json().catch(function () { return {}; });
                })
                .then(function (json) {
                    var payload = json && json.data !== undefined ? json.data : json;

                    // Check success
                    if (!json.success || !payload || !payload.token) {
                        var msg = json.message || 'Erro ao fazer cadastro.';

                        // Handle specific error cases
                        if (msg.toLowerCase().indexOf('already') !== -1 || msg.toLowerCase().indexOf('ja') !== -1) {
                            showMessage('Este e-mail ja esta cadastrado. Faca login em vez de se cadastrar.', true);
                        } else if (json.errors && json.errors.email) {
                            showMessage(json.errors.email, true);
                        } else if (json.errors && json.errors.password) {
                            showMessage(json.errors.password, true);
                        } else {
                            showMessage(msg, true);
                        }
                        return;
                    }

                    // Save token and user
                    AuthStorage.setAuth(payload.token, {
                        id: payload.id,
                        email: payload.email,
                        fullName: payload.fullName,
                        roles: payload.roles || ['USER']
                    });

                    // Redirect to return URL
                    var returnUrl = getReturnUrl();
                    setTimeout(function () {
                        window.location.href = returnUrl;
                    }, 300);
                })
                .catch(function (err) {
                    console.error('Signup error:', err);
                    showMessage('Nao foi possivel conectar ao servidor. Tente novamente.', true);
                })
                .finally(function () {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Cadastrar';
                });
        });
    }

    // Export functions globally
    window.initLoginPage = initLoginPage;
    window.initSignupPage = initSignupPage;

    // ====================================================================
    // Global logout function
    // ====================================================================
    window.logout = function () {
        AuthStorage.clear();
        window.location.href = '/';
    };

    // ====================================================================
    // Update navigation auth buttons (called on all pages)
    // ====================================================================
    window.updateNavAuth = function () {
        var headerAuthContainer = document.querySelector('.header-auth');
        if (!headerAuthContainer) { return; }

        var isAuth = AuthStorage.isAuthenticated();
        var user = AuthStorage.getUser();

        if (isAuth && user) {
            headerAuthContainer.innerHTML = [
                '<span class="header-user-name inter">' + user.fullName + '</span>',
                '<button class="btn btn-logout inter" onclick="window.logout()">Sair</button>'
            ].join('');
        } else {
            headerAuthContainer.innerHTML = [
                '<a href="/auth/login" class="btn btn-outline-primary inter">Entrar</a>',
                '<a href="/auth/signup" class="btn btn-primary inter">Cadastrar</a>'
            ].join('');
        }
    };

    // Auto-update on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            window.updateNavAuth();
        });
    } else {
        window.updateNavAuth();
    }
})();
