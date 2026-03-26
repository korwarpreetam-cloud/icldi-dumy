# 📊 India Inflation Analytics Dashboard

An interactive, full-stack dashboard that visualises cost-of-living inflation trends across major Indian cities. Built as a professional portfolio project using **Python**, **Flask**, and **Chart.js**.

![Dashboard Preview](screenshots/dashboard-preview.png)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Summary Cards** | At-a-glance overview — total cities, year range, highest-inflation city |
| **City Explorer** | Select a city to see yearly cost data in a clean table |
| **Cost Trends Chart** | Interactive line chart showing category-wise cost trends over the years |
| **Growth Analysis** | Year-over-year growth percentages for all 6 expense categories |
| **City Comparison** | Side-by-side bar chart comparing two cities on the latest year's data |
| **2025 Predictions** | Next-year cost predictions using average historical growth rates |
| **Responsive Design** | Works on desktop, tablet, and mobile screens |
| **Loading States** | Spinners and skeleton loaders for smooth UX |
| **Error Handling** | Friendly toast notifications for API errors and invalid inputs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Analytics** | Python · pandas · NumPy · matplotlib |
| **Backend** | Flask · Flask-CORS · Gunicorn |
| **Frontend** | HTML5 · CSS3 · JavaScript · Chart.js |
| **Data** | CSV (inflation.csv) |

---

## 📁 Project Structure

```
inflation-project/
├── backend/
│   ├── analysis.py          # Core analytics module (pandas/numpy)
│   └── app.py               # Flask REST API server
├── frontend/
│   ├── index.html           # Dashboard UI
│   ├── style.css            # Styling (dark theme, glassmorphism)
│   └── script.js            # API integration & Chart.js charts
├── data/
│   └── inflation.csv        # Dataset (3 cities × 7 years)
├── notebook/
│   └── inflation_analysis.ipynb  # Original Jupyter analysis
├── requirements.txt         # Python dependencies
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+ installed
- pip package manager

### 1. Clone the repository

```bash
git clone https://github.com/your-username/inflation-project.git
cd inflation-project
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the application

```bash
cd backend
python app.py
```

### 4. Open the dashboard

Visit **http://localhost:5050** in your browser.

---

## 📡 API Endpoints

All endpoints return JSON responses.

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/` | Serve dashboard UI | — |
| `GET` | `/api/health` | Health check | — |
| `GET` | `/cities` | List of available cities | — |
| `GET` | `/city-data` | Yearly data for a city | `city` (required) |
| `GET` | `/city-growth` | Year-wise growth % | `city` (required) |
| `GET` | `/compare` | Compare two cities | `city1`, `city2` (required) |
| `GET` | `/summary` | Summary statistics | — |
| `GET` | `/predict` | Predicted next-year values | `city` (required) |

### Example requests

```bash
# Get list of cities
curl http://localhost:5050/cities

# Get Mumbai data
curl "http://localhost:5050/city-data?city=Mumbai"

# Compare Mumbai vs Delhi
curl "http://localhost:5050/compare?city1=Mumbai&city2=Delhi"

# Predict next year for Pune
curl "http://localhost:5050/predict?city=Pune"
```

### Error responses

```json
// Missing parameter → 400
{ "error": "Missing required parameter: 'city'" }

// Invalid city → 404
{ "error": "No data found for city: 'InvalidCity'" }
```

---

## 📊 Dataset

The dataset (`data/inflation.csv`) contains annual cost-of-living data for **3 Indian cities** over **7 years** (2018–2024).

**Categories tracked:**
- 🍔 Food
- ⛽ Fuel
- 🏠 Rent
- 🚗 Transport
- 💡 Utilities
- 🎬 Entertainment

---

## 🌐 Deployment

### Backend (Render / Railway)

1. Set the root directory to `backend/`
2. Build command: `pip install -r ../requirements.txt`
3. Start command: `gunicorn app:app`
4. Environment variable: `PORT=5050`

### Frontend (Vercel / Netlify)

If hosting the frontend separately:
1. Deploy the `frontend/` directory
2. Update `API_BASE` in `script.js` to point to your backend URL

> **Note:** The default setup serves both frontend and backend from a single Flask server, so separate hosting is optional.

---

## 📸 Screenshots

> Add screenshots of your dashboard here to make this README shine on GitHub.

| View | Screenshot |
|------|------------|
| Overview & Summary Cards | _Add screenshot_ |
| City Data Table + Trend Chart | _Add screenshot_ |
| Growth Analysis Chart | _Add screenshot_ |
| City Comparison | _Add screenshot_ |
| Prediction Cards | _Add screenshot_ |

---

## 🔮 Future Improvements

- [ ] Add more cities (Bangalore, Chennai, Kolkata, etc.)
- [ ] Implement user authentication
- [ ] Add data upload feature for custom datasets
- [ ] Advanced prediction using linear regression / ML models
- [ ] Export charts as PNG / PDF
- [ ] Dark / Light theme toggle
- [ ] Database integration (PostgreSQL / MongoDB)
- [ ] Unit tests with pytest

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙋‍♂️ Author

**Preetam Korwar**

- GitHub: [@korwarpreetam-cloud](https://github.com/korwarpreetam-cloud)

---

> Built with ❤️ as a data analytics portfolio project.
