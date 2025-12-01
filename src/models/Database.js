const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 환경 변수에서 DB 경로 가져오기 (없으면 기본값 사용)
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/familytree.db');

// 데이터 디렉토리 확인 및 생성
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📁 데이터 디렉토리 생성: ${dataDir}`);
}

// SQLite 데이터베이스 연결
const db = new Database(dbPath);

// WAL 모드 활성화 (성능 향상 및 동시성 개선)
db.pragma('journal_mode = WAL');

// 외래 키 제약조건 활성화
db.pragma('foreign_keys = ON');

/**
 * 데이터베이스 초기화 함수
 * 테이블 생성 및 인덱스 설정
 */
function initializeDatabase() {
  console.log('🗄️  데이터베이스 초기화 중...');

  // 기존 데이터베이스 마이그레이션 체크 (가장 먼저 실행)
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='persons'").get();
  
  if (tables) {
    // persons 테이블이 이미 존재하면 마이그레이션 필요 여부 확인
    const columns = db.prepare("PRAGMA table_info(persons)").all();
    const hasFamilyTreeId = columns.some(col => col.name === 'family_tree_id');
    
    if (!hasFamilyTreeId) {
      console.log('⚠️  기존 데이터베이스 감지. 마이그레이션을 시작합니다...');
      migrateExistingDataBeforeInit();
      console.log('✅ 데이터베이스 초기화 완료!');
      console.log(`📁 데이터베이스 경로: ${dbPath}`);
      return;
    }
  }

  // family_trees 테이블 생성 (가계도 관리)
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      root_person_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // persons 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_tree_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      phone_number TEXT,
      photo TEXT,
      
      -- 개인 정보
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
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
      
      FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
      FOREIGN KEY (father_id) REFERENCES persons(id) ON DELETE SET NULL,
      FOREIGN KEY (mother_id) REFERENCES persons(id) ON DELETE SET NULL,
      FOREIGN KEY (spouse_id) REFERENCES persons(id) ON DELETE SET NULL
    )
  `);

  // relationships 테이블 생성 (추가 관계 기록용)
  db.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      related_person_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (related_person_id) REFERENCES persons(id) ON DELETE CASCADE,
      
      UNIQUE(person_id, related_person_id, relationship_type)
    )
  `);

  // 인덱스 생성 (성능 최적화)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_family_trees_name ON family_trees(name);
    CREATE INDEX IF NOT EXISTS idx_persons_family_tree ON persons(family_tree_id);
    CREATE INDEX IF NOT EXISTS idx_persons_father ON persons(father_id);
    CREATE INDEX IF NOT EXISTS idx_persons_mother ON persons(mother_id);
    CREATE INDEX IF NOT EXISTS idx_persons_spouse ON persons(spouse_id);
    CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
    CREATE INDEX IF NOT EXISTS idx_persons_generation ON persons(generation);
    CREATE INDEX IF NOT EXISTS idx_relationships_person ON relationships(person_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_related ON relationships(related_person_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
  `);

  // updated_at 자동 업데이트 트리거 (family_trees)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_family_trees_timestamp 
    AFTER UPDATE ON family_trees
    BEGIN
      UPDATE family_trees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // updated_at 자동 업데이트 트리거 (persons)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_persons_timestamp 
    AFTER UPDATE ON persons
    BEGIN
      UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  console.log('✅ 데이터베이스 초기화 완료!');
  console.log(`📁 데이터베이스 경로: ${dbPath}`);
}

/**
 * 샘플 데이터 삽입 (개발/테스트용)
 */
function insertSampleData() {
  console.log('📝 샘플 데이터 삽입 중...');

  // 이미 데이터가 있는지 확인
  const count = db.prepare('SELECT COUNT(*) as count FROM persons').get();
  if (count.count > 0) {
    console.log('ℹ️  데이터가 이미 존재합니다. 샘플 데이터 삽입을 건너뜁니다.');
    return;
  }

  // 트랜잭션으로 샘플 데이터 삽입
  const insertSample = db.transaction(() => {
    // ==========================================
    // 가계도 생성
    // ==========================================
    const kimFamily = db.prepare(`
      INSERT INTO family_trees (name, description)
      VALUES (?, ?)
    `).run('김씨 가문', '김대호를 시조로 하는 김씨 가족의 가계도');

    const familyTreeId = kimFamily.lastInsertRowid;

    // ==========================================
    // 1세대 (최상위 조상 - 증조부모)
    // ==========================================
    const greatGrandpa = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김대호', 'male', '1920-03-10', 1, 0);

    const greatGrandma = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '최영숙', 'female', '1923-07-22', 1, 0);

    // 가계도의 루트 인물 설정
    db.prepare('UPDATE family_trees SET root_person_id = ? WHERE id = ?').run(greatGrandpa.lastInsertRowid, familyTreeId);

    // 배우자 관계 설정
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(greatGrandma.lastInsertRowid, greatGrandpa.lastInsertRowid);
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(greatGrandpa.lastInsertRowid, greatGrandma.lastInsertRowid);

    // ==========================================
    // 2세대 (1세대의 자녀들 - 조부모)
    // ==========================================
    
    // 김대호 + 최영숙의 자녀들
    const grandpa = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, phone_number, father_id, mother_id, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김일중', 'male', '1945-01-15', '010-3027-1636', greatGrandpa.lastInsertRowid, greatGrandma.lastInsertRowid, 2, 1);

    const grandUncle = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김일수', 'male', '1948-06-12', greatGrandpa.lastInsertRowid, greatGrandma.lastInsertRowid, 2, 1);

    // 조부모의 배우자들 (2세대로 추가)
    const grandma = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '박순자', 'female', '1947-03-20', 2, 1);

    const grandUncleWife = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, generation, is_alive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '정미숙', 'female', '1950-09-30', 2, 1);

    // 배우자 관계 설정
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(grandma.lastInsertRowid, grandpa.lastInsertRowid);
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(grandpa.lastInsertRowid, grandma.lastInsertRowid);
    
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(grandUncleWife.lastInsertRowid, grandUncle.lastInsertRowid);
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(grandUncle.lastInsertRowid, grandUncleWife.lastInsertRowid);

    // ==========================================
    // 3세대 (2세대의 자녀들 - 부모)
    // ==========================================
    
    // 김일중 + 박순자의 자녀들
    const father = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, phone_number, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김철수', 'male', '1970-05-10', '010-1234-5678', grandpa.lastInsertRowid, grandma.lastInsertRowid, 3);

    const uncle = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김철민', 'male', '1972-08-22', grandpa.lastInsertRowid, grandma.lastInsertRowid, 3);

    const aunt = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김미영', 'female', '1975-02-14', grandpa.lastInsertRowid, grandma.lastInsertRowid, 3);

    // 김일수 + 정미숙의 자녀들
    const cousin1 = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김준호', 'male', '1974-04-08', grandUncle.lastInsertRowid, grandUncleWife.lastInsertRowid, 3);

    const cousin2 = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김수진', 'female', '1976-11-25', grandUncle.lastInsertRowid, grandUncleWife.lastInsertRowid, 3);

    // 3세대 배우자들
    const mother = db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, phone_number, generation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '이영희', 'female', '1973-08-25', '010-2345-6789', 3);

    // 김철수 + 이영희 배우자 관계
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(mother.lastInsertRowid, father.lastInsertRowid);
    db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(father.lastInsertRowid, mother.lastInsertRowid);

    // ==========================================
    // 4세대 (3세대의 자녀들 - 손자/손녀)
    // ==========================================
    
    // 김철수 + 이영희의 자녀들
    db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, phone_number, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김민수', 'male', '2000-12-03', '010-3456-7890', father.lastInsertRowid, mother.lastInsertRowid, 4);

    db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, mother_id, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김지은', 'female', '2003-07-18', father.lastInsertRowid, mother.lastInsertRowid, 4);

    // 김준호의 자녀들
    db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, generation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김서연', 'female', '2001-09-12', cousin1.lastInsertRowid, 4);

    db.prepare(`
      INSERT INTO persons (family_tree_id, name, gender, birth_date, father_id, generation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(familyTreeId, '김하준', 'male', '2004-03-28', cousin1.lastInsertRowid, 4);
  });

  insertSample();
  console.log('✅ 샘플 데이터 삽입 완료!');
}

/**
 * 데이터베이스 백업
 */
function backupDatabase() {
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(backupDir, `familytree-${timestamp}.db`);
  
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 백업 완료: ${backupPath}`);
  
  return backupPath;
}

/**
 * 초기화 전 기존 데이터 마이그레이션
 */
function migrateExistingDataBeforeInit() {
  console.log('🔄 기존 데이터 마이그레이션 중...');

  try {
    // 백업 생성
    backupDatabase();

    // family_trees 테이블 생성
    db.exec(`
      CREATE TABLE IF NOT EXISTS family_trees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        root_person_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 기본 가계도 생성
    const defaultTree = db.prepare(`
      INSERT INTO family_trees (name, description)
      VALUES (?, ?)
    `).run('기본 가계도', '기존 데이터를 포함하는 기본 가계도');

    const defaultTreeId = defaultTree.lastInsertRowid;

    // 임시 테이블 생성
    db.exec(`
      CREATE TABLE persons_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_tree_id INTEGER NOT NULL DEFAULT ${defaultTreeId},
        name TEXT NOT NULL,
        phone_number TEXT,
        photo TEXT,
        gender TEXT CHECK(gender IN ('male', 'female', 'other')),
        birth_date TEXT,
        death_date TEXT,
        is_alive BOOLEAN DEFAULT 1,
        email TEXT,
        address TEXT,
        occupation TEXT,
        notes TEXT,
        father_id INTEGER,
        mother_id INTEGER,
        spouse_id INTEGER,
        generation INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
        FOREIGN KEY (father_id) REFERENCES persons(id) ON DELETE SET NULL,
        FOREIGN KEY (mother_id) REFERENCES persons(id) ON DELETE SET NULL,
        FOREIGN KEY (spouse_id) REFERENCES persons(id) ON DELETE SET NULL
      )
    `);

    // 데이터 복사
    db.exec(`
      INSERT INTO persons_new 
      SELECT 
        id, ${defaultTreeId} as family_tree_id, name, phone_number, photo,
        gender, birth_date, death_date, is_alive,
        email, address, occupation, notes,
        father_id, mother_id, spouse_id,
        generation, created_at, updated_at
      FROM persons
    `);

    // 기존 테이블 삭제 및 새 테이블로 교체
    db.exec('DROP TABLE persons');
    db.exec('ALTER TABLE persons_new RENAME TO persons');

    // relationships 테이블 생성
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        related_person_id INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
        FOREIGN KEY (related_person_id) REFERENCES persons(id) ON DELETE CASCADE,
        
        UNIQUE(person_id, related_person_id, relationship_type)
      )
    `);

    // 인덱스 생성
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_family_trees_name ON family_trees(name);
      CREATE INDEX IF NOT EXISTS idx_persons_family_tree ON persons(family_tree_id);
      CREATE INDEX IF NOT EXISTS idx_persons_father ON persons(father_id);
      CREATE INDEX IF NOT EXISTS idx_persons_mother ON persons(mother_id);
      CREATE INDEX IF NOT EXISTS idx_persons_spouse ON persons(spouse_id);
      CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
      CREATE INDEX IF NOT EXISTS idx_persons_generation ON persons(generation);
      CREATE INDEX IF NOT EXISTS idx_relationships_person ON relationships(person_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_related ON relationships(related_person_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
    `);

    // 트리거 생성
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_family_trees_timestamp 
      AFTER UPDATE ON family_trees
      BEGIN
        UPDATE family_trees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_persons_timestamp 
      AFTER UPDATE ON persons
      BEGIN
        UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // 루트 인물 설정 (generation이 가장 낮은 사람)
    const rootPerson = db.prepare(`
      SELECT id FROM persons 
      WHERE family_tree_id = ? 
      ORDER BY generation ASC, id ASC 
      LIMIT 1
    `).get(defaultTreeId);

    if (rootPerson) {
      db.prepare('UPDATE family_trees SET root_person_id = ? WHERE id = ?')
        .run(rootPerson.id, defaultTreeId);
    }

    console.log('✅ 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error.message);
    throw error;
  }
}

/**
 * 기존 데이터 마이그레이션 (family_tree_id 추가)
 * @deprecated 이제 migrateExistingDataBeforeInit 사용
 */
function migrateExistingData() {
  console.log('🔄 데이터 마이그레이션 시작...');

  try {
    // 먼저 persons 테이블에 family_tree_id 컬럼이 있는지 확인
    const columns = db.prepare("PRAGMA table_info(persons)").all();
    const hasFamilyTreeId = columns.some(col => col.name === 'family_tree_id');

    if (!hasFamilyTreeId) {
      console.log('⚠️  family_tree_id 컬럼이 없습니다. 마이그레이션이 필요합니다.');
      
      // 백업 생성
      backupDatabase();

      // 기본 가계도 생성
      const defaultTree = db.prepare(`
        INSERT INTO family_trees (name, description)
        VALUES (?, ?)
      `).run('기본 가계도', '기존 데이터를 포함하는 기본 가계도');

      const defaultTreeId = defaultTree.lastInsertRowid;

      // 임시 테이블 생성
      db.exec(`
        CREATE TABLE persons_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          family_tree_id INTEGER NOT NULL DEFAULT ${defaultTreeId},
          name TEXT NOT NULL,
          phone_number TEXT,
          photo TEXT,
          gender TEXT CHECK(gender IN ('male', 'female', 'other')),
          birth_date TEXT,
          death_date TEXT,
          is_alive BOOLEAN DEFAULT 1,
          email TEXT,
          address TEXT,
          occupation TEXT,
          notes TEXT,
          father_id INTEGER,
          mother_id INTEGER,
          spouse_id INTEGER,
          generation INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (family_tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
          FOREIGN KEY (father_id) REFERENCES persons(id) ON DELETE SET NULL,
          FOREIGN KEY (mother_id) REFERENCES persons(id) ON DELETE SET NULL,
          FOREIGN KEY (spouse_id) REFERENCES persons(id) ON DELETE SET NULL
        )
      `);

      // 데이터 복사
      db.exec(`
        INSERT INTO persons_new 
        SELECT 
          id, ${defaultTreeId} as family_tree_id, name, phone_number, photo,
          gender, birth_date, death_date, is_alive,
          email, address, occupation, notes,
          father_id, mother_id, spouse_id,
          generation, created_at, updated_at
        FROM persons
      `);

      // 기존 테이블 삭제 및 새 테이블로 교체
      db.exec('DROP TABLE persons');
      db.exec('ALTER TABLE persons_new RENAME TO persons');

      // 인덱스 재생성
      db.exec(`
        CREATE INDEX idx_persons_family_tree ON persons(family_tree_id);
        CREATE INDEX idx_persons_father ON persons(father_id);
        CREATE INDEX idx_persons_mother ON persons(mother_id);
        CREATE INDEX idx_persons_spouse ON persons(spouse_id);
        CREATE INDEX idx_persons_name ON persons(name);
        CREATE INDEX idx_persons_generation ON persons(generation);
      `);

      // 트리거 재생성
      db.exec(`
        CREATE TRIGGER update_persons_timestamp 
        AFTER UPDATE ON persons
        BEGIN
          UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      // 루트 인물 설정 (generation이 가장 낮은 사람)
      const rootPerson = db.prepare(`
        SELECT id FROM persons 
        WHERE family_tree_id = ? 
        ORDER BY generation ASC, id ASC 
        LIMIT 1
      `).get(defaultTreeId);

      if (rootPerson) {
        db.prepare('UPDATE family_trees SET root_person_id = ? WHERE id = ?')
          .run(rootPerson.id, defaultTreeId);
      }

      console.log('✅ 마이그레이션 완료!');
    } else {
      console.log('✅ 마이그레이션이 필요하지 않습니다.');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error.message);
    throw error;
  }
}

// 스크립트로 직접 실행 시 초기화 및 샘플 데이터 삽입
if (require.main === module) {
  initializeDatabase();
  
  const args = process.argv.slice(2);
  if (args.includes('--sample')) {
    insertSampleData();
  }
  
  // 테이블 정보 출력
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📊 생성된 테이블:', tables.map(t => t.name).join(', '));
  
  const personCount = db.prepare('SELECT COUNT(*) as count FROM persons').get();
  console.log(`👥 등록된 사람 수: ${personCount.count}명\n`);
  
  db.close();
}

// 모듈 내보내기
module.exports = {
  db,
  initializeDatabase,
  insertSampleData,
  backupDatabase,
  migrateExistingData
};

