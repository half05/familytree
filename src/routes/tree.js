const express = require('express');
const router = express.Router();
const Person = require('../models/Person');

/**
 * GET /api/tree
 * 전체 가계도 데이터 조회
 */
router.get('/', (req, res) => {
  try {
    const familyTreeId = req.query.family_tree_id ? parseInt(req.query.family_tree_id) : null;
    const treeData = Person.getTreeData(familyTreeId);
    res.json({
      success: true,
      count: treeData.length,
      data: treeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tree/:id
 * 특정 사람을 중심으로 한 가계도 데이터
 */
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const depth = req.query.depth ? parseInt(req.query.depth) : 3;
    
    const treeData = Person.getTreeDataByRoot(id, depth);
    
    if (treeData.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사람을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      root_id: id,
      depth,
      count: treeData.length,
      data: treeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tree/generation/:gen
 * 특정 세대의 모든 사람 조회
 */
router.get('/generation/:gen', (req, res) => {
  try {
    const generation = parseInt(req.params.gen);
    const familyTreeId = req.query.family_tree_id ? parseInt(req.query.family_tree_id) : undefined;
    const persons = Person.getAll({ generation, family_tree_id: familyTreeId });
    
    res.json({
      success: true,
      generation,
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

module.exports = router;

