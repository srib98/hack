import psycopg2

def initialize_database():
    # 1. Connect to the PostgreSQL instance running inside Docker
    conn = psycopg2.connect(
        dbname="product_analytics",
        user="postgres",
        password="hackathon_password",
        host="localhost",
        port="5432"
    )
    cursor = conn.cursor()
    
    # 2. SQL Blueprint for our analytical tables
    # Includes standard metrics, timelines, and raw text blocks
    create_table_query = """
    CREATE TABLE IF NOT EXISTS product_reviews_raw (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(150) NOT NULL,
        source_platform VARCHAR(50) NOT NULL,      -- 'YouTube'
        unique_post_id VARCHAR(100) UNIQUE,        -- Prevents ingesting identical comments twice
        post_title TEXT,                           -- Title of the trending video source
        post_text TEXT NOT NULL,                   -- The actual user comment
        engagement_score INT DEFAULT 0,            -- Comment like count (used to weight AI metrics)
        created_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Core time anchor for historical timeline analysis
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- AI ENHANCEMENTS LAYER (Populated by the downstream AI services)
        sentiment_label VARCHAR(20),               -- 'Positive', 'Negative', 'Neutral'
        sentiment_score NUMERIC(4,2),              -- Floating numerical score for precision velocity charts
        embedding vector(1536)                     -- 1536 dimensions matches standard OpenAI / HuggingFace text-embeddings
    );
    """
    
    try:
        # Execute table generation rules
        cursor.execute(create_table_query)
        
        # Build optimized indexes so your analytics dashboard loads timelines instantly
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_product_timeline ON product_reviews_raw (product_name, created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sentiment ON product_reviews_raw (product_name, sentiment_label);")
        
        conn.commit()
        print("🎉 PostgreSQL Database schema and indexing engines initialized perfectly!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Failed to configure storage layout: {e}")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    initialize_database()
