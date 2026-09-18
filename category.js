// Matches HTML signature: selectCategory(this, 'Category Name')
window.selectCategory = function(element, categoryName) {
    // 1. Remove selected state from all cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('selected');
    });

    // 2. Highlight current clicked card
    if (element) {
        element.classList.add('selected');
    }

    // 3. Save selected category
    localStorage.setItem('selectedCategory', categoryName);

    // 4. Update status display text (matched id="selectedText")
    const displayEl = document.getElementById('selectedText');
    if (displayEl) {
        displayEl.textContent = `Selected Category: ${categoryName}`;
    }

    // 5. Unlock CONTINUE button by adding .active class
    const continueBtn = document.getElementById('continueButton');
    if (continueBtn) {
        continueBtn.classList.add('active');
    }
};

// Triggered when clicking the CONTINUE button
window.continueToProduct = function() {
    const selected = localStorage.getItem('selectedCategory');
    if (!selected) {
        alert('Please select a category first.');
        return;
    }
    // Redirect to details page
    window.location.href = "details.html";
};