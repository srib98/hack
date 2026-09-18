import os
import json
import time
from googleapiclient.discovery import build
from kafka import KafkaProducer

# 1. Configurations
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "AIzaSyAGDtNwdXhCZsTDQseLOsiedFdz2Z6dmSQ")
KAFKA_BROKER = "localhost:19092"
TOPIC_NAME = "product-reviews"

# Initialize Clients
youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8')
)

def discover_trending_videos(product_name: str, max_videos: int = 5):
    """
    Dynamically searches YouTube for the most popular and trending review 
    videos for any requested product name.
    """
    print(f"🔍 Searching YouTube for trending reviews of: '{product_name}'...")
    
    try:
        # Search for videos, ordered by relevance/view count to find trending ones
        search_response = youtube.search().list(
            q=f"{product_name} review",
            type="video",
            part="id,snippet",
            maxResults=max_videos,
            order="relevance" # Gets the most popular, high-engagement videos
        ).execute()
        
        video_list = []
        for item in search_response.get("items", []):
            video_id = item["id"]["videoId"]
            video_title = item["snippet"]["title"]
            video_list.append({"id": video_id, "title": video_title})
            print(f"📺 Discovered Video: {video_title} (ID: {video_id})")
            
        return video_list
    except Exception as e:
        print(f"❌ Failed to search trending videos: {e}")
        return []

def stream_comments_to_kafka(video_id: str, video_title: str, product_name: str, comments_per_video: int = 50):
    """
    Extracts comments from a specific video and streams them into Kafka.
    """
    try:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=comments_per_video,
            textFormat="plainText"
        )
        response = request.execute()
        
        events_sent = 0
        for item in response.get('items', []):
            comment = item['snippet']['topLevelComment']['snippet']
            
            review_event = {
                "product_name": product_name,
                "source_platform": "YouTube",
                "unique_post_id": item['id'],
                "post_title": f"Comment on: {video_title}",
                "post_text": comment['textDisplay'],
                "engagement_score": comment['likeCount'],
                "created_at": comment['publishedAt']
            }
            
            producer.send(TOPIC_NAME, value=review_event)
            events_sent += 1
            
        producer.flush()
        print(f"🚀 Streamed {events_sent} comments from video ID: {video_id}")
        
    except Exception as e:
        print(f"❌ Error extracting from video {video_id}: {e}")

# --- Core Product Pipeline Controller ---
def run_product_ingestion_pipeline(product_name: str):
    """
    Orchestrates the entire real-time search and ingestion pipeline.
    """
    # 1. Discover the top 5 trending/relevant videos for the product
    trending_videos = discover_trending_videos(product_name, max_videos=5)
    
    if not trending_videos:
        print("⚠️ No trending videos found. Aborting pipeline.")
        return
        
    print(f"🌊 Starting stream pipeline across {len(trending_videos)} trending videos...")
    
    # 2. Iterate through each discovered video and ingest its data loop
    for video in trending_videos:
        stream_comments_to_kafka(
            video_id=video["id"], 
            video_title=video["title"], 
            product_name=product_name,
            comments_per_video=50  # 50 comments * 5 videos = 250 initial data points!
        )
        time.sleep(1) # Polite spacing to avoid Google API rate limiting
        
    print(f"✅ Data Ingestion Pipeline for '{product_name}' successfully completed!")

if __name__ == "__main__":
    # Test with ANY product name in the world dynamically
    requested_product = "Vision Pro" 
    run_product_ingestion_pipeline(requested_product)
