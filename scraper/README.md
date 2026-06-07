# University Rankings Scraper

Scrapes Computer Science university rankings from **QS**, **THE**, and **ARWU**, merges the results, and upserts them into MongoDB.

## Project Structure

```
scraper/
├── university_rankings_scraper.py   # Main script
└── requirements.txt                 # Python dependencies
.env.example                         # Environment variable template
```

## Quick Start

### 1. Install dependencies

```bash
cd scraper
pip install -r requirements.txt
```

### 2. Configure MongoDB

```bash
cp .env.example .env
# Edit .env and set MONGO_URI to your MongoDB connection string
```

### 3. Run the scraper

```bash
python scraper/university_rankings_scraper.py
```

---

## Data Sources

| Source | URL | Method | Fields |
|--------|-----|--------|--------|
| **QS** | `topuniversities.com/rankings/endpoint` | `requests` + JSON | `title`, `country`, `url`, `rank_display` |
| **THE** | `timeshighereducation.com` static JSON | `requests` + JSON | `name`, `location`, `url`, `rank` |
| **ARWU** | `shanghairanking.com/rankings/gras/2023/RS0210` | `selenium` (JS-rendered) | rank, name, country from table |

## MongoDB Schema

Each document in `kotlin_edu.universities` has:

```json
{
  "name": "MIT",
  "country": "United States",
  "region": "North America",
  "website": "https://web.mit.edu",
  "rank_qs": "1",
  "rank_the": "2",
  "rank_arwu": "1",
  "sources": ["ARWU", "QS", "THE"]
}
```

- **Database**: `kotlin_edu`
- **Collection**: `universities`
- **Upsert key**: `name` (case-insensitive)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |

## Notes

- ARWU requires **Google Chrome** installed (Selenium/WebDriver handles driver download automatically).
- If one source fails, the script continues with the remaining sources.
- Logs are written to stdout with timestamps.
- `time.sleep()` is called between requests to be respectful to servers.
