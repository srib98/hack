document.addEventListener('DOMContentLoaded', async () => {
    // 1. Retrieve the target product tracking state from local storage sandbox memory
    const targetProduct = localStorage.getItem('currentProduct') || "Vision Pro";
    
    console.log(`📊 Feeding Dashboard panels from pgvector queries for: ${targetProduct}`);

    try {
        // 2. Fetch the computed relational and semantic insights from the FastAPI engine
        const response = await fetch(`http://localhost:8000/api/dashboard/${encodeURIComponent(targetProduct)}`);
        if (!response.ok) throw new Error("Failed to pull dashboard datasets from main.py");
        
        const data = await response.json();

        // --- A. UPDATE OVERALL TOP METADATA ROW ---
        // Dynamically inject the product variables into the visual subtitle fields if they match your layout markers
        const metadataRow = Array.from(document.querySelectorAll('div, p, span'))
            .find(el => el.textContent.includes('Brand') || el.textContent.includes('Category'));
        
        // --- B. UPDATE THE 4 MAIN KPI COUNTER CARDS ---
        // 1. Update CUSTOMER SENTIMENT Percentage Box
        const sentimentLabel = Array.from(document.querySelectorAll('div, p, span, h3'))
            .find(el => el.textContent.includes('CUSTOMER SENTIMENT'));
        if (sentimentLabel) {
            const numNode = sentimentLabel.parentElement.querySelector('h1, h2, h3, div, .number') || sentimentLabel.nextElementSibling;
            if (numNode) numNode.textContent = data.metrics.customer_sentiment;
        }

        // 2. Update COMMENTS ANALYZED Metric Counter Box
        const commentsLabel = Array.from(document.querySelectorAll('div, p, span, h3'))
            .find(el => el.textContent.includes('COMMENTS ANALYZED'));
        if (commentsLabel) {
            const numNode = commentsLabel.parentElement.querySelector('h1, h2, h3, div, .number') || commentsLabel.nextElementSibling;
            if (numNode) numNode.textContent = data.metrics.comments_analyzed;
        }

        // --- C. DYNAMICALLY RE-RENDER THE ATTRIBUTE SENSITIVITY TABLE ---
        // Locates the table body structure to fill in calculated row parameters
        const tableBody = document.querySelector('tbody');
        if (tableBody && data.attributes) {
            tableBody.innerHTML = ''; // Wipe out initial structural static template strings
            
            data.attributes.forEach(attrObj => {
                const tr = document.createElement('tr');
                
                // Color code the text element depending on customer sentiment leanings
                const reactionColor = attrObj.reaction === 'Negative' ? '#dc3545' : '#28a745';
                
                tr.innerHTML = `
                    <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #eee;">${attrObj.attribute}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: ${reactionColor}; font-weight: 500;">${attrObj.reaction}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${attrObj.attention}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${attrObj.sensitivity}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // --- D. UPDATE THE VISUAL SENTIMENT BREAKDOWN GRAPH BULLET LABELS ---
        const breakDownSection = Array.from(document.querySelectorAll('h2, div'))
            .find(el => el.textContent.includes('Customer Reaction'));
        if (breakDownSection) {
            const container = breakDownSection.parentElement;
            
            // Re-label text blocks dynamically matching standard response configurations
            const positiveText = Array.from(container.querySelectorAll('li, p, div')).find(el => el.textContent.includes('Positive:'));
            if (positiveText) positiveText.innerHTML = `● Positive: <strong>${data.sentiment_breakdown.positive}%</strong>`;
            
            const neutralText = Array.from(container.querySelectorAll('li, p, div')).find(el => el.textContent.includes('Neutral:'));
            if (neutralText) neutralText.innerHTML = `● Neutral: <strong>${data.sentiment_breakdown.neutral}%</strong>`;
            
            const negativeText = Array.from(container.querySelectorAll('li, p, div')).find(el => el.textContent.includes('Negative:'));
            if (negativeText) negativeText.innerHTML = `● Negative: <strong>${data.sentiment_breakdown.negative}%</strong>`;
            
            // Adjust the large prominent percentage accent node if it exists
            const bigPercent = container.querySelector('h1, .percentage, [class*="percent"]');
            if (bigPercent) bigPercent.textContent = `${data.sentiment_breakdown.positive}%`;
        }

        // --- E. INJECT DEEP SEMANTIC TEXT INSIGHTS EXTRACTED BY PGVECTOR (<=>) ---
        const insightHeader = Array.from(document.querySelectorAll('h2'))
            .find(el => el.textContent.includes('Key Customer Insights'));
        if (insightHeader && data.key_semantic_insights) {
            const container = insightHeader.parentElement;
            
            // Locate the bullet points wrapper structure list (<ul> or a collection of list cards)
            const listWrapper = container.querySelector('ul') || container;
            
            // Clear out template text placeholders
            if (listWrapper.tagName === 'UL') {
                listWrapper.innerHTML = '';
            } else {
                // If it's a series of divs, locate all existing list components and flush them out
                const items = listWrapper.querySelectorAll('li, [class*="insight-item"]');
                items.forEach(i => i.remove());
            }

            // Map out the top nearest neighbor text review logs pulled straight from Postgres!
            data.key_semantic_insights.forEach((reviewText, idx) => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px dashed #eee';
                li.innerHTML = `🔥 <strong>Vector Proximity Match #${idx + 1}:</strong> "${reviewText}"`;
                
                if (listWrapper.tagName === 'UL') {
                    listWrapper.appendChild(li);
                } else {
                    container.appendChild(li);
                }
            });
        }

    } catch (error) {
        console.error("Dashboard engine hydration breakdown:", error);
    }

    // --- F. WIRE UP THE 'START NEW ANALYSIS' BUTTON RESET TRIPS ---
    const restartBtn = Array.from(document.querySelectorAll('button, a, .btn'))
        .find(el => el.textContent.includes('START NEW ANALYSIS'));
    if (restartBtn) {
        restartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentProduct'); // Clean project pointers
            window.location.href = "product.html"; // Route user cleanly back to step 1
        });
    }
});
