const express = require('express');
const router = express.Router();
const Relationship = require('../models/Relationship');

/**
 * GET /api/relations
 * 모든 관계 조회
 */
router.get('/', (req, res) => {
  try {
    const relations = Relationship.getAll();
    res.json({
      success: true,
      count: relations.length,
      data: relations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/relations/stats
 * 관계 통계
 */
router.get('/stats', (req, res) => {
  try {
    const stats = Relationship.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/relations/person/:id
 * 특정 사람의 모든 관계 조회
 */
router.get('/person/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const relations = Relationship.getByPersonId(id);
    
    res.json({
      success: true,
      count: relations.length,
      data: relations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/relations/person/:id/detailed
 * 특정 사람의 관계와 관련 사람들 정보
 */
router.get('/person/:id/detailed', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const relations = Relationship.getRelatedPersons(id);
    
    res.json({
      success: true,
      count: relations.length,
      data: relations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/relations/person/:id/type/:type
 * 특정 사람의 특정 타입 관계 조회
 */
router.get('/person/:id/type/:type', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.params;
    const relations = Relationship.getByType(id, type);
    
    res.json({
      success: true,
      count: relations.length,
      data: relations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/relations
 * 새 관계 생성
 */
router.post('/', (req, res) => {
  try {
    const { person_id, related_person_id, relationship_type } = req.body;

    if (!person_id || !related_person_id || !relationship_type) {
      return res.status(400).json({
        success: false,
        error: '모든 필드가 필요합니다. (person_id, related_person_id, relationship_type)'
      });
    }

    const relation = Relationship.create(person_id, related_person_id, relationship_type);
    res.status(201).json({
      success: true,
      message: '관계가 생성되었습니다.',
      data: relation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/relations/parent-child
 * 부모-자녀 관계 생성 (양방향)
 */
router.post('/parent-child', (req, res) => {
  try {
    const { parent_id, child_id } = req.body;

    if (!parent_id || !child_id) {
      return res.status(400).json({
        success: false,
        error: 'parent_id와 child_id가 필요합니다.'
      });
    }

    Relationship.createParentChild(parent_id, child_id);
    res.status(201).json({
      success: true,
      message: '부모-자녀 관계가 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/relations/sibling
 * 형제자매 관계 생성 (양방향)
 */
router.post('/sibling', (req, res) => {
  try {
    const { person_id_1, person_id_2 } = req.body;

    if (!person_id_1 || !person_id_2) {
      return res.status(400).json({
        success: false,
        error: 'person_id_1과 person_id_2가 필요합니다.'
      });
    }

    Relationship.createSibling(person_id_1, person_id_2);
    res.status(201).json({
      success: true,
      message: '형제자매 관계가 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/relations/spouse
 * 배우자 관계 생성 (양방향)
 */
router.post('/spouse', (req, res) => {
  try {
    const { person_id_1, person_id_2 } = req.body;

    if (!person_id_1 || !person_id_2) {
      return res.status(400).json({
        success: false,
        error: 'person_id_1과 person_id_2가 필요합니다.'
      });
    }

    Relationship.createSpouse(person_id_1, person_id_2);
    res.status(201).json({
      success: true,
      message: '배우자 관계가 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/relations/:id
 * 관계 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = Relationship.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '관계를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '관계가 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/relations/person/:id
 * 특정 사람의 모든 관계 삭제
 */
router.delete('/person/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const count = Relationship.deleteAllByPerson(id);

    res.json({
      success: true,
      message: `${count}개의 관계가 삭제되었습니다.`,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

