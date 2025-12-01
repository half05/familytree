// API 기본 URL
const API_BASE = '/api';

/**
 * API 호출 헬퍼 함수
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API 요청 실패');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Person API
 */
const PersonAPI = {
  // 모든 사람 조회
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/persons${queryString ? '?' + queryString : ''}`);
  },

  // 특정 사람 조회
  getById: (id) => fetchAPI(`/persons/${id}`),

  // 가족 관계 조회
  getFamily: (id) => fetchAPI(`/persons/${id}/family`),

  // 통계 조회
  getStats: (familyTreeId = null) => {
    const params = familyTreeId ? `?family_tree_id=${familyTreeId}` : '';
    return fetchAPI(`/persons/stats${params}`);
  },

  // 사람 생성
  create: (data) => fetchAPI('/persons', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 사람 수정
  update: (id, data) => fetchAPI(`/persons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // 사람 삭제
  delete: (id) => fetchAPI(`/persons/${id}`, {
    method: 'DELETE'
  }),

  // 배우자 관계 설정
  setSpouse: (id, spouseId) => fetchAPI(`/persons/${id}/spouse`, {
    method: 'POST',
    body: JSON.stringify({ spouse_id: spouseId })
  }),

  // 배우자 관계 해제
  removeSpouse: (id) => fetchAPI(`/persons/${id}/spouse`, {
    method: 'DELETE'
  }),

  // 부모 관계 설정
  setParents: (id, fatherId, motherId) => fetchAPI(`/persons/${id}/parents`, {
    method: 'POST',
    body: JSON.stringify({ father_id: fatherId, mother_id: motherId })
  })
};

/**
 * Relationship API
 */
const RelationshipAPI = {
  // 모든 관계 조회
  getAll: () => fetchAPI('/relations'),

  // 특정 사람의 관계 조회
  getByPerson: (id) => fetchAPI(`/relations/person/${id}`),

  // 상세 관계 조회
  getDetailedByPerson: (id) => fetchAPI(`/relations/person/${id}/detailed`),

  // 통계 조회
  getStats: () => fetchAPI('/relations/stats'),

  // 관계 생성
  create: (personId, relatedPersonId, type) => fetchAPI('/relations', {
    method: 'POST',
    body: JSON.stringify({
      person_id: personId,
      related_person_id: relatedPersonId,
      relationship_type: type
    })
  }),

  // 부모-자녀 관계 생성
  createParentChild: (parentId, childId) => fetchAPI('/relations/parent-child', {
    method: 'POST',
    body: JSON.stringify({ parent_id: parentId, child_id: childId })
  }),

  // 형제자매 관계 생성
  createSibling: (personId1, personId2) => fetchAPI('/relations/sibling', {
    method: 'POST',
    body: JSON.stringify({ person_id_1: personId1, person_id_2: personId2 })
  }),

  // 배우자 관계 생성
  createSpouse: (personId1, personId2) => fetchAPI('/relations/spouse', {
    method: 'POST',
    body: JSON.stringify({ person_id_1: personId1, person_id_2: personId2 })
  }),

  // 관계 삭제
  delete: (id) => fetchAPI(`/relations/${id}`, {
    method: 'DELETE'
  })
};

/**
 * FamilyTree API (가계도 관리)
 */
const FamilyTreeAPI = {
  // 모든 가계도 조회
  getAll: () => fetchAPI('/familytrees'),

  // 특정 가계도 조회
  getById: (id) => fetchAPI(`/familytrees/${id}`),

  // 가계도 구성원 조회
  getMembers: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchAPI(`/familytrees/${id}/members${queryString ? '?' + queryString : ''}`);
  },

  // 가계도 통계
  getStatistics: (id) => fetchAPI(`/familytrees/${id}/statistics`),

  // 가계도 트리 데이터
  getTree: (id) => fetchAPI(`/familytrees/${id}/tree`),

  // 가계도 생성
  create: (data) => fetchAPI('/familytrees', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 가계도 수정
  update: (id, data) => fetchAPI(`/familytrees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // 가계도 삭제
  delete: (id) => fetchAPI(`/familytrees/${id}`, {
    method: 'DELETE'
  }),

  // 가계도 복제
  clone: (id, name) => fetchAPI(`/familytrees/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify({ name })
  })
};

/**
 * Tree API (트리 시각화)
 */
const TreeAPI = {
  // 전체 가계도 조회
  getAll: (familyTreeId = null) => {
    const params = familyTreeId ? `?family_tree_id=${familyTreeId}` : '';
    return fetchAPI(`/tree${params}`);
  },

  // 특정 사람 중심 가계도 조회
  getByRoot: (id, depth = 3) => fetchAPI(`/tree/${id}?depth=${depth}`),

  // 세대별 조회
  getByGeneration: (gen, familyTreeId = null) => {
    const params = familyTreeId ? `?family_tree_id=${familyTreeId}` : '';
    return fetchAPI(`/tree/generation/${gen}${params}`);
  }
};

/**
 * Upload API
 */
const UploadAPI = {
  // 파일 업로드
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '파일 업로드 실패');
    }

    return data;
  },

  // 파일 목록
  getList: () => fetchAPI('/upload/list'),

  // 파일 삭제
  delete: (filename) => fetchAPI(`/upload/${filename}`, {
    method: 'DELETE'
  })
};

