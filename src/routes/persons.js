const express = require('express');
const router = express.Router();
const Person = require('../models/Person');

/**
 * GET /api/persons
 * 모든 사람 목록 조회 (필터링 지원)
 */
router.get('/', (req, res) => {
  try {
    const options = {
      family_tree_id: req.query.family_tree_id ? parseInt(req.query.family_tree_id) : undefined,
      generation: req.query.generation ? parseInt(req.query.generation) : undefined,
      is_alive: req.query.is_alive !== undefined ? req.query.is_alive === 'true' : undefined,
      gender: req.query.gender,
      search: req.query.search
    };

    const persons = Person.getAll(options);
    res.json({
      success: true,
      count: persons.length,
      data: persons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/persons/stats
 * 통계 정보 조회
 */
router.get('/stats', (req, res) => {
  try {
    const familyTreeId = req.query.family_tree_id ? parseInt(req.query.family_tree_id) : null;
    const stats = Person.getStatistics(familyTreeId);
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
 * GET /api/persons/:id
 * 특정 사람 상세 조회
 */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const person = Person.getById(id);

    if (!person) {
      return res.status(404).json({
        success: false,
        error: '사람을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: person
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/persons/:id/family
 * 특정 사람의 가족 관계 조회
 */
router.get('/:id/family', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const family = Person.getFamily(id);

    if (!family) {
      return res.status(404).json({
        success: false,
        error: '사람을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: family
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/persons
 * 새 사람 생성
 */
router.post('/', (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '이름은 필수 항목입니다.'
      });
    }

    const person = Person.create(req.body);
    res.status(201).json({
      success: true,
      message: '사람이 생성되었습니다.',
      data: person
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/persons/:id
 * 사람 정보 수정
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const person = Person.getById(id);

    if (!person) {
      return res.status(404).json({
        success: false,
        error: '사람을 찾을 수 없습니다.'
      });
    }

    const updated = Person.update(id, req.body);
    res.json({
      success: true,
      message: '사람 정보가 수정되었습니다.',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/persons/:id
 * 사람 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = Person.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '사람을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '사람이 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/persons/:id/spouse
 * 배우자 관계 설정
 */
router.post('/:id/spouse', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { spouse_id } = req.body;

    if (!spouse_id) {
      return res.status(400).json({
        success: false,
        error: '배우자 ID가 필요합니다.'
      });
    }

    Person.setSpouse(id, spouse_id);
    res.json({
      success: true,
      message: '배우자 관계가 설정되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/persons/:id/spouse
 * 배우자 관계 해제
 */
router.delete('/:id/spouse', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    Person.removeSpouse(id);
    res.json({
      success: true,
      message: '배우자 관계가 해제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/persons/:id/parents
 * 부모 관계 설정
 */
router.post('/:id/parents', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { father_id, mother_id } = req.body;

    Person.setParents(id, father_id, mother_id);
    res.json({
      success: true,
      message: '부모 관계가 설정되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

