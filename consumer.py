import json
from datetime import datetime
from kafka import KafkaConsumer
import psycopg2

# 1. Pipeline Routing Configurations
KAFKA_BROKER = "localhost:19092"
TOPIC_NAME = "product-reviews"

# Initialize the Streaming Consumer to listen from the cluster backbone
consumer = KafkaConsumer(
    TOPIC_NAME,
    bootstrap_servers=[KAFKA_BROKER],
    auto_offset_reset='earliest', # Reads historical data if the broker has items queued
    enable_auto_commit=True,      # Automatically acknowledges successfully processed events
    value_deserializer=lambda x: json.loads(x.decode('utf-8')) # Deserializes network bytes back into JSON
)

def start_ingestion_consumer():
    print(f"📥 Connecting Kafka Consumer to broker at {KAFKA_BROKER}...")
    print(f"⏳ Listening for incoming streaming metrics on topic: '{TOPIC_NAME}'...")
    
    # Establish connection to the verified PostgreSQL container engine
    db_conn = psycopg2.connect(
        dbname="product_analytics",
        user="postgres",
        password="hackathon_password",
        host="localhost",
        port="5432"
    )
    db_cursor = db_conn.cursor()
    
    insert_query = """
        INSERT INTO product_reviews_raw 
        (product_name, source_platform, unique_post_id, post_title, post_text, engagement_score, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (unique_post_id) DO NOTHING;
    """
    
    try:
        # Loop explicitly waits for data streams emitted from producer.py
        for message in consumer:
            event_data = message.value
            
            # Format the incoming ISO time string cleanly into a python datetime object
            raw_time = event_data["created_at"]
            clean_time = datetime.fromisoformat(raw_time.replace('Z', '+00:00'))
            
            record_values = (
                event_data["product_name"],
                event_data["source_platform"],
                event_data["unique_post_id"],
                event_data["post_title"],
                event_data["post_text"],
                event_data["engagement_score"],
                clean_time
            )
            
            # Execute database ingestion transaction
            db_cursor.execute(insert_query, record_values)
            db_conn.commit()
            
            print(f"💾 Ingested new record: '{event_data['product_name']}' from {event_data['source_platform']} into PostgreSQL!")
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping Data Ingestion Worker...")
    except Exception as e:
        print(f"❌ Critical Processing Error inside Consumer loop: {e}")
    finally:
        db_cursor.close()
        db_conn.close()

if __name__ == "__main__":
    start_ingestion_consumer()
