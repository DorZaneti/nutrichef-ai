# Deployment Guide

This guide will help you deploy NutriChef AI to production.

## Option 1: Deploy to Free Hosting (Recommended for Portfolio)

### Frontend - Vercel (Free)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy Frontend**
```bash
cd frontend
vercel --prod
```

3. **Configure Environment Variables**
- In Vercel dashboard, add `VITE_API_URL` pointing to your backend URL

### Backend - Railway (Free Tier)

1. **Create Railway Account**: https://railway.app/

2. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

3. **Deploy Backend**
```bash
cd backend
railway login
railway init
railway up
```

4. **Add Environment Variables**
```bash
railway variables set ANTHROPIC_API_KEY=your_key_here
```

5. **Get Your Backend URL**
```bash
railway domain
```

6. **Update Frontend API URL**
Update `frontend/src/App.jsx` with your Railway backend URL

---

## Option 2: Deploy to AWS/GCP/Azure

### Backend (AWS EC2 example)

1. **Launch EC2 Instance** (Ubuntu 22.04)

2. **SSH into Instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Dependencies**
```bash
sudo apt update
sudo apt install python3-pip nginx -y
```

4. **Clone Repository**
```bash
git clone https://github.com/yourusername/nutrichef-ai.git
cd nutrichef-ai/backend
```

5. **Install Python Packages**
```bash
pip install -r requirements.txt
```

6. **Create .env File**
```bash
nano .env
# Add ANTHROPIC_API_KEY=your_key
```

7. **Run with Gunicorn**
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

8. **Setup Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

9. **Enable Auto-start with Systemd**
Create `/etc/systemd/system/nutrichef.service`:
```ini
[Unit]
Description=NutriChef AI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/nutrichef-ai/backend
ExecStart=/usr/local/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nutrichef
sudo systemctl start nutrichef
```

### Frontend (S3 + CloudFront)

1. **Build Frontend**
```bash
cd frontend
npm run build
```

2. **Create S3 Bucket**
```bash
aws s3 mb s3://nutrichef-ai
```

3. **Upload Build Files**
```bash
aws s3 sync dist/ s3://nutrichef-ai --delete
```

4. **Configure S3 for Static Hosting**
```bash
aws s3 website s3://nutrichef-ai --index-document index.html
```

5. **Setup CloudFront Distribution** (Optional, for HTTPS)

---

## Option 3: Docker Deployment

### Create Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Create `docker-compose.yml` in root:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

**Run with Docker Compose**:
```bash
docker-compose up -d
```

---

## Environment Variables

Make sure to set these environment variables in production:

**Backend**:
- `ANTHROPIC_API_KEY` - Your Claude API key

**Frontend**:
- `VITE_API_URL` - URL of your backend API

---

## Security Checklist

- [ ] Add HTTPS/SSL certificate
- [ ] Set up CORS properly for production domain
- [ ] Store API keys securely (use secrets manager)
- [ ] Enable rate limiting
- [ ] Add authentication if needed
- [ ] Set up monitoring and logging
- [ ] Regular security updates

---

## Monitoring

### Backend Health Check
```bash
curl https://your-api.com/
```

### View Logs
```bash
# Systemd
sudo journalctl -u nutrichef -f

# Docker
docker-compose logs -f
```

---

## Cost Estimates (Monthly)

**Free Tier Option**:
- Frontend (Vercel): Free
- Backend (Railway): Free tier (500 hours)
- API Costs: Pay per use (Claude API)
- **Total**: ~$5-20/month (mostly API costs)

**AWS Option**:
- EC2 t2.micro: $8.50
- S3 + CloudFront: $1-5
- API Costs: $5-20
- **Total**: ~$15-35/month

---

## Need Help?

- Check Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- AWS docs: https://aws.amazon.com/documentation/

Good luck with your deployment! 🚀
