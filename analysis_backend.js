document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch current runtime metadata from local browser storage
    const targetProduct = localStorage.getItem('currentProduct') || "Vision Pro";

    console.log(`🤖 Monitoring AI Vectorization Layer for: ${targetProduct}`);

    // 2. Poll the FastAPI pipeline-state endpoint every 1 second
    const analyticalLoop = setInterval(async () => {
        try {
            const response = await fetch('http://localhost:8000/api/pipeline-state');
            if (!response.ok) return;

            const data = await response.json();

            // A. Dynamically move the main text percentage metric block
            const progressText = Array.from(document.querySelectorAll('div, p, span, h3'))
                .find(el => el.textContent.includes('Analysis Progress'));
            if (progressText) {
                progressText.innerHTML = `Analysis Progress <strong>${data.progress}%</strong>`;
            }

            // B. DYNAMIC PIPELINE MILESTONE TRACKING
            // As the progress ticks from 50% to 100%, let's flip statuses contextually
            updateMilestone('Data Cleaning', data.progress >= 60, data.progress >= 50);
            updateMilestone('Feature Extraction', data.progress >= 75, data.progress >= 60);
            updateMilestone('Customer Reaction Analysis', data.progress >= 90, data.progress >= 75);
            updateMilestone('Product Sensitivity', data.progress >= 98, data.progress >= 90);

            // C. TERMINATION ROUTING HANDLE: Once status turns to 'completed' (hits 100%)
            // break this loop and automatically route the browser forward to the dashboard!
            if (data.status === 'completed' || data.progress >= 100) {
                clearInterval(analyticalLoop);
                
                // Replace the string below with the EXACT PC disk filename of your final Dashboard page
                window.location.href = "dashboard.html"; 
            }

        } catch (error) {
            console.error("AI processing engine connection lost:", error);
        }
    }, 1000);

    // Reusable UI tree traversal function to flip pipeline text states cleanly
    function updateMilestone(milestoneName, isComplete, isProcessing) {
        const headerNode = Array.from(document.querySelectorAll('h3, div, p'))
            .find(el => el.textContent.includes(milestoneName));
        
        if (headerNode) {
            // Traverse down to find the immediate status text right below the header template
            const container = headerNode.parentElement;
            const statusNode = Array.from(container.querySelectorAll('p, div, span'))
                .find(el => el.textContent.includes('Waiting') || el.textContent.includes('Processing') || el.textContent.includes('Complete'));
            
            if (statusNode) {
                if (isComplete) {
                    statusNode.innerHTML = `<span style="color: #28a745; font-weight: bold;">✓ Complete</span>`;
                } else if (isProcessing) {
                    statusNode.innerHTML = `<span style="color: #007bff; font-weight: bold;">Processing...</span>`;
                }
            }
        }
    }
});
