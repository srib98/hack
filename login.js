document.addEventListener('DOMContentLoaded', () => {
    // 1. Locate the UI elements from the Login page
    // Using standard selectors matching your page elements
    const loginButton = document.querySelector('button') || document.querySelector('.btn');
    const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[placeholder*="Email"]');
    const passwordInput = document.querySelector('input[type="password"]') || document.querySelector('input[placeholder*="Password"]');

    if (loginButton) {
        loginButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent standard page reloads

            // 2. Simple validation guard for your hackathon pitch
            if (emailInput && emailInput.value.trim() === "") {
                alert("Please enter your email address to continue.");
                return;
            }
            if (passwordInput && passwordInput.value.trim() === "") {
                alert("Please enter your password.");
                return;
            }

            // 3. Smoothly route the user to the next step on your computer disk
            // Make sure this filename matches your next screen exactly!
            window.location.href = "product.html";
        });
    }
});
