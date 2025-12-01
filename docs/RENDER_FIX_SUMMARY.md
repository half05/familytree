# 🔧 Render.com 배포 오류 수정 요약

## 📋 발견된 문제

Render.com 배포 시 `better-sqlite3` 패키지 빌드 실패로 인한 배포 오류 발생

### 근본 원인
- `better-sqlite3`는 C++ 네이티브 모듈로, 플랫폼별 컴파일이 필요
- 기본 `npm install`만으로는 Render.com의 Linux 환경에 맞게 빌드되지 않음

---

## ✅ 적용된 수정 사항

### 1. `render.yaml` 업데이트

**변경 전:**
```yaml
buildCommand: npm install
```

**변경 후:**
```yaml
buildCommand: npm install && npm rebuild better-sqlite3
```

**추가 사항:**
- 환경 변수 `DB_PATH=/tmp/familytree.db` 추가
- 영구 디스크 설정 예시 (주석으로 포함)

### 2. `src/models/Database.js` 업데이트

**변경 내용:**
- 환경 변수 `DB_PATH` 지원 추가
- 동적 데이터 디렉토리 생성 로직 개선

**변경 전:**
```javascript
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'familytree.db');
```

**변경 후:**
```javascript
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/familytree.db');
const dataDir = path.dirname(dbPath);
```

### 3. `DEPLOYMENT.md` 업데이트

- better-sqlite3 빌드 명령어 추가
- 환경 변수 설정 안내 추가
- 무료 플랜 제약사항 명시
- 빌드 오류 해결 섹션 추가

### 4. 새 문서 생성

`docs/RENDER_DEPLOYMENT_TROUBLESHOOTING.md` 생성
- 상세한 문제 해결 가이드
- 8가지 주요 문제와 해결 방법
- 성능 최적화 팁
- 디버깅 도구 안내

---

## 🚀 배포 방법

### 방법 1: render.yaml 자동 적용 (권장)

1. 변경사항을 Git에 커밋:
   ```bash
   git add .
   git commit -m "Fix: Render.com 배포 오류 수정 - better-sqlite3 빌드 설정 추가"
   git push origin main
   ```

2. Render.com이 자동으로 재배포 시작

### 방법 2: 수동 재배포

1. Render.com 대시보드 접속
2. 서비스 선택
3. "Manual Deploy" → "Deploy latest commit" 클릭

### 방법 3: 설정만 변경 (코드 푸시 전)

1. Render.com 대시보드 → Settings → Build & Deploy
2. **Build Command** 수정:
   ```bash
   npm install && npm rebuild better-sqlite3
   ```
3. Environment → Environment Variables에서 추가:
   - `NODE_ENV`: `production`
   - `DB_PATH`: `/tmp/familytree.db`
4. "Save Changes" → "Manual Deploy"

---

## ⚠️ 중요 고지사항

### 무료 플랜 제약사항

1. **데이터 영구성 없음**
   - 무료 플랜에서는 서버 재시작 시 데이터베이스가 초기화됩니다
   - `/tmp` 디렉토리는 임시 저장소입니다

2. **해결 방법**
   - **유료 플랜 업그레이드** ($7/월): Persistent Disk 사용 가능
   - **외부 DB 사용**: Turso, Supabase 등
   - **Railway 사용**: 무료 크레딧으로 영구 스토리지 제공

3. **슬립 모드**
   - 15분 비활성 시 자동 슬립
   - 첫 요청 시 웨이크업 (10-30초 소요)

---

## 🧪 테스트 방법

### 로컬 테스트 (프로덕션 환경 시뮬레이션)

```bash
# 환경 변수 설정
export NODE_ENV=production
export DB_PATH=/tmp/familytree.db

# 의존성 설치 및 빌드
npm install
npm rebuild better-sqlite3

# 서버 실행
npm start
```

### Health Check 테스트

```bash
curl http://localhost:3000/api/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T...",
  "uptime": 123.456
}
```

---

## 📊 예상 빌드 시간

- **일반 빌드**: 1-2분
- **better-sqlite3 컴파일 포함**: 2-3분

> 처음 배포 시에는 캐시가 없어 더 오래 걸릴 수 있습니다.

---

## 🆘 문제가 계속되면?

1. **Render 로그 확인**
   - Dashboard → Logs 탭
   - 구체적인 오류 메시지 확인

2. **체크리스트**
   - [ ] `render.yaml` 파일이 프로젝트 루트에 있는가?
   - [ ] Git에 커밋되었는가?
   - [ ] Build Command가 올바른가?
   - [ ] 환경 변수가 설정되었는가?

3. **추가 지원**
   - 상세 문서: `docs/RENDER_DEPLOYMENT_TROUBLESHOOTING.md` 참조
   - Render 커뮤니티: https://community.render.com/

---

## 📝 다음 단계

배포 성공 후:

1. **샘플 데이터 생성** (선택적)
   - 환경 변수 `AUTO_SEED=true` 추가

2. **모니터링 설정**
   - UptimeRobot 또는 Cron-Job.org로 슬립 방지

3. **커스텀 도메인 연결** (선택적)
   - Render Settings → Custom Domain

4. **영구 스토리지 고려**
   - 실제 사용 시 데이터 보존 필요

---

**배포 성공을 기원합니다! 🚀**

