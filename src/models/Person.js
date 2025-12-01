const { db } = require('./Database');

/**
 * Person 모델
 * 가족 구성원 정보 CRUD 작업
 */
class Person {
  /**
   * 모든 사람 조회
   * @param {Object} options - 필터 옵션
   * @returns {Array} 사람 목록
   */
  static getAll(options = {}) {
    let query = 'SELECT * FROM persons';
    const conditions = [];
    const params = [];

    // 필터링 조건
    if (options.family_tree_id) {
      conditions.push('family_tree_id = ?');
      params.push(options.family_tree_id);
    }

    if (options.generation) {
      conditions.push('generation = ?');
      params.push(options.generation);
    }

    if (options.is_alive !== undefined) {
      conditions.push('is_alive = ?');
      params.push(options.is_alive ? 1 : 0);
    }

    if (options.gender) {
      conditions.push('gender = ?');
      params.push(options.gender);
    }

    if (options.search) {
      conditions.push('(name LIKE ? OR phone_number LIKE ? OR email LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // 정렬
    query += ' ORDER BY generation ASC, birth_date ASC';

    return db.prepare(query).all(...params);
  }

  /**
   * ID로 사람 조회
   * @param {number} id - 사람 ID
   * @returns {Object|null} 사람 정보
   */
  static getById(id) {
    return db.prepare('SELECT * FROM persons WHERE id = ?').get(id);
  }

  /**
   * 사람의 가족 관계 조회
   * @param {number} id - 사람 ID
   * @returns {Object} 가족 관계 정보
   */
  static getFamily(id) {
    const person = this.getById(id);
    if (!person) return null;

    const family = {
      person,
      father: null,
      mother: null,
      spouse: null,
      children: [],
      siblings: []
    };

    // 아버지
    if (person.father_id) {
      family.father = this.getById(person.father_id);
    }

    // 어머니
    if (person.mother_id) {
      family.mother = this.getById(person.mother_id);
    }

    // 배우자
    if (person.spouse_id) {
      family.spouse = this.getById(person.spouse_id);
    }

    // 자녀 (이 사람이 부모인 경우)
    family.children = db.prepare(
      'SELECT * FROM persons WHERE father_id = ? OR mother_id = ? ORDER BY birth_date'
    ).all(id, id);

    // 형제자매 (같은 부모를 가진 사람들, 본인 제외)
    if (person.father_id || person.mother_id) {
      const query = `
        SELECT * FROM persons 
        WHERE id != ? 
        AND (
          (father_id = ? AND father_id IS NOT NULL) 
          OR (mother_id = ? AND mother_id IS NOT NULL)
        )
        ORDER BY birth_date
      `;
      family.siblings = db.prepare(query).all(
        id,
        person.father_id,
        person.mother_id
      );
    }

    return family;
  }

  /**
   * 새 사람 생성
   * @param {Object} data - 사람 정보
   * @returns {Object} 생성된 사람 정보
   */
  static create(data) {
    const fields = [];
    const placeholders = [];
    const values = [];

    // 필수 필드
    fields.push('name');
    placeholders.push('?');
    values.push(data.name);

    // family_tree_id 처리 (기본값: 1)
    fields.push('family_tree_id');
    placeholders.push('?');
    values.push(data.family_tree_id || 1);

    // 선택적 필드
    const optionalFields = [
      'phone_number', 'photo', 'gender', 'birth_date', 'death_date', 'is_alive',
      'email', 'address', 'occupation', 'notes',
      'father_id', 'mother_id', 'spouse_id', 'generation'
    ];

    optionalFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        fields.push(field);
        placeholders.push('?');
        values.push(data[field]);
      }
    });

    const query = `
      INSERT INTO persons (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    const result = db.prepare(query).run(...values);
    
    // 배우자 관계가 있으면 양방향 설정
    if (data.spouse_id) {
      this.setSpouse(result.lastInsertRowid, data.spouse_id);
    }

    return this.getById(result.lastInsertRowid);
  }

  /**
   * 사람 정보 수정
   * @param {number} id - 사람 ID
   * @param {Object} data - 수정할 정보
   * @returns {Object} 수정된 사람 정보
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'phone_number', 'photo', 'gender', 'birth_date', 'death_date', 'is_alive',
      'email', 'address', 'occupation', 'notes',
      'father_id', 'mother_id', 'generation'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    const query = `UPDATE persons SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    // 배우자 관계 수정
    if (data.spouse_id !== undefined) {
      this.setSpouse(id, data.spouse_id);
    }

    return this.getById(id);
  }

  /**
   * 사람 삭제
   * @param {number} id - 사람 ID
   * @returns {boolean} 삭제 성공 여부
   */
  static delete(id) {
    const person = this.getById(id);
    if (!person) return false;

    // 배우자 관계 해제
    if (person.spouse_id) {
      db.prepare('UPDATE persons SET spouse_id = NULL WHERE id = ?').run(person.spouse_id);
    }

    // 삭제
    const result = db.prepare('DELETE FROM persons WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 배우자 관계 설정 (양방향)
   * @param {number} personId1 - 첫 번째 사람 ID
   * @param {number} personId2 - 두 번째 사람 ID
   */
  static setSpouse(personId1, personId2) {
    if (!personId1 || !personId2) return;

    const transaction = db.transaction(() => {
      db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(personId2, personId1);
      db.prepare('UPDATE persons SET spouse_id = ? WHERE id = ?').run(personId1, personId2);
    });

    transaction();
  }

  /**
   * 배우자 관계 해제
   * @param {number} personId - 사람 ID
   */
  static removeSpouse(personId) {
    const person = this.getById(personId);
    if (!person || !person.spouse_id) return;

    const transaction = db.transaction(() => {
      db.prepare('UPDATE persons SET spouse_id = NULL WHERE id = ?').run(person.spouse_id);
      db.prepare('UPDATE persons SET spouse_id = NULL WHERE id = ?').run(personId);
    });

    transaction();
  }

  /**
   * 부모-자녀 관계 설정
   * @param {number} childId - 자녀 ID
   * @param {number} fatherId - 아버지 ID (선택)
   * @param {number} motherId - 어머니 ID (선택)
   */
  static setParents(childId, fatherId = null, motherId = null) {
    const updates = [];
    const values = [];

    if (fatherId !== null) {
      updates.push('father_id = ?');
      values.push(fatherId);
    }

    if (motherId !== null) {
      updates.push('mother_id = ?');
      values.push(motherId);
    }

    if (updates.length === 0) return;

    values.push(childId);
    const query = `UPDATE persons SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
  }

  /**
   * 전체 가계도 데이터 조회
   * @param {number} familyTreeId - 가계도 ID (선택)
   * @returns {Array} 모든 사람과 관계 정보
   */
  static getTreeData(familyTreeId = null) {
    const options = familyTreeId ? { family_tree_id: familyTreeId } : {};
    const persons = this.getAll(options);
    
    return persons.map(person => ({
      ...person,
      children_ids: persons
        .filter(p => p.father_id === person.id || p.mother_id === person.id)
        .map(p => p.id)
    }));
  }

  /**
   * 특정 사람을 중심으로 한 가계도 데이터
   * @param {number} rootId - 루트 사람 ID
   * @param {number} depth - 탐색 깊이 (위아래)
   * @returns {Array} 관련된 사람들
   */
  static getTreeDataByRoot(rootId, depth = 3) {
    const visited = new Set();
    const result = [];

    const traverse = (personId, currentDepth) => {
      if (!personId || visited.has(personId) || currentDepth > depth) return;

      const person = this.getById(personId);
      if (!person) return;

      visited.add(personId);
      result.push(person);

      // 부모
      if (currentDepth > 0) {
        if (person.father_id) traverse(person.father_id, currentDepth - 1);
        if (person.mother_id) traverse(person.mother_id, currentDepth - 1);
      }

      // 자녀
      const children = db.prepare(
        'SELECT id FROM persons WHERE father_id = ? OR mother_id = ?'
      ).all(personId, personId);
      
      children.forEach(child => traverse(child.id, currentDepth + 1));

      // 배우자
      if (person.spouse_id && !visited.has(person.spouse_id)) {
        traverse(person.spouse_id, currentDepth);
      }
    };

    traverse(rootId, 0);
    return result;
  }

  /**
   * 통계 정보
   * @param {number} familyTreeId - 가계도 ID (선택)
   * @returns {Object} 통계
   */
  static getStatistics(familyTreeId = null) {
    const whereClause = familyTreeId ? 'WHERE family_tree_id = ?' : '';
    const params = familyTreeId ? [familyTreeId] : [];

    const total = db.prepare(`SELECT COUNT(*) as count FROM persons ${whereClause}`).get(...params);
    const alive = db.prepare(`SELECT COUNT(*) as count FROM persons ${whereClause ? whereClause + ' AND' : 'WHERE'} is_alive = 1`).get(...(familyTreeId ? [familyTreeId] : []));
    const male = db.prepare(`SELECT COUNT(*) as count FROM persons ${whereClause ? whereClause + ' AND' : 'WHERE'} gender = "male"`).get(...(familyTreeId ? [familyTreeId] : []));
    const female = db.prepare(`SELECT COUNT(*) as count FROM persons ${whereClause ? whereClause + ' AND' : 'WHERE'} gender = "female"`).get(...(familyTreeId ? [familyTreeId] : []));
    const generations = db.prepare(`SELECT MAX(generation) as max FROM persons ${whereClause}`).get(...params);

    return {
      total: total.count,
      alive: alive.count,
      deceased: total.count - alive.count,
      male: male.count,
      female: female.count,
      generations: generations.max || 0
    };
  }
}

module.exports = Person;

