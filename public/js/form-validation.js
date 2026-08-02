document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('form');
    forms.forEach(function (form) {
        // Skip search forms, newsletters or forms with onsubmit return false that don't need validation
        if (form.getAttribute('onsubmit') === 'return false;' || 
            form.classList.contains('search-form-te') || 
            form.getAttribute('action') === '/admin/products' ||
            form.getAttribute('action') === '/admin/product' ||
            form.getAttribute('action') === '/admin/category' ||
            form.getAttribute('action') === '/admin/brand' ||
            form.getAttribute('action') === '/admin/users' ||
            form.getAttribute('action') === '/admin/coupon') {
            return;
        }

        form.setAttribute('novalidate', '');

        form.addEventListener('submit', function (e) {
            let isValid = true;
            // Clear existing error messages
            form.querySelectorAll('.error-msg, .form-error-msg').forEach(el => el.remove());

            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(function (input) {
                // If it's a hidden input, skip
                if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;
                
                // Native validation check
                if (!input.checkValidity()) {
                    isValid = false;
                    showInputError(input, input.validationMessage);
                } else {
                    // Extra validations
                    if (input.type === 'email' && input.value.trim() !== '') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(input.value.trim())) {
                            isValid = false;
                            showInputError(input, 'Please enter a valid email address.');
                        }
                    }
                    if (input.type === 'tel' && input.value.trim() !== '') {
                        const phoneRegex = /^[6-9]\d{9}$/;
                        if (!phoneRegex.test(input.value.trim())) {
                            isValid = false;
                            showInputError(input, 'Please enter a valid 10-digit mobile number.');
                        }
                    }
                    // For confirm password fields
                    if (input.id === 'confirmPassword' || input.name === 'confirmPassword') {
                        const pwd = form.querySelector('input[type="password"]:not([id="confirmPassword"]):not([name="confirmPassword"])');
                        if (pwd && pwd.value !== input.value) {
                            isValid = false;
                            showInputError(input, 'Passwords do not match.');
                        }
                    }
                }
            });

            if (!isValid) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Clear error on input
        form.querySelectorAll('input, select, textarea').forEach(function (input) {
            input.addEventListener('input', function () {
                const parent = input.closest('.input-wrap') || input;
                const errorSibling = parent.nextElementSibling;
                if (errorSibling && (errorSibling.classList.contains('error-msg') || errorSibling.classList.contains('form-error-msg'))) {
                    errorSibling.remove();
                }
            });
        });
    });

    function showInputError(input, message) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-msg text-danger';
        errorMsg.style.color = '#ff3333';
        errorMsg.style.fontSize = '12px';
        errorMsg.style.marginTop = '4px';
        errorMsg.style.display = 'block';
        errorMsg.innerText = message;

        const parent = input.closest('.input-wrap') || input;
        
        // Remove any existing error message next to it first
        const next = parent.nextElementSibling;
        if (next && (next.classList.contains('error-msg') || next.classList.contains('form-error-msg'))) {
            next.remove();
        }
        
        parent.after(errorMsg);
    }
});
