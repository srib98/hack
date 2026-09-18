from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from sentence_transformers import SentenceTransformer
import numpy as np
import time

# IMPORT YOUR PRODUCER ENGINE DIRECTLY
# Assumes your scraper file is named producer.py inside the same directory
from producer import run_product_ingestion_pipeline

app = FastAPI(title="Market Sense Analytics Core")

# Enable CORS for local hackathon UI communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global tracker monitoring real pipeline states for screens 3 & 4
pipeline_status = {
    "status": "idle",
    "progress": 0,
    "product_name": "",
    "reviews_collected": 0
}

class ProductSubmission(BaseModel):
    category: str
    product_name: str
    brand: str
    price: float
    currency: str
    description: str

# 🧠 INITIALIZE LOCAL AI EMBEDDING MODEL
# This reads review text contextually and translates it into mathematical concept arrays
ai_model = SentenceTransformer('all-MiniLM-L6-v2')

# Define reference boundaries for conceptual sentiment mapping (Zero keyword rules!)
perfect_vector = ai_model.encode("This is amazing, absolutely love it, perfect product")
terrible_vector = ai_model.encode("Terrible experience, completely broken, hate it, waste of money")

def cosine_similarity(v1, v2):
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

def get_db_connection():
    return psycopg2.connect(
        dbname="product_analytics",
        user="postgres",
        password="hackathon_password",
        host="localhost",
        port="5432"
    )

# --- 🚀 RUN UNIFIED KAFKA STREAM & AI VECTORIZATION ENGINE ---
def run_real_event_and_ai_pipeline(product_name: str):
    global pipeline_status
    
    # --- PHASE 1: TRIGGER KAFKA PRODUCER (SCREEN 3 DRIVER) ---
    pipeline_status["status"] = "collecting"
    pipeline_status["progress"] = 15
    
    try:
        # Dynamically kick off your Kafka Producer pipeline
        # This searches YouTube, finds trending videos, and streams ~250 comments to Kafka
        run_product_ingestion_pipeline(product_name)
        
        # Give your consumer worker script a moment to write initial events to Postgres
        time.sleep(3) 
        
        # Check how many items your background consumer successfully committed
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM product_reviews_raw WHERE product_name = %s;", (product_name,))
        total_collected = cursor.fetchone()[0]
        
        pipeline_status["reviews_collected"] = total_collected
        pipeline_status["progress"] = 50  # Collection complete!
        
        # --- PHASE 2: RUN PGVECTOR LAYER GENERATION (SCREEN 4 DRIVER) ---
        pipeline_status["status"] = "analyzing"
        
        # Pull rows that your consumer script caught but lack vector coordinates
        cursor.execute("""
            SELECT id, post_text FROM product_reviews_raw 
            WHERE product_name = %s AND embedding IS NULL;
        """, (product_name,))
        unprocessed_rows = cursor.fetchall()
        total_to_process = len(unprocessed_rows)
        
        if total_to_process == 0:
            pipeline_status["progress"] = 100
            pipeline_status["status"] = "completed"
            return

        for index, (review_id, review_text) in enumerate(unprocessed_rows):
            # 1. Transform raw text into AI vector coordinates
            vector_embedding = ai_model.encode(review_text).tolist()
            
            # 2. Extract deep conceptual sentiment without checking keywords
            pos_score = cosine_similarity(vector_embedding, perfect_vector)
            neg_score = cosine_similarity(vector_embedding, terrible_vector)
            
            if pos_score > neg_score + 0.05:
                label, score = 'Positive', round(pos_score, 2)
            elif neg_score > pos_score + 0.05:
                label, score = 'Negative', round(-neg_score, 2)
            else:
                label, score = 'Neutral', 0.00
            
            # 3. Update the database table row with both structural and vector data
            cursor.execute("""
                UPDATE product_reviews_raw 
                SET embedding = %s, sentiment_label = %s, sentiment_score = %s 
                WHERE id = %s;
            """, (vector_embedding, label, score, review_id))
            
            # Calculate loading bar increment from 50% up to 100% based on active processing
            ratio = (index + 1) / total_to_process
            pipeline_status["progress"] = 50 + int(ratio * 50)
            conn.commit()
            
        pipeline_status["status"] = "completed"
        pipeline_status["progress"] = 100
        
    except Exception as e:
        print(f"❌ Core Pipeline processing failure: {e}")
        pipeline_status["status"] = "error"
    finally:
        cursor.close()
        conn.close()

# --- API ROUTER ENDPOINTS ---

@app.post("/api/start-analysis")
def start_analysis(payload: ProductSubmission, background_tasks: BackgroundTasks):
    """Called by Product Details Form. Captures inputs and activates the Kafka engine."""
    global pipeline_status
    pipeline_status = {
        "status": "collecting",
        "progress": 0,
        "product_name": payload.product_name,
        "reviews_collected": 0
    }
    
    # Hand the orchestration off to a non-blocking background thread
    background_tasks.add_task(run_real_event_and_ai_pipeline, payload.product_name)
    return {"status": "initiated", "target": payload.product_name}

@app.get("/api/pipeline-state")
def get_pipeline_state():
    """Polled by UI loading screens to smoothly animate processing meters."""
    return pipeline_status

@app.get("/api/dashboard/{product_name}")
def get_dashboard_data(product_name: str):
    """Called by Dashboard Page to compute real analytics metrics from pgvector data."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Query 1: Extract overall structural sentiment distributions
        cursor.execute("""
            SELECT 
                COUNT(*) as comments_analyzed,
                ROUND(COUNT(CASE WHEN sentiment_label = 'Positive' THEN 1 END) * 100.0 / COUNT(*), 0) as positive_percent,
                ROUND(COUNT(CASE WHEN sentiment_label = 'Neutral' THEN 1 END) * 100.0 / COUNT(*), 0) as neutral_percent,
                ROUND(COUNT(CASE WHEN sentiment_label = 'Negative' THEN 1 END) * 100.0 / COUNT(*), 0) as negative_percent
            FROM product_reviews_raw WHERE product_name = %s;
        """, (product_name,))
        kpis = cursor.fetchone()
        
        if not kpis or kpis['comments_analyzed'] == 0:
            raise HTTPException(status_code=404, detail="Data processing not finished yet.")

        # Query 2: Extract top negative feature focus points using pgvector distance operators (<=>)
        # We query the vector space directly to isolate reviews mentioning issues
        comfort_query_vector = ai_model.encode("uncomfortable fit, heavy weight distribution, painful strap design").tolist()
        cursor.execute("""
            SELECT post_text, engagement_score 
            FROM product_reviews_raw 
            WHERE product_name = %s AND sentiment_label = 'Negative'
            ORDER BY embedding <=> %s ::vector
            LIMIT 3;
        """, (product_name, comfort_query_vector))
        top_complaints = cursor.fetchall()
        
        return {
            "product": product_name,
            "metrics": {
                "customer_sentiment": f"{kpis['positive_percent']}%",
                "comments_analyzed": kpis['comments_analyzed']
            },
            "sentiment_breakdown": {
                "positive": kpis['positive_percent'],
                "neutral": kpis['neutral_percent'],
                "negative": kpis['negative_percent']
            },
            "key_semantic_insights": [row['post_text'] for row in top_complaints]
        }
    finally:
        cursor.close()
        conn.close()
