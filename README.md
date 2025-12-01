# 🌳 가족 트리 웹 애플리케이션

가족 구성원들의 정보를 관리하고 가계도를 시각화하는 웹 애플리케이션입니다.
모바일과 데스크톱에서 모두 사용 가능하며, 여러 가계도를 동시에 관리할 수 있습니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## ✨ 주요 기능

### 🎯 다중 가계도 관리 (New!)
- 🏠 **여러 가계도 동시 관리** - 각 가족의 가계도를 독립적으로 관리
- 🔄 **가계도 전환** - 헤더에서 간편하게 가계도 선택
- 📋 **가계도 복제** - 기존 가계도를 템플릿으로 활용
- 📊 **가계도별 통계** - 각 가계도의 구성원, 세대 통계 확인
- 🗑️ **독립적 삭제** - 한 가계도의 변경이 다른 가계도에 영향 없음

### 🌲 가계도 시각화
- **선으로 연결된 계층적 트리 구조**
  - 부모-자녀 관계를 연결선으로 시각적 표시
  - 배우자 관계 수평선 연결
  - 세대별 구분 및 그룹화
- **줌 인/아웃** 기능으로 큰 가계도도 편리하게 탐색
- **간소화 모드** - 많은 구성원도 한눈에
- **반응형 디자인** - 모바일/태블릿/데스크톱 지원

### 👨‍👩‍👧‍👦 가족 관리
- 📝 **구성원 정보 등록/수정/삭제**
  - 이름, 생년월일, 성별, 연락처
  - 이메일, 주소, 직업
  - 메모 및 추가 정보
- 🔗 **가족 관계 설정** (부모, 자녀, 배우자, 형제자매)
- 📷 **사진 업로드** 및 자동 아바타 생성
- 🔍 **강력한 검색 및 필터링**
  - 이름, 전화번호, 이메일로 검색
  - 성별, 세대, 생존 여부 필터
- 📊 **실시간 통계 대시보드**

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: SQLite3 (better-sqlite3)
  - 파일 기반 경량 DB
  - 별도 서버 불필요
  - WAL 모드로 동시성 개선

### Frontend
- **HTML5 / CSS3** - 모던 웹 표준
- **Vanilla JavaScript** - 프레임워크 없는 순수 JS
- **반응형 디자인** - 모바일 퍼스트
- **계층적 트리 구조** - CSS Flexbox 기반

### 파일 관리
- **Multer** - 사진 업로드
- **자동 리사이징** - 최적화된 이미지 저장

## 📋 사전 요구사항

- **Node.js** 16.0.0 이상
- **npm** 또는 **yarn**
- **(선택) Git** - 버전 관리용

## 🚀 로컬 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_USERNAME/familyTree.git
cd familyTree
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정 (선택사항)

```bash
# example.env 파일을 복사하여 .env 생성
cp example.env .env
```

`.env` 파일 내용:
```env
PORT=3000
NODE_ENV=production
```

### 4. 데이터베이스 초기화

**빈 데이터베이스로 시작:**
```bash
npm run init-db
```

**샘플 데이터와 함께 시작:**
```bash
npm run init-db-sample
```

### 5. 서버 실행

**개발 모드** (코드 변경 시 자동 재시작):
```bash
npm run dev
```

**프로덕션 모드**:
```bash
npm start
```

### 6. 브라우저에서 접속

- **로컬**: http://localhost:3000
- **네트워크**: http://[YOUR_IP]:3000

같은 WiFi에 연결된 기기에서 네트워크 IP로 접속 가능합니다.

## 📁 프로젝트 구조

```
familyTree/
├── server.js              # Express 서버 메인
├── package.json           # 패키지 정보
├── DESIGN.md             # 설계 문서
├── data/                 # SQLite DB
│   └── familytree.db
├── uploads/              # 업로드 사진
├── src/                  # 백엔드 소스
│   ├── routes/          # API 라우트
│   ├── models/          # 데이터 모델
│   ├── middleware/      # 미들웨어
│   └── utils/           # 유틸리티
└── public/              # 프론트엔드
    ├── index.html
    ├── css/
    └── js/
```

## 🔌 API 엔드포인트

### 가계도 관리 (New!)
- `GET /api/familytrees` - 모든 가계도 목록 조회
- `GET /api/familytrees/:id` - 특정 가계도 조회
- `GET /api/familytrees/:id/members` - 가계도 구성원 조회
- `GET /api/familytrees/:id/statistics` - 가계도 통계
- `GET /api/familytrees/:id/tree` - 가계도 트리 데이터
- `POST /api/familytrees` - 새 가계도 생성
- `PUT /api/familytrees/:id` - 가계도 정보 수정
- `DELETE /api/familytrees/:id` - 가계도 삭제
- `POST /api/familytrees/:id/clone` - 가계도 복제

### 사람 정보
- `GET /api/persons` - 모든 사람 목록 조회
  - Query: `?family_tree_id=1&generation=2&gender=male&is_alive=true&search=김`
- `GET /api/persons/:id` - 특정 사람 상세 조회
- `GET /api/persons/:id/family` - 가족 관계 조회
- `GET /api/persons/stats` - 통계 정보
  - Query: `?family_tree_id=1`
- `POST /api/persons` - 새 사람 등록
- `PUT /api/persons/:id` - 사람 정보 수정
- `DELETE /api/persons/:id` - 사람 삭제
- `POST /api/persons/:id/spouse` - 배우자 관계 설정
- `DELETE /api/persons/:id/spouse` - 배우자 관계 해제
- `POST /api/persons/:id/parents` - 부모 관계 설정

### 가족 관계
- `GET /api/relations` - 모든 관계 조회
- `GET /api/relations/person/:id` - 특정 사람의 관계
- `GET /api/relations/person/:id/detailed` - 상세 관계
- `GET /api/relations/stats` - 관계 통계
- `POST /api/relations` - 관계 생성
- `POST /api/relations/parent-child` - 부모-자녀 관계
- `POST /api/relations/sibling` - 형제자매 관계
- `POST /api/relations/spouse` - 배우자 관계
- `DELETE /api/relations/:id` - 관계 삭제

### 가계도 시각화
- `GET /api/tree` - 전체 가계도 데이터
  - Query: `?family_tree_id=1`
- `GET /api/tree/:id` - 특정 사람 중심 가계도
  - Query: `?depth=3`
- `GET /api/tree/generation/:gen` - 세대별 조회
  - Query: `?family_tree_id=1`

### 파일 업로드
- `POST /api/upload` - 사진 업로드
- `GET /api/upload/list` - 업로드된 파일 목록
- `DELETE /api/upload/:filename` - 파일 삭제

### 시스템
- `GET /api/health` - 서버 상태 확인

## 💾 데이터베이스

SQLite3를 사용하여 가벼운 파일 기반 데이터베이스로 운영됩니다.

### 주요 테이블
- `family_trees`: 가계도 정보 (New!)
  - 이름, 설명, 루트 인물
  - 생성/수정 시간
- `persons`: 가족 구성원 정보
  - 기본 정보: 이름, 성별, 생년월일
  - 연락처: 전화번호, 이메일, 주소
  - 추가 정보: 직업, 메모
  - 관계: 부모, 배우자 (외래 키)
  - **가계도 연결** (family_tree_id)
- `relationships`: 추가 가족 관계
  - 형제자매, 기타 관계

### 주요 특징
- **WAL 모드**: 동시성 및 성능 향상
- **외래 키 제약조건**: 데이터 무결성 보장
- **자동 마이그레이션**: 기존 데이터 자동 변환
- **백업 기능**: 중요 작업 전 자동 백업

자세한 스키마는 [DESIGN.md](./DESIGN.md)를 참조하세요.

## 🎨 사용 방법

### 1. 가계도 관리
- **새 가계도 만들기**: "가계도 관리" 탭에서 생성
- **가계도 전환**: 헤더의 드롭다운에서 선택
- **가계도 복제**: 기존 가계도를 템플릿으로 복사
- **가계도 통계**: 구성원 수, 세대 등 확인

### 2. 가족 구성원 관리
- **등록**: "새 가족 추가" 탭에서 정보 입력
- **검색**: 이름, 전화번호, 이메일로 검색
- **필터링**: 성별, 세대, 생존 여부로 필터
- **사진 업로드**: 프로필 사진 등록 (자동 아바타 생성)

### 3. 관계 설정
- **부모 설정**: 등록 시 또는 수정 시 부모 선택
- **배우자 설정**: 상세 페이지에서 배우자 연결
- **자동 관계**: 부모 설정 시 자녀 관계 자동 생성

### 4. 가계도 시각화
- **전체 보기**: 모든 세대를 한눈에
- **중심 인물 선택**: 특정 인물 중심으로 보기
- **줌 기능**: 확대/축소로 편리하게 탐색
- **간소화 모드**: 많은 구성원도 깔끔하게

## 🔧 개발

### 개발 서버 실행

개발 모드로 실행하면 코드 변경 시 자동으로 서버가 재시작됩니다:

```bash
npm run dev
```

### NPM 스크립트

```bash
npm start              # 프로덕션 서버 시작
npm run dev            # 개발 서버 시작 (nodemon)
npm run init-db        # 빈 데이터베이스 초기화
npm run init-db-sample # 샘플 데이터와 함께 초기화
```

### 디버깅

```bash
# 상세 로그 출력
DEBUG=* npm start

# 특정 포트로 실행
PORT=8080 npm start
```

## 🌐 배포 (GitHub → 클라우드)

### Render.com (무료) - 추천! ⭐

1. **GitHub에 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/familyTree.git
   git push -u origin main
   ```

2. **Render.com 설정**
   - [Render.com](https://render.com) 접속 및 로그인
   - "New +" → "Web Service" 선택
   - GitHub 저장소 연결
   - 설정:
     - **Name**: familytree-app
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free
   - "Create Web Service" 클릭

3. **환경 변수 설정** (선택)
   - Environment 탭에서 추가:
     - `NODE_ENV`: `production`
     - `PORT`: (자동 설정됨)

### Railway.app (무료 크레딧)

1. **GitHub 푸시** (위와 동일)

2. **Railway 설정**
   - [Railway.app](https://railway.app) 접속
   - "Start a New Project" → "Deploy from GitHub repo"
   - 저장소 선택
   - 자동 배포 완료!

### Fly.io

```bash
# Fly CLI 설치
# https://fly.io/docs/hands-on/install-flyctl/

# 로그인
flyctl auth login

# 앱 초기화
flyctl launch

# 배포
flyctl deploy
```

### 본인 서버 (VPS)

```bash
# 서버에서
git clone https://github.com/YOUR_USERNAME/familyTree.git
cd familyTree
npm install
npm run init-db-sample
npm start

# PM2로 백그라운드 실행
npm install -g pm2
pm2 start server.js --name familytree
pm2 save
pm2 startup
```

### 도메인 연결

배포 후 custom domain을 연결하여 `https://familytree.yourdomain.com` 처럼 사용할 수 있습니다.

## 📱 모바일 접속

같은 WiFi에 연결된 모바일 기기에서:
1. 서버 실행 시 표시되는 **네트워크 IP** 확인
2. 모바일 브라우저에서 `http://[네트워크_IP]:3000` 접속

예: `http://192.168.0.10:3000`

## 🔒 보안 고려사항

프로덕션 배포 시:
- [ ] 환경 변수로 중요 설정 관리
- [ ] HTTPS 사용 (Render, Railway는 자동 제공)
- [ ] 파일 업로드 크기 제한 설정
- [ ] Rate limiting 추가 고려
- [ ] 정기적인 데이터베이스 백업

## 🐛 문제 해결

### 데이터베이스 오류
```bash
# 데이터베이스 재초기화
rm -rf data/*.db*
npm run init-db-sample
```

### 포트 충돌
```bash
# 다른 포트로 실행
PORT=8080 npm start
```

### 업로드 폴더 권한
```bash
# uploads 폴더 권한 설정
chmod 755 uploads
```

더 많은 문제 해결 방법은 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 참조.

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자유롭게 사용, 수정, 배포할 수 있습니다.

자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 🤝 기여하기

기여는 언제나 환영합니다! 다음과 같이 기여할 수 있습니다:

1. 이 저장소를 Fork
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 개선 아이디어
- [ ] 다국어 지원 (i18n)
- [ ] PDF/이미지로 가계도 내보내기
- [ ] 사용자 인증 시스템
- [ ] 클라우드 스토리지 연동
- [ ] 모바일 앱 (React Native)

## ⭐ Star History

이 프로젝트가 유용하다면 ⭐ Star를 눌러주세요!

## 📞 지원 및 문의

- **이슈**: [GitHub Issues](https://github.com/YOUR_USERNAME/familyTree/issues)
- **토론**: [GitHub Discussions](https://github.com/YOUR_USERNAME/familyTree/discussions)

## 👨‍💻 개발자

Made with ❤️ by [Your Name]

---

**Happy Family Tree Building! 🌳**

