# 🚀 배포 가이드

이 문서는 가족 트리 애플리케이션을 다양한 플랫폼에 배포하는 방법을 설명합니다.

## 📋 목차

- [Render.com (무료)](#rendercom-무료---추천)
- [Railway.app (무료 크레딧)](#railwayapp-무료-크레딧)
- [Fly.io](#flyio)
- [본인 서버 (VPS)](#본인-서버-vps)
- [Vercel (정적 호스팅 + Serverless)](#vercel)

---

## Render.com (무료) - 추천 ⭐

### 특징
- ✅ 무료 플랜 제공
- ✅ 자동 HTTPS
- ✅ GitHub 자동 배포
- ✅ 간단한 설정
- ⚠️ 비활성 시 슬립 모드 (무료 플랜)

### 배포 방법

#### 1. GitHub 저장소 준비

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/familyTree.git
git push -u origin main
```

#### 2. Render.com 배포

1. [Render.com](https://render.com) 접속 및 GitHub 로그인
2. "New +" 버튼 → "Web Service" 선택
3. GitHub 저장소 연결
4. 다음 설정 입력:
   - **Name**: `familytree-app` (원하는 이름)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. "Advanced" 섹션에서 환경 변수 추가:
   ```
   NODE_ENV=production
   ```
6. "Create Web Service" 클릭

#### 3. 자동 초기화

첫 배포 시 자동으로:
- 데이터베이스 초기화
- 샘플 데이터 생성 (선택적)

#### 4. 접속

배포 완료 후 `https://familytree-app.onrender.com` 형태의 URL로 접속 가능

### 주의사항

- 무료 플랜: 15분 비활성 시 슬립 모드 (첫 접속 시 느림)
- 매달 750시간 무료 제공
- SQLite 파일은 재배포 시 초기화됨 (영구 스토리지 필요 시 유료 플랜)

---

## Railway.app (무료 크레딧)

### 특징
- ✅ $5 무료 크레딧 제공
- ✅ 자동 HTTPS
- ✅ 더 빠른 배포
- ✅ 영구 스토리지 옵션

### 배포 방법

#### 1. GitHub 저장소 푸시 (위와 동일)

#### 2. Railway 배포

1. [Railway.app](https://railway.app) 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 선택
5. 자동 배포 시작!

#### 3. 환경 변수 설정

Variables 탭에서 추가:
```
NODE_ENV=production
```

#### 4. 도메인 설정

Settings → Domains에서 도메인 생성 또는 custom domain 연결

---

## Fly.io

### 특징
- ✅ 글로벌 엣지 배포
- ✅ 영구 볼륨 지원
- ✅ 무료 티어 제공

### 배포 방법

#### 1. Fly CLI 설치

```bash
# macOS
brew install flyctl

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Linux
curl -L https://fly.io/install.sh | sh
```

#### 2. 로그인

```bash
flyctl auth login
```

#### 3. 앱 초기화

```bash
cd familyTree
flyctl launch
```

대화형 프롬프트에서:
- App name: `familytree-app`
- Region: 가까운 지역 선택 (예: 도쿄)
- Database: No (SQLite 사용)

#### 4. fly.toml 확인

자동 생성된 `fly.toml` 파일 확인:

```toml
app = "familytree-app"

[build]

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"
  
  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
```

#### 5. 배포

```bash
flyctl deploy
```

#### 6. 접속

```bash
flyctl open
```

---

## 본인 서버 (VPS)

Ubuntu/Debian 기반 서버에 배포하는 방법입니다.

### 사전 요구사항

- Ubuntu 20.04+ 또는 Debian 11+
- SSH 접속 가능
- sudo 권한

### 배포 단계

#### 1. 서버 접속

```bash
ssh user@your-server-ip
```

#### 2. Node.js 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version
npm --version
```

#### 3. 프로젝트 클론

```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/familyTree.git
cd familyTree
```

#### 4. 의존성 설치

```bash
sudo npm install
```

#### 5. 환경 설정

```bash
sudo cp example.env .env
sudo nano .env
```

`.env` 내용:
```env
PORT=3000
NODE_ENV=production
```

#### 6. 데이터베이스 초기화

```bash
sudo npm run init-db-sample
```

#### 7. PM2로 실행 (추천)

```bash
# PM2 설치
sudo npm install -g pm2

# 앱 시작
pm2 start server.js --name familytree

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs familytree
```

#### 8. Nginx 리버스 프록시 (선택)

```bash
# Nginx 설치
sudo apt install nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/familytree
```

설정 내용:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/familytree /etc/nginx/sites-enabled/

# Nginx 재시작
sudo systemctl restart nginx
```

#### 9. SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

---

## Vercel

Vercel은 주로 정적 사이트에 최적화되어 있지만, Serverless Functions를 활용하여 배포할 수 있습니다.

**주의**: SQLite는 Serverless 환경에서 권장되지 않습니다. PostgreSQL 등으로 변경 필요.

---

## 🔧 배포 후 관리

### 로그 확인

**Render.com / Railway**:
- 웹 대시보드에서 Logs 탭 확인

**Fly.io**:
```bash
flyctl logs
```

**VPS (PM2)**:
```bash
pm2 logs familytree
pm2 monit
```

### 업데이트 배포

**GitHub 자동 배포 (Render/Railway)**:
```bash
git add .
git commit -m "Update features"
git push origin main
# 자동으로 재배포됨
```

**Fly.io**:
```bash
git pull
flyctl deploy
```

**VPS**:
```bash
cd /var/www/familyTree
sudo git pull
sudo npm install
pm2 restart familytree
```

### 데이터베이스 백업

**수동 백업**:
```bash
# 로컬에서
scp user@server:/var/www/familyTree/data/familytree.db ./backup-$(date +%Y%m%d).db

# 서버에서
cp data/familytree.db data/backups/familytree-$(date +%Y%m%d).db
```

**자동 백업 (Cron)**:
```bash
# crontab 편집
crontab -e

# 매일 새벽 2시에 백업
0 2 * * * /var/www/familyTree/scripts/backup.sh
```

---

## 📊 성능 최적화

### 프로덕션 환경 변수

```env
NODE_ENV=production
PORT=3000

# 로그 레벨
LOG_LEVEL=error

# 캐싱
CACHE_ENABLED=true
```

### PM2 클러스터 모드

```bash
pm2 start server.js -i max --name familytree
```

---

## 🐛 문제 해결

### 배포 실패

1. 로그 확인
2. `package.json`의 Node.js 버전 확인
3. 빌드 명령어 확인

### 데이터베이스 연결 오류

```bash
# 권한 확인
ls -la data/

# 디렉토리 생성
mkdir -p data
chmod 755 data
```

### 포트 충돌

```bash
# 포트 사용 확인
sudo lsof -i :3000

# 프로세스 종료
sudo kill -9 <PID>
```

---

## 📚 추가 리소스

- [Render.com 문서](https://render.com/docs)
- [Railway 문서](https://docs.railway.app)
- [Fly.io 문서](https://fly.io/docs)
- [PM2 문서](https://pm2.keymetrics.io/docs)
- [Nginx 문서](https://nginx.org/en/docs)

---

**배포 성공을 기원합니다! 🚀**

