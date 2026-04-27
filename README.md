# Local Service Finder

Full-stack Local Service Finder application with:

- Backend: Node.js, Express, MongoDB (Mongoose)
- Frontend: React (Vite)

## Project Structure

```txt
LocalServiceFinder/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      app.js
      server.js
  frontend/
    src/
      components/
      pages/
      services/
      styles/
```

## Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend uses `backend/.env` with:

```env
MONGO_URI=...
PORT=5000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional frontend env:

```env
VITE_API_URL=http://localhost:5000/api
```
