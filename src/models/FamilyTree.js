const { db } = require('./Database');

/**
 * FamilyTree 모델
 * 가계도 정보 CRUD 작업
 */
class FamilyTree {
  /**
   * 모든 가계도 조회
   * @returns {Array} 가계도 목록
   */
  static getAll() {
    const trees = db.prepare(`
      SELECT 
        ft.*,
        p.name as root_person_name,
        (SELECT COUNT(*) FROM persons WHERE family_tree_id = ft.id) as member_count
      FROM family_trees ft
      LEFT JOIN persons p ON ft.root_person_id = p.id
      ORDER BY ft.created_at DESC
    `).all();

    return trees;
  }

  /**
   * ID로 가계도 조회
   * @param {number} id - 가계도 ID
   * @returns {Object|null} 가계도 정보
   */
  static getById(id) {
    const tree = db.prepare(`
      SELECT 
        ft.*,
        p.name as root_person_name,
        (SELECT COUNT(*) FROM persons WHERE family_tree_id = ft.id) as member_count
      FROM family_trees ft
      LEFT JOIN persons p ON ft.root_person_id = p.id
      WHERE ft.id = ?
    `).get(id);

    return tree || null;
  }

  /**
   * 가계도의 모든 구성원 조회
   * @param {number} id - 가계도 ID
   * @param {Object} options - 필터 옵션
   * @returns {Array} 구성원 목록
   */
  static getMembers(id, options = {}) {
    let query = 'SELECT * FROM persons WHERE family_tree_id = ?';
    const params = [id];
    const conditions = [];

    // 필터링 조건
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
      query += ' AND ' + conditions.join(' AND ');
    }

    // 정렬
    query += ' ORDER BY generation ASC, birth_date ASC';

    return db.prepare(query).all(...params);
  }

  /**
   * 새 가계도 생성
   * @param {Object} data - 가계도 정보
   * @returns {Object} 생성된 가계도 정보
   */
  static create(data) {
    const { name, description, root_person_id } = data;

    if (!name) {
      throw new Error('가계도 이름은 필수입니다.');
    }

    const result = db.prepare(`
      INSERT INTO family_trees (name, description, root_person_id)
      VALUES (?, ?, ?)
    `).run(name, description || null, root_person_id || null);

    return this.getById(result.lastInsertRowid);
  }

  /**
   * 가계도 정보 수정
   * @param {number} id - 가계도 ID
   * @param {Object} data - 수정할 정보
   * @returns {Object} 수정된 가계도 정보
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    const allowedFields = ['name', 'description', 'root_person_id'];

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

    const query = `UPDATE family_trees SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    return this.getById(id);
  }

  /**
   * 가계도 삭제
   * @param {number} id - 가계도 ID
   * @returns {boolean} 삭제 성공 여부
   */
  static delete(id) {
    const tree = this.getById(id);
    if (!tree) return false;

    // CASCADE로 인해 해당 가계도의 모든 구성원도 함께 삭제됨
    const result = db.prepare('DELETE FROM family_trees WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 가계도 통계 정보
   * @param {number} id - 가계도 ID
   * @returns {Object} 통계
   */
  static getStatistics(id) {
    const total = db.prepare('SELECT COUNT(*) as count FROM persons WHERE family_tree_id = ?').get(id);
    const alive = db.prepare('SELECT COUNT(*) as count FROM persons WHERE family_tree_id = ? AND is_alive = 1').get(id);
    const male = db.prepare('SELECT COUNT(*) as count FROM persons WHERE family_tree_id = ? AND gender = "male"').get(id);
    const female = db.prepare('SELECT COUNT(*) as count FROM persons WHERE family_tree_id = ? AND gender = "female"').get(id);
    const generations = db.prepare('SELECT MAX(generation) as max FROM persons WHERE family_tree_id = ?').get(id);

    return {
      total: total.count,
      alive: alive.count,
      deceased: total.count - alive.count,
      male: male.count,
      female: female.count,
      generations: generations.max || 0
    };
  }

  /**
   * 가계도 복제
   * @param {number} id - 복제할 가계도 ID
   * @param {string} newName - 새 가계도 이름
   * @returns {Object} 복제된 가계도 정보
   */
  static clone(id, newName) {
    const sourceTree = this.getById(id);
    if (!sourceTree) {
      throw new Error('원본 가계도를 찾을 수 없습니다.');
    }

    const cloneTransaction = db.transaction(() => {
      // 새 가계도 생성
      const newTree = db.prepare(`
        INSERT INTO family_trees (name, description)
        VALUES (?, ?)
      `).run(
        newName || `${sourceTree.name} (복사본)`,
        sourceTree.description ? `${sourceTree.description} (복사본)` : null
      );

      const newTreeId = newTree.lastInsertRowid;

      // 구성원 복사 (ID 매핑 저장)
      const members = db.prepare('SELECT * FROM persons WHERE family_tree_id = ?').all(id);
      const idMapping = {};

      members.forEach(member => {
        const newMember = db.prepare(`
          INSERT INTO persons (
            family_tree_id, name, phone_number, photo,
            gender, birth_date, death_date, is_alive,
            email, address, occupation, notes,
            generation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newTreeId,
          member.name,
          member.phone_number,
          member.photo,
          member.gender,
          member.birth_date,
          member.death_date,
          member.is_alive,
          member.email,
          member.address,
          member.occupation,
          member.notes,
          member.generation
        );

        idMapping[member.id] = newMember.lastInsertRowid;
      });

      // 관계 복사 (부모, 배우자)
      members.forEach(member => {
        const updates = [];
        const values = [];

        if (member.father_id && idMapping[member.father_id]) {
          updates.push('father_id = ?');
          values.push(idMapping[member.father_id]);
        }

        if (member.mother_id && idMapping[member.mother_id]) {
          updates.push('mother_id = ?');
          values.push(idMapping[member.mother_id]);
        }

        if (member.spouse_id && idMapping[member.spouse_id]) {
          updates.push('spouse_id = ?');
          values.push(idMapping[member.spouse_id]);
        }

        if (updates.length > 0) {
          values.push(idMapping[member.id]);
          db.prepare(`UPDATE persons SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }
      });

      // 루트 인물 설정
      if (sourceTree.root_person_id && idMapping[sourceTree.root_person_id]) {
        db.prepare('UPDATE family_trees SET root_person_id = ? WHERE id = ?')
          .run(idMapping[sourceTree.root_person_id], newTreeId);
      }

      return newTreeId;
    });

    const newTreeId = cloneTransaction();
    return this.getById(newTreeId);
  }
}

module.exports = FamilyTree;

