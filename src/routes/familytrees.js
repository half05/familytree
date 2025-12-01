const express = require('express');
const router = express.Router();
const FamilyTree = require('../models/FamilyTree');
const Person = require('../models/Person');

/**
 * GET /api/familytrees
 * 모든 가계도 조회
 */
router.get('/', (req, res) => {
  try {
    const trees = FamilyTree.getAll();
    res.json({
      success: true,
      data: trees
    });
  } catch (error) {
    console.error('가계도 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '가계도 목록을 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/familytrees/:id
 * 특정 가계도 조회
 */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tree = FamilyTree.getById(id);

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: '가계도를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('가계도 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '가계도를 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/familytrees/:id/members
 * 가계도의 모든 구성원 조회
 */
router.get('/:id/members', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const options = {
      generation: req.query.generation ? parseInt(req.query.generation) : undefined,
      is_alive: req.query.is_alive !== undefined ? req.query.is_alive === 'true' : undefined,
      gender: req.query.gender,
      search: req.query.search
    };

    const members = FamilyTree.getMembers(id, options);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('가계도 구성원 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '구성원 목록을 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/familytrees/:id/statistics
 * 가계도 통계 정보
 */
router.get('/:id/statistics', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const statistics = FamilyTree.getStatistics(id);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('가계도 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '통계를 불러오는데 실패했습니다.'
    });
  }
});

/**
 * GET /api/familytrees/:id/tree
 * 가계도 시각화 데이터
 */
router.get('/:id/tree', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const treeData = Person.getTreeData(id);

    res.json({
      success: true,
      data: treeData
    });
  } catch (error) {
    console.error('가계도 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '가계도 데이터를 불러오는데 실패했습니다.'
    });
  }
});

/**
 * POST /api/familytrees
 * 새 가계도 생성
 */
router.post('/', (req, res) => {
  try {
    const { name, description, root_person_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '가계도 이름은 필수입니다.'
      });
    }

    const tree = FamilyTree.create({ name, description, root_person_id });

    res.status(201).json({
      success: true,
      data: tree,
      message: '가계도가 생성되었습니다.'
    });
  } catch (error) {
    console.error('가계도 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '가계도 생성에 실패했습니다.'
    });
  }
});

/**
 * PUT /api/familytrees/:id
 * 가계도 정보 수정
 */
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, root_person_id } = req.body;

    const tree = FamilyTree.update(id, { name, description, root_person_id });

    if (!tree) {
      return res.status(404).json({
        success: false,
        error: '가계도를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: tree,
      message: '가계도 정보가 수정되었습니다.'
    });
  } catch (error) {
    console.error('가계도 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '가계도 수정에 실패했습니다.'
    });
  }
});

/**
 * DELETE /api/familytrees/:id
 * 가계도 삭제
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // 가계도 1번(기본 가계도)은 삭제 불가
    if (id === 1) {
      return res.status(403).json({
        success: false,
        error: '기본 가계도는 삭제할 수 없습니다.'
      });
    }

    const success = FamilyTree.delete(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '가계도를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '가계도가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('가계도 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '가계도 삭제에 실패했습니다.'
    });
  }
});

/**
 * POST /api/familytrees/:id/clone
 * 가계도 복제
 */
router.post('/:id/clone', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    const clonedTree = FamilyTree.clone(id, name);

    res.status(201).json({
      success: true,
      data: clonedTree,
      message: '가계도가 복제되었습니다.'
    });
  } catch (error) {
    console.error('가계도 복제 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '가계도 복제에 실패했습니다.'
    });
  }
});

module.exports = router;

