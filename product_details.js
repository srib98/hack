// Explicitly define window.startAnalysis to match onclick="startAnalysis()" in HTML
window.startAnalysis = async function() {
    // 1. Grab values directly using the IDs defined in details.html
    const category = localStorage.getItem('selectedCategory') || 'Electronics';
    const productName = document.getElementById('productName')?.value.trim() || '';
    const brand = document.getElementById('brand')?.value.trim() || '';
    const price = parseFloat(document.getElementById('price')?.value) || 0.0;
    const currency = document.getElementById('currency')?.value || 'INR';
    const description = document.getElementById('description')?.value.trim() || '';

    // 2. Prevent rushing forward if Name is missing
    if (!productName) {
        alert("Please enter a Product Name before starting the analysis.");
        return;
    }

    const payload = {
        category: category,
        product_name: productName,
        brand: brand,
        price: price,
        currency: currency,
        description: description
    };

    // Store state locally for downstream dashboard screens
    localStorage.setItem('currentProduct', productName);
    localStorage.setItem('productPayload', JSON.stringify(payload));

    try {
        // 3. Post to backend ingestion pipeline
        const response = await fetch('http://localhost:8000/api/start-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.session_id) {
                localStorage.setItem('sessionId', data.session_id);
            }
            // Navigate only after backend acknowledges processing start
            window.location.href = "review.html";
        } else {
            alert("❌ Backend rejected parameters. Verify your FastAPI engine status.");
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Could not connect to FastAPI backend at http://localhost:8000. Ensure uvicorn is running.");
    }
};

// Populate initial Category Header & Info on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    const selectedCat = localStorage.getItem('selectedCategory') || 'Electronics';
    const categoryLabel = document.getElementById('categoryName');
    if (categoryLabel) {
        categoryLabel.textContent = selectedCat;
    }
});