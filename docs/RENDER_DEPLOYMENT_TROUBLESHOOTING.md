# 🚨 Render.com 배포 문제 해결 가이드

이 문서는 Render.com에 가족 트리 애플리케이션을 배포할 때 발생할 수 있는 문제들과 해결 방법을 다룹니다.

## 📋 목차

- [빌드 오류](#빌드-오류)
- [런타임 오류](#런타임-오류)
- [데이터베이스 문제](#데이터베이스-문제)
- [성능 최적화](#성능-최적화)

---

## 빌드 오류

### ❌ 문제 1: better-sqlite3 빌드 실패

**증상:**
```
Error: Failed to build better-sqlite3
gyp ERR! build error
```

**원인:**
`better-sqlite3`는 C++ 네이티브 모듈로, 빌드 시 컴파일러와 빌드 도구가 필요합니다.

**해결 방법:**

#### 방법 1: render.yaml 사용 (권장)

프로젝트 루트의 `render.yaml` 파일이 다음과 같이 설정되어 있는지 확인:

```yaml
services:
  - type: web
    name: familytree-app
    env: node
    plan: free
    buildCommand: npm install && npm rebuild better-sqlite3
    startCommand: npm start
```

#### 방법 2: Render 대시보드에서 직접 설정

1. Render.com 대시보드에서 서비스 선택
2. **Settings** → **Build & Deploy** 섹션으로 이동
3. **Build Command** 수정:
   ```bash
   npm install && npm rebuild better-sqlite3
   ```
4. **Save Changes** 클릭
5. **Manual Deploy** → **Deploy latest commit**으로 재배포

#### 방법 3: package.json 스크립트 추가

`package.json`에 빌드 스크립트 추가:

```json
{
  "scripts": {
    "build": "npm rebuild better-sqlite3",
    "start": "node server.js"
  }
}
```

Render Build Command:
```bash
npm install && npm run build
```

---

### ❌ 문제 2: Node.js 버전 불일치

**증상:**
```
Error: The engine "node" is incompatible with this module
```

**해결 방법:**

1. `package.json`에서 Node.js 버전 확인:
   ```json
   {
     "engines": {
       "node": ">=16.0.0"
     }
   }
   ```

2. Render에서 Node.js 버전 지정:
   - 환경 변수에 `NODE_VERSION` 추가: `18` 또는 `20`

---

### ❌ 문제 3: 메모리 부족 오류

**증상:**
```
JavaScript heap out of memory
```

**해결 방법:**

환경 변수 추가:
```
NODE_OPTIONS=--max-old-space-size=460
```

> 무료 플랜: 512MB RAM 제공, 460MB로 설정하여 안전 여유 확보

---

## 런타임 오류

### ❌ 문제 4: 서버가 시작되지 않음

**증상:**
```
Application failed to respond
```

**확인 사항:**

1. **포트 바인딩 확인**
   
   `server.js`에서 `process.env.PORT` 사용 여부 확인:
   ```javascript
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

2. **Health Check 경로 확인**
   
   `render.yaml`의 healthCheckPath와 실제 라우트 일치 확인:
   ```yaml
   healthCheckPath: /api/health
   ```
   
   `server.js`:
   ```javascript
   app.get('/api/health', (req, res) => {
     res.json({ status: 'ok' });
   });
   ```

3. **Start Command 확인**
   ```bash
   npm start
   ```
   
   또는
   ```bash
   node server.js
   ```

---

### ❌ 문제 5: CORS 오류

**증상:**
```
Access to fetch has been blocked by CORS policy
```

**해결 방법:**

`server.js`에서 CORS 설정 확인:

```javascript
const cors = require('cors');

// 프로덕션 환경
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
} else {
  app.use(cors());
}
```

환경 변수 추가:
```
CORS_ORIGIN=https://your-app.onrender.com
```

---

## 데이터베이스 문제

### ❌ 문제 6: 데이터베이스 파일을 찾을 수 없음

**증상:**
```
Error: Cannot open database
ENOENT: no such file or directory
```

**원인:**
무료 플랜에서는 영구 스토리지가 없으며, 파일 시스템은 읽기 전용입니다.

**해결 방법:**

1. **환경 변수로 /tmp 경로 사용**
   
   Render 환경 변수 추가:
   ```
   DB_PATH=/tmp/familytree.db
   ```

2. **Database.js 수정 확인**
   
   ```javascript
   const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/familytree.db');
   const dataDir = path.dirname(dbPath);
   
   if (!fs.existsSync(dataDir)) {
     fs.mkdirSync(dataDir, { recursive: true });
   }
   ```

3. **초기화 로직 추가**
   
   서버 시작 시 자동으로 데이터베이스 초기화:
   ```javascript
   const { initializeDatabase, insertSampleData } = require('./src/models/Database');
   
   initializeDatabase();
   
   // 샘플 데이터 자동 삽입 (선택적)
   if (process.env.AUTO_SEED === 'true') {
     insertSampleData();
   }
   ```

---

### ⚠️ 문제 7: 재시작 시 데이터 손실

**증상:**
서버가 재시작되면 모든 데이터가 사라짐

**원인:**
무료 플랜에서는 `/tmp`에 저장된 파일이 재시작 시 삭제됩니다.

**해결 방법:**

#### 옵션 1: 유료 플랜으로 업그레이드 (권장)

Persistent Disk 사용:

```yaml
services:
  - type: web
    disk:
      name: familytree-data
      mountPath: /data
      sizeGB: 1
```

환경 변수:
```
DB_PATH=/data/familytree.db
```

비용: 월 $7 (Starter 플랜) + Disk $0.25/GB

#### 옵션 2: 외부 데이터베이스 사용

- **Turso** (SQLite 호환, 무료 티어 제공)
- **PlanetScale** (MySQL 호환)
- **Supabase** (PostgreSQL)

#### 옵션 3: Railway로 마이그레이션

Railway는 무료 크레딧으로 Persistent Disk를 제공합니다.

---

### ⚠️ 문제 8: 데이터베이스 권한 오류

**증상:**
```
Error: SQLITE_READONLY: attempt to write a readonly database
```

**해결 방법:**

1. 디렉토리 권한 확인:
   ```javascript
   const dataDir = path.dirname(dbPath);
   if (!fs.existsSync(dataDir)) {
     fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
   }
   ```

2. `/tmp` 사용 (쓰기 가능한 유일한 디렉토리):
   ```
   DB_PATH=/tmp/familytree.db
   ```

---

## 성능 최적화

### 💡 팁 1: 슬립 모드 최소화

무료 플랜에서는 15분 비활성 시 슬립 모드 진입.

**해결 방법:**

1. **외부 모니터링 서비스 사용**
   
   - [UptimeRobot](https://uptimerobot.com) (무료)
   - [Cron-Job.org](https://cron-job.org) (무료)
   
   Health check URL을 5분마다 ping

2. **커스텀 Keep-Alive 스크립트** (선택적)
   
   GitHub Actions으로 주기적으로 요청:
   
   ```yaml
   name: Keep Alive
   on:
     schedule:
       - cron: '*/14 * * * *'  # 14분마다
   jobs:
     keep-alive:
       runs-on: ubuntu-latest
       steps:
         - run: curl https://your-app.onrender.com/api/health
   ```

---

### 💡 팁 2: 빌드 시간 단축

1. **node_modules 캐싱**
   
   Render는 자동으로 `node_modules`를 캐시합니다.

2. **불필요한 devDependencies 제거**
   
   프로덕션 빌드:
   ```bash
   npm install --production
   ```

3. **빌드 로그 확인**
   
   병목 지점 파악

---

### 💡 팁 3: 메모리 사용량 최적화

1. **WAL 모드 비활성화** (메모리 절약)
   
   ```javascript
   // db.pragma('journal_mode = WAL');  // 주석 처리
   db.pragma('journal_mode = DELETE');
   ```

2. **연결 풀 제한**
   
   ```javascript
   const db = new Database(dbPath, {
     timeout: 5000,
     fileMustExist: false
   });
   ```

---

## 🔧 디버깅 도구

### Render 로그 확인

```bash
# Render CLI 설치
npm install -g render-cli

# 로그인
render login

# 로그 스트리밍
render logs -f
```

### 로컬에서 프로덕션 환경 테스트

```bash
# 환경 변수 설정
export NODE_ENV=production
export DB_PATH=/tmp/familytree.db

# 서버 실행
npm start
```

---

## 📚 추가 리소스

- [Render Node.js 배포 가이드](https://render.com/docs/deploy-node-express-app)
- [better-sqlite3 문서](https://github.com/WiseLibs/better-sqlite3)
- [Render 커뮤니티 포럼](https://community.render.com/)

---

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] `render.yaml` 파일 존재 확인
- [ ] `buildCommand`에 `npm rebuild better-sqlite3` 포함
- [ ] `DB_PATH=/tmp/familytree.db` 환경 변수 설정
- [ ] `NODE_ENV=production` 환경 변수 설정
- [ ] Health check 엔드포인트(`/api/health`) 동작 확인
- [ ] `process.env.PORT` 사용 확인
- [ ] CORS 설정 확인
- [ ] 데이터베이스 초기화 로직 확인

---

**도움이 필요하면 언제든지 문의하세요! 🚀**

