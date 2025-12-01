const { db } = require('./Database');

/**
 * Relationship 모델
 * 가족 관계 관리 (relationships 테이블)
 */
class Relationship {
  /**
   * 모든 관계 조회
   * @returns {Array} 관계 목록
   */
  static getAll() {
    return db.prepare('SELECT * FROM relationships ORDER BY created_at DESC').all();
  }

  /**
   * 특정 사람의 모든 관계 조회
   * @param {number} personId - 사람 ID
   * @returns {Array} 관계 목록
   */
  static getByPersonId(personId) {
    return db.prepare(
      'SELECT * FROM relationships WHERE person_id = ? OR related_person_id = ?'
    ).all(personId, personId);
  }

  /**
   * 특정 타입의 관계 조회
   * @param {number} personId - 사람 ID
   * @param {string} type - 관계 타입 (parent, child, spouse, sibling)
   * @returns {Array} 관계 목록
   */
  static getByType(personId, type) {
    return db.prepare(
      'SELECT * FROM relationships WHERE person_id = ? AND relationship_type = ?'
    ).all(personId, type);
  }

  /**
   * 관계 생성
   * @param {number} personId - 사람 ID
   * @param {number} relatedPersonId - 관련된 사람 ID
   * @param {string} type - 관계 타입
   * @returns {Object} 생성된 관계
   */
  static create(personId, relatedPersonId, type) {
    try {
      const result = db.prepare(`
        INSERT INTO relationships (person_id, related_person_id, relationship_type)
        VALUES (?, ?, ?)
      `).run(personId, relatedPersonId, type);

      return this.getById(result.lastInsertRowid);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        // 이미 존재하는 관계
        return db.prepare(
          'SELECT * FROM relationships WHERE person_id = ? AND related_person_id = ? AND relationship_type = ?'
        ).get(personId, relatedPersonId, type);
      }
      throw error;
    }
  }

  /**
   * ID로 관계 조회
   * @param {number} id - 관계 ID
   * @returns {Object|null} 관계 정보
   */
  static getById(id) {
    return db.prepare('SELECT * FROM relationships WHERE id = ?').get(id);
  }

  /**
   * 관계 삭제
   * @param {number} id - 관계 ID
   * @returns {boolean} 삭제 성공 여부
   */
  static delete(id) {
    const result = db.prepare('DELETE FROM relationships WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 특정 관계 삭제 (personId, relatedPersonId, type으로)
   * @param {number} personId - 사람 ID
   * @param {number} relatedPersonId - 관련된 사람 ID
   * @param {string} type - 관계 타입
   * @returns {boolean} 삭제 성공 여부
   */
  static deleteByDetails(personId, relatedPersonId, type) {
    const result = db.prepare(
      'DELETE FROM relationships WHERE person_id = ? AND related_person_id = ? AND relationship_type = ?'
    ).run(personId, relatedPersonId, type);
    return result.changes > 0;
  }

  /**
   * 사람의 모든 관계 삭제
   * @param {number} personId - 사람 ID
   * @returns {number} 삭제된 관계 수
   */
  static deleteAllByPerson(personId) {
    const result = db.prepare(
      'DELETE FROM relationships WHERE person_id = ? OR related_person_id = ?'
    ).run(personId, personId);
    return result.changes;
  }

  /**
   * 부모-자녀 관계 생성 (양방향)
   * @param {number} parentId - 부모 ID
   * @param {number} childId - 자녀 ID
   */
  static createParentChild(parentId, childId) {
    const transaction = db.transaction(() => {
      this.create(parentId, childId, 'child');
      this.create(childId, parentId, 'parent');
    });

    transaction();
  }

  /**
   * 형제자매 관계 생성 (양방향)
   * @param {number} personId1 - 첫 번째 사람 ID
   * @param {number} personId2 - 두 번째 사람 ID
   */
  static createSibling(personId1, personId2) {
    const transaction = db.transaction(() => {
      this.create(personId1, personId2, 'sibling');
      this.create(personId2, personId1, 'sibling');
    });

    transaction();
  }

  /**
   * 배우자 관계 생성 (양방향)
   * @param {number} personId1 - 첫 번째 사람 ID
   * @param {number} personId2 - 두 번째 사람 ID
   */
  static createSpouse(personId1, personId2) {
    const transaction = db.transaction(() => {
      this.create(personId1, personId2, 'spouse');
      this.create(personId2, personId1, 'spouse');
    });

    transaction();
  }

  /**
   * 관계 정보와 함께 사람 정보 조회
   * @param {number} personId - 사람 ID
   * @returns {Object} 관계와 관련 사람들 정보
   */
  static getRelatedPersons(personId) {
    const relationships = this.getByPersonId(personId);
    
    return relationships.map(rel => {
      const relatedId = rel.person_id === personId ? rel.related_person_id : rel.person_id;
      const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(relatedId);
      
      return {
        relationship_id: rel.id,
        relationship_type: rel.relationship_type,
        person: person,
        created_at: rel.created_at
      };
    });
  }

  /**
   * 관계 통계
   * @returns {Object} 관계 타입별 개수
   */
  static getStatistics() {
    const stats = db.prepare(`
      SELECT relationship_type, COUNT(*) as count
      FROM relationships
      GROUP BY relationship_type
    `).all();

    const result = {
      parent: 0,
      child: 0,
      spouse: 0,
      sibling: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat.relationship_type] = stat.count;
      result.total += stat.count;
    });

    return result;
  }
}

module.exports = Relationship;

