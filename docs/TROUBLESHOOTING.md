# 🔧 문제 해결 가이드

## 일반적인 문제들

### 1. 로그가 너무 많이 출력됨

**증상:** 콘솔에 수많은 GET 요청 로그가 출력됨

**원인:** 정적 파일(이미지, CSS, JS) 요청이 모두 로깅됨

**해결:** 
- ✅ **자동 해결됨** - 정적 파일 요청은 이미 로깅에서 제외되도록 설정되어 있습니다.
- 추가 조정이 필요하면 `server.js`의 로깅 미들웨어를 수정하세요.

```javascript
// server.js에서 이미 적용됨
app.use((req, res, next) => {
  if (!req.path.startsWith('/uploads') && 
      !req.path.startsWith('/images') && 
      !req.path.startsWith('/css') && 
      !req.path.startsWith('/js')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});
```

### 2. 기본 아바타 이미지 오류

**증상:** 사진이 없는 사람의 카드에서 이미지 로드 실패

**원인:** 기본 아바타 이미지 파일이 없음

**해결:**
- ✅ **자동 해결됨** - SVG 데이터 URI를 사용하여 동적으로 생성
- 성별에 따라 다른 색상과 아이콘이 표시됩니다:
  - 남성: 파란색 배경 👨
  - 여성: 분홍색 배경 👩
  - 기타: 회색 배경 👤

### 3. 포트가 이미 사용 중

**증상:** `Error: listen EADDRINUSE: address already in use`

**해결:**
```bash
# Windows
set PORT=3001 && npm start

# Linux/Mac
PORT=3001 npm start
```

또는 실행 중인 프로세스를 종료:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [프로세스ID] /F

# Linux/Mac
lsof -i :3000
kill -9 [프로세스ID]
```

### 4. 데이터베이스 오류

**증상:** `SQLITE_CANTOPEN` 또는 데이터베이스 연결 실패

**해결:**
1. `data/` 디렉토리가 있는지 확인
2. 쓰기 권한 확인
3. 데이터베이스 재초기화:
```bash
# Windows
del data\familytree.db
npm run init-db-sample

# Linux/Mac
rm data/familytree.db
npm run init-db-sample
```

### 5. 사진 업로드 실패

**증상:** 파일 업로드 시 오류 발생

**원인:**
- 파일 크기가 5MB 초과
- 허용되지 않은 파일 형식
- uploads 디렉토리 권한 문제

**해결:**
1. 파일 크기 확인 (5MB 이하)
2. 지원되는 형식 확인 (jpg, jpeg, png, gif, webp)
3. uploads 디렉토리 권한 확인:
```bash
# Windows
icacls uploads

# Linux/Mac
ls -la uploads
chmod 755 uploads  # 필요시
```

### 6. 의존성 설치 실패

**증상:** `npm install` 실행 시 오류

**해결:**
```bash
# 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules  # Linux/Mac
rmdir /s node_modules  # Windows

npm install
```

### 7. better-sqlite3 설치 오류

**증상:** `better-sqlite3` 네이티브 모듈 빌드 실패

**원인:** C++ 컴파일러 또는 Python이 없음

**해결:**

**Windows:**
```bash
npm install --global windows-build-tools
npm install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install build-essential python3
npm install
```

**Mac:**
```bash
xcode-select --install
npm install
```

### 8. nodemon이 작동하지 않음

**증상:** 코드 변경 시 서버가 자동 재시작되지 않음

**해결:**
```bash
# nodemon 전역 설치
npm install -g nodemon

# 또는 로컬 nodemon 사용
npx nodemon server.js
```

### 9. CORS 오류

**증상:** 다른 도메인에서 API 호출 시 CORS 오류

**해결:**
`server.js`에서 CORS 설정이 이미 활성화되어 있습니다. 
특정 도메인만 허용하려면:

```javascript
app.use(cors({
  origin: 'http://yourdomain.com',
  credentials: true
}));
```

### 10. 브라우저에서 페이지가 로드되지 않음

**증상:** `http://localhost:3000`에 접속 시 응답 없음

**해결 체크리스트:**
1. ✅ 서버가 실행 중인지 확인
2. ✅ 콘솔에 "서버가 실행 중입니다!" 메시지 확인
3. ✅ 방화벽 설정 확인
4. ✅ 브라우저 캐시 삭제
5. ✅ 다른 브라우저로 시도

## 성능 문제

### 데이터베이스가 느림

**해결:**
1. 인덱스가 생성되었는지 확인 (자동 생성됨)
2. 데이터베이스 파일 크기 확인
3. VACUUM 실행:
```bash
sqlite3 data/familytree.db "VACUUM;"
```

### 많은 사람 데이터 처리 시 느림

**권장:**
- 페이지네이션 구현 고려
- 검색/필터 적극 활용
- 1000명 이상의 데이터는 성능 최적화 필요

## 데이터 관련

### 데이터 백업

**정기 백업:**
```bash
# 자동 백업 (윈도우 배치)
copy data\familytree.db backups\familytree-%date%.db

# 자동 백업 (Linux/Mac 크론잡)
0 2 * * * cp ~/familytree/data/familytree.db ~/familytree/backups/familytree-$(date +\%Y\%m\%d).db
```

### 데이터 복구

```bash
# 백업에서 복구
cp backups/familytree-20240101.db data/familytree.db  # Linux/Mac
copy backups\familytree-20240101.db data\familytree.db  # Windows
```

### 데이터 내보내기

```bash
# JSON 형식으로 내보내기
sqlite3 data/familytree.db ".mode json" ".output export.json" "SELECT * FROM persons;"

# CSV 형식으로 내보내기
sqlite3 data/familytree.db ".mode csv" ".output export.csv" "SELECT * FROM persons;"
```

## 추가 도움이 필요한 경우

1. **로그 확인:** 콘솔 오류 메시지 확인
2. **데이터베이스 확인:** SQLite 뷰어로 데이터 확인
3. **브라우저 개발자 도구:** Network 탭과 Console 확인
4. **이슈 등록:** GitHub Issues (프로젝트가 있는 경우)

## 디버깅 팁

### 개발자 모드에서 실행
```bash
NODE_ENV=development npm run dev
```

### SQLite 데이터베이스 직접 확인
```bash
sqlite3 data/familytree.db

# SQLite 프롬프트에서
.tables                    # 테이블 목록
.schema persons           # persons 테이블 스키마
SELECT * FROM persons;    # 모든 데이터 조회
.quit                     # 종료
```

### API 테스트
```bash
# curl로 API 테스트
curl http://localhost:3000/api/persons
curl http://localhost:3000/api/persons/stats
```

---

**도움이 되셨나요?** 추가 문제가 있으시면 이슈를 등록해주세요! 🙏

