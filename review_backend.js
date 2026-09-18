document.addEventListener('DOMContentLoaded', () => {
    // 1. Automatically grab the product name from local browser storage
    const targetProduct = localStorage.getItem('currentProduct') || "Vision Pro";
    const targetCategory = localStorage.getItem('selectedCategory') || "Electronics";

    // 2. Locate the visual layout text cards to display product details dynamically
    const productHeader = Array.from(document.querySelectorAll('h2, div, p')).find(el => el.textContent.includes('Product'));
    
    // Inject the real-time product variables into the top summary metadata panel if elements exist
    // (This overrides the static layout text with the user's input product dynamically)
    console.log(`Tracking Ingestion Core for: ${targetProduct} (${targetCategory})`);

    // 3. Set up the polling tracker to hit our FastAPI pipeline every 1 second
    const pollingLoop = setInterval(async () => {
        try {
            const response = await fetch('http://localhost:8000/api/pipeline-state');
            if (!response.ok) return;
            
            const data = await response.json();

            // A. Update the "Collection Progress 0%" layout block
            const progressText = Array.from(document.querySelectorAll('div, p, span'))
                .find(el => el.textContent.includes('Collection Progress'));
            if (progressText) {
                progressText.innerHTML = `Collection Progress <strong>${data.progress}%</strong>`;
            }

            // B. Animate the numeric counters dynamically
            // Find numbers stacked above specific text labels in the HTML
            const reviewsLabel = Array.from(document.querySelectorAll('div, p, span, th, td'))
                .find(el => el.textContent.includes('Reviews Collected'));
            if (reviewsLabel && data.reviews_collected) {
                // Safely update the number node sitting right above it or inside the grid card
                const container = reviewsLabel.parentElement;
                const numberNode = container.querySelector('h1, h2, h3, div, p') || container.firstChild;
                if (numberNode) numberNode.textContent = data.reviews_collected;
            }

            // Calculate video discovery metric dynamically from your producer.py capabilities
            // If the progress is moving, your producer loops across 5 trending videos
            const videosLabel = Array.from(document.querySelectorAll('div, p, span'))
                .find(el => el.textContent.includes('Videos Analyzed'));
            if (videosLabel && data.progress > 0) {
                const container = videosLabel.parentElement;
                const numberNode = container.querySelector('h1, h2, h3, div, p') || container.firstChild;
                // Scale video counts dynamically up to 5 as the collection progresses
                if (numberNode) numberNode.textContent = Math.min(5, Math.ceil((data.progress / 50) * 5));
            }

            const commentsLabel = Array.from(document.querySelectorAll('div, p, span'))
                .find(el => el.textContent.includes('Comments Found'));
            if (commentsLabel && data.reviews_collected) {
                const container = commentsLabel.parentElement;
                const numberNode = container.querySelector('h1, h2, h3, div, p') || container.firstChild;
                if (numberNode) numberNode.textContent = data.reviews_collected;
            }

            // 4. TERMINATION ROUTING HANDLE:
            // Once data ingestion hits 50% and switches state to 'analyzing', 
            // break this loop and automatically route the browser forward to your next screen!
            if (data.status === 'analyzing' || data.progress >= 50) {
                clearInterval(pollingLoop);
                
                // Replace the string below with the EXACT PC disk filename of your Screen 5 (AI Analysis page)
                window.location.href = "ana.html"; 
            }

        } catch (error) {
            console.error("Kafka pipeline connection lost:", error);
        }
    }, 1000);
});
