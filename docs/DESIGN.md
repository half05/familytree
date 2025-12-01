# 가족 트리 웹 애플리케이션 설계 문서

## 📋 프로젝트 개요

가족 구성원들의 정보를 관리하고 가계도를 시각화하는 웹 애플리케이션

### 주요 기능
- 가족 구성원 정보 등록/수정/삭제
- 가계도 시각화 (트리 구조)
- 가족 관계 설정 (부모, 자녀, 배우자)
- 사진 업로드 및 관리
- 가족 구성원 검색

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **ORM/Query Builder**: better-sqlite3 (동기식, 빠른 성능)
- **File Upload**: Multer
- **CORS**: cors middleware

### Frontend
- **HTML5/CSS3/JavaScript**
- **UI Library**: Bootstrap 5 / Tailwind CSS
- **시각화**: D3.js / vis.js (가계도 렌더링)

### SQLite를 선택한 이유

✅ **장점**
- **서버리스**: 별도 DB 서버 불필요, 파일 기반으로 간편함
- **관계형 DB**: JOIN, 외래 키 제약조건으로 데이터 무결성 보장
- **트랜잭션**: ACID 보장으로 안전한 데이터 처리
- **복잡한 쿼리**: 가족 관계 조회 같은 복잡한 쿼리 작성 용이
- **성능**: better-sqlite3 사용 시 매우 빠른 성능
- **확장성**: 나중에 PostgreSQL/MySQL로 전환 용이
- **백업**: 단일 파일 복사로 간편한 백업

🎯 **가족 트리에 적합한 이유**
- 부모-자녀 관계: 외래 키로 명확하게 표현
- 복잡한 관계 조회: 조상 찾기, 후손 조회 등
- 데이터 무결성: 고아 레코드 방지
- 확장 가능: 나중에 이벤트, 메모 등 테이블 추가 가능

## 📊 데이터베이스 스키마

### 1. persons 테이블

```sql
CREATE TABLE persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT,
  photo TEXT,
  
  -- 개인 정보
  gender TEXT CHECK(gender IN ('male', 'female')),
  birth_date TEXT,
  death_date TEXT,
  is_alive BOOLEAN DEFAULT 1,
  
  -- 추가 정보
  email TEXT,
  address TEXT,
  occupation TEXT,
  notes TEXT,
  
  -- 가족 관계
  father_id INTEGER,
  mother_id INTEGER,
  spouse_id INTEGER,
  
  -- 메타 정보
  generation INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (father_id) REFERENCES persons(id) ON DELETE SET NULL,
  FOREIGN KEY (mother_id) REFERENCES persons(id) ON DELETE SET NULL,
  FOREIGN KEY (spouse_id) REFERENCES persons(id) ON DELETE SET NULL
);
```

### 2. relationships 테이블 (추가 관계 기록용)

```sql
CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  related_person_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL, -- 'parent', 'child', 'spouse', 'sibling'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
  FOREIGN KEY (related_person_id) REFERENCES persons(id) ON DELETE CASCADE,
  
  UNIQUE(person_id, related_person_id, relationship_type)
);
```

### 3. 인덱스

```sql
CREATE INDEX idx_persons_father ON persons(father_id);
CREATE INDEX idx_persons_mother ON persons(mother_id);
CREATE INDEX idx_persons_spouse ON persons(spouse_id);
CREATE INDEX idx_persons_name ON persons(name);
CREATE INDEX idx_relationships_person ON relationships(person_id);
CREATE INDEX idx_relationships_related ON relationships(related_person_id);
```

## 📊 데이터 모델

### Person 객체 구조 (JavaScript)

```javascript
{
  // 기본 정보
  id: 0,                              // 고유 ID (자동 생성)
  name: "김일중",                      // 이름 (필수)
  phone_number: "010-3027-1636",      // 전화번호
  photo: "uploads/000.jpg",           // 사진 경로
  
  // 개인 정보
  gender: "male",                     // 성별: male, female
  birth_date: "1950-01-01",          // 생년월일
  death_date: null,                   // 사망일 (null = 생존)
  is_alive: true,                     // 생존 여부
  
  // 추가 정보
  email: "example@email.com",         // 이메일
  address: "서울특별시 강남구",        // 주소
  occupation: "회사원",                // 직업
  notes: "메모 내용",                  // 비고/메모
  
  // 가족 관계
  parents: [],                        // 부모 ID 배열 [fatherId, motherId]
  children: [],                       // 자녀 ID 배열
  spouse: null,                       // 배우자 ID (null = 미혼)
  siblings: [],                       // 형제자매 ID 배열 (자동 계산 가능)
  
  // 메타 정보
  generation: 1,                      // 세대 (1세대, 2세대...)
  created_at: "2024-01-01T00:00:00Z", // 생성일시
  updated_at: "2024-01-01T00:00:00Z"  // 수정일시
}
```

### 관계 정의

- **부모-자녀 관계**: `parents` ↔ `children`
- **배우자 관계**: `spouse` (양방향 참조)
- **형제자매 관계**: 같은 부모를 가진 사람들 (자동 계산)

## 🔌 API 설계

### RESTful API Endpoints

```
GET    /api/persons              # 모든 사람 목록 조회
GET    /api/persons/:id          # 특정 사람 상세 조회
POST   /api/persons              # 새 사람 등록
PUT    /api/persons/:id          # 사람 정보 수정
DELETE /api/persons/:id          # 사람 삭제

GET    /api/persons/:id/family   # 특정 사람의 가족 관계 조회
POST   /api/relations            # 가족 관계 설정
DELETE /api/relations/:id        # 가족 관계 해제

GET    /api/tree                 # 전체 가계도 데이터
GET    /api/tree/:id             # 특정 사람 중심 가계도

POST   /api/upload               # 사진 업로드
GET    /api/photos/:filename     # 사진 조회
```

### 요청/응답 예시

#### POST /api/persons
**Request:**
```json
{
  "name": "김일중",
  "phone_number": "010-3027-1636",
  "gender": "male",
  "birth_date": "1950-01-01",
  "email": "kim@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "김일중",
    "phone_number": "010-3027-1636",
    "gender": "male",
    "birth_date": "1950-01-01",
    "email": "kim@example.com",
    "photo": null,
    "parents": [],
    "children": [],
    "spouse": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/relations
**Request:**
```json
{
  "type": "parent-child",
  "parent_id": 1,
  "child_id": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "관계가 설정되었습니다."
}
```

## 🎨 프론트엔드 구조

### 주요 페이지

1. **메인 페이지** (`/`)
   - 가계도 시각화
   - 전체 가족 트리 표시

2. **사람 목록** (`/persons`)
   - 카드 형식으로 표시
   - 검색 및 필터링 기능

3. **상세 페이지** (`/persons/:id`)
   - 개인 정보 표시
   - 가족 관계 표시
   - 정보 수정 가능

4. **등록/수정 폼** (`/persons/new`, `/persons/:id/edit`)
   - 개인 정보 입력 폼
   - 사진 업로드
   - 가족 관계 설정

### UI 컴포넌트

- **PersonCard**: 사람 정보 카드
- **FamilyTree**: 가계도 시각화 컴포넌트
- **PersonForm**: 사람 정보 입력 폼
- **RelationshipSelector**: 관계 설정 UI
- **PhotoUploader**: 사진 업로드 컴포넌트

## 📁 디렉토리 구조

```
familyTree/
├── server.js                 # Express 서버 메인 파일
├── package.json
├── .gitignore
├── README.md
├── DESIGN.md
│
├── data/                     # 데이터 저장소
│   └── familytree.db        # SQLite 데이터베이스
│
├── uploads/                  # 업로드된 사진
│   └── .gitkeep
│
├── src/
│   ├── routes/              # API 라우트
│   │   ├── persons.js
│   │   ├── relations.js
│   │   ├── tree.js
│   │   └── upload.js
│   │
│   ├── models/              # 데이터 모델
│   │   ├── Person.js        # Person 모델 (CRUD 메서드)
│   │   ├── Relationship.js  # Relationship 모델
│   │   └── Database.js      # SQLite 연결 및 초기화
│   │
│   ├── middleware/          # 미들웨어
│   │   ├── errorHandler.js
│   │   └── validator.js
│   │
│   └── utils/               # 유틸리티 함수
│       ├── treeBuilder.js   # 트리 구조 생성
│       └── idGenerator.js   # ID 생성
│
└── public/                  # 프론트엔드 정적 파일
    ├── index.html           # 메인 페이지
    ├── persons.html         # 사람 목록
    ├── person-detail.html   # 상세 페이지
    ├── person-form.html     # 등록/수정 폼
    │
    ├── css/
    │   ├── style.css        # 메인 스타일
    │   └── tree.css         # 트리 시각화 스타일
    │
    ├── js/
    │   ├── api.js           # API 호출 함수
    │   ├── tree.js          # 트리 렌더링
    │   ├── persons.js       # 사람 목록 로직
    │   └── form.js          # 폼 처리
    │
    └── images/              # 정적 이미지
        └── default-avatar.png
```

## 🚀 개발 계획

### Phase 1: 기본 구조 (1-2일)
- [x] 프로젝트 설계 문서 작성
- [ ] Express 서버 설정
- [ ] SQLite 데이터베이스 설정 및 스키마 생성
- [ ] 기본 데이터 모델 구현 (Person, Relationship)

### Phase 2: 핵심 기능 (3-4일)
- [ ] 사람 CRUD 기능 구현
- [ ] 관계 설정 기능
- [ ] 사진 업로드 기능
- [ ] 기본 UI 구현

### Phase 3: 가계도 시각화 (2-3일)
- [ ] 트리 데이터 구조 변환
- [ ] D3.js/vis.js를 이용한 시각화
- [ ] 인터랙티브 기능 추가

### Phase 4: 고급 기능 (2-3일)
- [ ] 검색 및 필터링
- [ ] 데이터 내보내기/가져오기
- [ ] 반응형 디자인
- [ ] 데이터 유효성 검증

### Phase 5: 개선 및 배포 (1-2일)
- [ ] 데이터베이스 최적화 (인덱스 추가)
- [ ] 에러 처리 개선
- [ ] 성능 최적화
- [ ] 배포 준비

## 🔒 보안 고려사항

- 입력 데이터 유효성 검증
- 파일 업로드 보안 (파일 타입, 크기 제한)
- XSS 방지
- CORS 설정
- 환경 변수로 민감 정보 관리

## 📝 추가 고려사항

### 확장 가능한 기능
- 다국어 지원
- 다크 모드
- 인쇄용 가계도 생성
- PDF 내보내기
- 타임라인 뷰
- 통계 및 분석 (평균 수명, 세대별 인구 등)
- 사용자 인증 (다중 가족 지원)

### 데이터 백업
- SQLite 데이터베이스 자동 백업
- 데이터 내보내기 (JSON, CSV)
- 데이터 가져오기 및 복구 기능
- 트랜잭션 관리로 데이터 무결성 보장

## 🎯 성공 기준

- 최소 3세대 이상의 가계도 표시 가능
- 50명 이상의 데이터 처리 가능
- 모바일 기기에서도 원활한 사용
- 직관적인 UI/UX
- 데이터 무결성 보장

