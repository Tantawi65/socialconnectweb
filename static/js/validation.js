// validation.js
// Client-side validation for login and signup forms using regular expressions

document.addEventListener('DOMContentLoaded', function() {
    // Validation patterns
    const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
    // Password: any character, at least 6 characters
    const passwordPattern = /^.{6,}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Helper to show error
    function showError(input, message) {
        let error = input.parentElement.querySelector('.validation-error');
        if (!error) {
            error = document.createElement('div');
            error.className = 'validation-error';
            error.style.color = 'red';
            error.style.fontSize = '13px';
            error.style.marginTop = '4px';
            input.parentElement.appendChild(error);
        }
        error.textContent = message;
        input.classList.add('input-error');
    }

    function clearError(input) {
        let error = input.parentElement.querySelector('.validation-error');
        if (error) error.remove();
        input.classList.remove('input-error');
    }

    // Validate form
    function validateForm(form, isSignup) {
        let valid = true;
        const username = form.querySelector('input[name="username"]');
        const password = form.querySelector('input[name="password"]');
        const email = form.querySelector('input[name="email"]');
        const passwordConfirm = form.querySelector('input[name="password_confirm"]');

        // Username
        if (username) {
            clearError(username);
            if (!usernamePattern.test(username.value)) {
                showError(username, 'Username must be 3-20 characters, letters, numbers, or _');
                valid = false;
            }
        }
        // Email (signup only)
        if (isSignup && email) {
            clearError(email);
            if (!emailPattern.test(email.value)) {
                showError(email, 'Enter a valid email address');
                valid = false;
            }
        }
        // Password
        if (password) {
            clearError(password);
            if (!passwordPattern.test(password.value)) {
                showError(password, 'Password must be at least 6 characters');
                valid = false;
            }
        }
        // Password confirm (signup only)
        if (isSignup && password && passwordConfirm) {
            clearError(passwordConfirm);
            if (password.value !== passwordConfirm.value) {
                showError(passwordConfirm, 'Passwords do not match');
                valid = false;
            }
        }
        return valid;
    }

    // Attach to forms
    const signupForm = document.querySelector('form.auth-form[action*="signup"], form.auth-form[action=""], form.auth-form[action="."]');
    const loginForm = document.querySelector('form.auth-form[action*="login"], form.auth-form:not([action*="signup"])');

    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            if (!validateForm(signupForm, true)) {
                e.preventDefault();
            }
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            if (!validateForm(loginForm, false)) {
                e.preventDefault();
            }
        });
    }
});
