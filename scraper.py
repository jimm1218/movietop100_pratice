import os
import sys
import time
import json
import argparse
import requests
from bs4 import BeautifulSoup

def log(message):
    """
    Logs a message to stdout. Handles encoding exceptions by printing UTF-8 bytes 
    if the terminal's active encoding (e.g., CP950) cannot represent the character.
    Flushes the output buffer immediately to prevent pipeline hangs.
    """
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"[{timestamp}] {message}"
    try:
        print(log_line, flush=True)
    except UnicodeEncodeError:
        try:
            # Fallback: print characters safe for current environment encoding
            safe_message = message.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding)
            print(f"[{timestamp}] {safe_message}", flush=True)
        except Exception:
            # Absolute fallback: print raw bytes representation
            print(f"[{timestamp}] {message.encode('utf-8')}", flush=True)

def download_image(url, save_path):
    """
    Downloads an image using standard headers and referrer to bypass hotlinking protection.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.maoyan.com/"
    }
    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        # Set a low timeout (2s connect, 2s read) so we don't hang if the Meituan CDN is blocked
        response = requests.get(url, headers=headers, timeout=(2.0, 2.0))
        if response.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(response.content)
            return True
        else:
            log(f"Failed to download image: HTTP {response.status_code} for {url}")
            return False
    except Exception as e:
        log(f"Error downloading image {url}: {e}")
        return False

def scrape_maoyan(cookie=None, delay=2.5):
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Connection": "keep-alive"
    }
    
    if cookie:
        headers["Cookie"] = cookie
        log("Using user-provided session Cookie.")
        
    session.headers.update(headers)
    
    if not cookie:
        log("No cookie provided. Initializing session via homepage...")
        try:
            session.get("https://www.maoyan.com/board/4", timeout=10)
        except Exception as e:
            log(f"Warning establishing homepage session: {e}")
        time.sleep(1.5)
        
    scraped_movies = []
    
    for offset in range(0, 100, 10):
        url = f"https://www.maoyan.com/board/4?offset={offset}"
        
        if offset > 0:
            session.headers.update({"Referer": f"https://www.maoyan.com/board/4?offset={offset-10}"})
        else:
            session.headers.update({"Referer": "https://www.maoyan.com/"})
            
        log(f"Scraping page {offset//10 + 1}/10 (offset {offset})...")
        try:
            response = session.get(url, timeout=10)
            
            if "verify" in response.url or "captcha" in response.url:
                log(f"Verification captcha redirect detected at offset {offset}! Live scraping blocked.")
                return None
                
            if response.status_code != 200:
                log(f"HTTP Error {response.status_code} at offset {offset}. Live scraping failed.")
                return None
                
            soup = BeautifulSoup(response.text, 'html.parser')
            items = soup.find_all('dd')
            
            if not items:
                log(f"No movie items found in HTML at offset {offset}. Might be blocked.")
                return None
                
            for item in items:
                rank_elem = item.find('i', class_='board-index')
                rank = rank_elem.text.strip() if rank_elem else ""
                
                name_elem = item.find('p', class_='name')
                title = name_elem.text.strip() if name_elem else ""
                
                star_elem = item.find('p', class_='star')
                star = star_elem.text.strip().replace("主演：", "") if star_elem else ""
                
                time_elem = item.find('p', class_='releasetime')
                releasetime = time_elem.text.strip().replace("上映时间：", "") if time_elem else ""
                
                img_elem = item.find('img', class_='board-img')
                img_url = img_elem.get('data-src') or img_elem.get('src') if img_elem else ""
                
                integer_elem = item.find('i', class_='integer')
                fraction_elem = item.find('i', class_='fraction')
                score = ""
                if integer_elem and fraction_elem:
                    score = integer_elem.text.strip() + fraction_elem.text.strip()
                
                scraped_movies.append({
                    "rank": int(rank) if rank.isdigit() else rank,
                    "title": title,
                    "star": star,
                    "releasetime": releasetime,
                    "img_url": img_url,
                    "score": score
                })
                
            log(f"Successfully parsed {len(items)} movies from page.")
            time.sleep(delay)
            
        except Exception as e:
            log(f"Exception during scrape at offset {offset}: {e}")
            return None
            
    return scraped_movies

def main():
    parser = argparse.ArgumentParser(description="Maoyan Movie TOP 100 Scraper")
    parser.add_argument("--cookie", help="Custom session Cookie string from your browser")
    parser.add_argument("--delay", type=float, default=2.5, help="Request delay in seconds (default 2.5)")
    args = parser.parse_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    posters_dir = os.path.join(script_dir, "posters")
    os.makedirs(posters_dir, exist_ok=True)
    
    log("Starting Maoyan TOP 100 Scraper...")
    movies_data = scrape_maoyan(cookie=args.cookie, delay=args.delay)
    
    using_fallback = False
    if not movies_data:
        log("Live scraping failed or was blocked by WAF. Falling back to movies_backup.js...")
        backup_path = os.path.join(script_dir, "movies_backup.js")
        if os.path.exists(backup_path):
            with open(backup_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                # Strip window.moviesData = prefix and trailing semicolon
                if content.startswith("window.moviesData ="):
                    content = content[len("window.moviesData ="):].strip()
                if content.endswith(";"):
                    content = content[:-1].strip()
                movies_data = json.loads(content)
            using_fallback = True
            log("Loaded fallback database successfully.")
        else:
            log("CRITICAL ERROR: movies_backup.js not found! Cannot generate movies data.")
            sys.exit(1)
            
    log(f"Processing posters for {len(movies_data)} movies...")
    final_movies = []
    consecutive_failures = 0
    max_consecutive_failures = 5
    skipped_all_remaining = False
    
    for movie in movies_data:
        rank = movie["rank"]
        title = movie["title"]
        remote_url = movie["img_url"]
        
        local_filename = f"{rank}.jpg"
        local_path = os.path.join(posters_dir, local_filename)
        web_relative_path = f"posters/{local_filename}"
        
        if not os.path.exists(local_path) and remote_url:
            if not skipped_all_remaining:
                log(f"Downloading poster for #{rank}: {title}...")
                download_success = download_image(remote_url, local_path)
                if download_success:
                    consecutive_failures = 0
                    img_path = web_relative_path
                else:
                    consecutive_failures += 1
                    img_path = remote_url
                    
                if consecutive_failures >= max_consecutive_failures:
                    log("WARNING: 5 consecutive download failures detected. Image server is likely unreachable from this network.")
                    log("Skipping remaining poster downloads to save time. Remote URLs will be used directly.")
                    skipped_all_remaining = True
                    
                time.sleep(0.3)  # Slower pace for image downloads
            else:
                img_path = remote_url
        else:
            img_path = web_relative_path if os.path.exists(local_path) else remote_url
            
        final_movie = movie.copy()
        final_movie["img_url"] = img_path
        final_movies.append(final_movie)
        
    output_path = os.path.join(script_dir, "movies.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("window.moviesData = ")
        json.dump(final_movies, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        
    log(f"Successfully generated movies.js at {output_path}!")
    if using_fallback:
        log("NOTICE: The dataset was generated using fallback data due to anti-crawler block.")
    else:
        log("SUCCESS: The dataset was scraped live and saved successfully!")

if __name__ == "__main__":
    main()
