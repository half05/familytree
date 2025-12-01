// 전역 변수
let allPersons = [];
let allFamilyTrees = [];
let currentFamilyTreeId = null;
let currentPage = 'dashboard';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

/**
 * 앱 초기화
 */
async function initApp() {
  try {
    // 가계도 목록 로드
    await loadFamilyTrees();
    
    // 데이터 로드
    await loadPersons();
    
    // 대시보드 렌더링
    renderDashboard();
    
    // 네비게이션 설정
    showPage('dashboard');
  } catch (error) {
    console.error('초기화 오류:', error);
    alert('데이터를 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  // 네비게이션 버튼
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });

  // 검색
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // 필터
  const filterAlive = document.getElementById('filter-alive');
  const filterGender = document.getElementById('filter-gender');
  const filterGeneration = document.getElementById('filter-generation');

  if (filterAlive) filterAlive.addEventListener('change', handleFilter);
  if (filterGender) filterGender.addEventListener('change', handleFilter);
  if (filterGeneration) filterGeneration.addEventListener('change', handleFilter);

  // 폼 제출
  const addForm = document.getElementById('add-person-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddPerson);
  }

  // 사진 미리보기
  const photoInput = document.getElementById('photo');
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoPreview);
  }

  // 트리 루트 선택
  const treeRootSelect = document.getElementById('tree-root-select');
  if (treeRootSelect) {
    treeRootSelect.addEventListener('change', handleTreeRootChange);
  }

  // 트리 간소화 모드
  const compactMode = document.getElementById('tree-compact-mode');
  if (compactMode) {
    compactMode.addEventListener('change', () => {
      const wrapper = document.getElementById('tree-wrapper');
      if (compactMode.checked) {
        wrapper.classList.add('compact');
      } else {
        wrapper.classList.remove('compact');
      }
    });
  }

  // 모달 닫기
  const modal = document.getElementById('person-modal');
  const closeBtn = modal?.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  // 가계도 선택
  const familyTreeSelect = document.getElementById('family-tree-select');
  if (familyTreeSelect) {
    familyTreeSelect.addEventListener('change', handleFamilyTreeChange);
  }

  // 가계도 관리 버튼
  const manageTreesBtn = document.getElementById('manage-trees-btn');
  if (manageTreesBtn) {
    manageTreesBtn.addEventListener('click', () => showPage('manage-trees'));
  }

  // 새 가계도 생성 버튼
  const createTreeBtn = document.getElementById('create-tree-btn');
  if (createTreeBtn) {
    createTreeBtn.addEventListener('click', showCreateTreeForm);
  }

  // 가계도 생성 폼
  const createTreeForm = document.getElementById('create-tree-form');
  if (createTreeForm) {
    createTreeForm.addEventListener('submit', handleCreateTree);
  }

  // 가계도 생성 취소
  const cancelCreateTreeBtn = document.getElementById('cancel-create-tree');
  if (cancelCreateTreeBtn) {
    cancelCreateTreeBtn.addEventListener('click', hideCreateTreeForm);
  }

  // 모달 외부 클릭 시 닫기
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}

/**
 * 페이지 전환
 */
function showPage(pageName) {
  // 모든 페이지 숨기기
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // 선택된 페이지 표시
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // 네비게이션 버튼 활성화
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === pageName) {
      btn.classList.add('active');
    }
  });

  currentPage = pageName;

  // 페이지별 렌더링
  switch (pageName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'persons':
      renderPersonsList();
      break;
    case 'tree':
      renderTree();
      break;
    case 'add':
      setupAddForm();
      break;
    case 'manage-trees':
      renderManageTreesPage();
      break;
  }
}

/**
 * 사람 데이터 로드
 */
async function loadPersons() {
  try {
    const params = currentFamilyTreeId ? { family_tree_id: currentFamilyTreeId } : {};
    const response = await PersonAPI.getAll(params);
    allPersons = response.data || [];
    return allPersons;
  } catch (error) {
    console.error('사람 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * 대시보드 렌더링
 */
async function renderDashboard() {
  try {
    // 통계 로드
    const stats = await PersonAPI.getStats(currentFamilyTreeId);
    
    // 통계 표시
    document.getElementById('stat-total').textContent = stats.data.total;
    document.getElementById('stat-alive').textContent = stats.data.alive;
    document.getElementById('stat-male').textContent = stats.data.male;
    document.getElementById('stat-female').textContent = stats.data.female;
    document.getElementById('stat-generations').textContent = stats.data.generations;

    // 최근 추가된 사람들 (최신 5명)
    const recentPersons = allPersons.slice(0, 5);
    const recentContainer = document.getElementById('recent-persons');
    
    if (recentPersons.length === 0) {
      recentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
          <p>아직 등록된 가족 구성원이 없습니다.</p>
          <p>새 가족 추가 메뉴에서 가족을 등록해보세요!</p>
        </div>
      `;
    } else {
      recentContainer.innerHTML = recentPersons.map(person => createPersonCard(person)).join('');
    }
  } catch (error) {
    console.error('대시보드 렌더링 오류:', error);
  }
}

/**
 * 사람 목록 렌더링
 */
function renderPersonsList(persons = null) {
  const listContainer = document.getElementById('persons-list');
  const personsToShow = persons || allPersons;

  if (personsToShow.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>검색 결과가 없습니다.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = personsToShow.map(person => createPersonCard(person)).join('');

  // 세대 필터 업데이트
  updateGenerationFilter();
}

/**
 * 사람 카드 생성
 */
function createPersonCard(person) {
  const photoUrl = person.photo || getDefaultAvatar(person.gender);
  const birthYear = person.birth_date ? new Date(person.birth_date).getFullYear() : '?';
  const age = person.birth_date ? calculateAge(person.birth_date) : '';
  const genderIcon = person.gender === 'male' ? '👨' : person.gender === 'female' ? '👩' : '👤';
  
  return `
    <div class="person-card" onclick="showPersonDetail(${person.id})">
      <img src="${photoUrl}" alt="${person.name}" class="person-photo" onerror="handleImageError(this, '${person.gender || ''}')">
      <div class="person-name">${genderIcon} ${person.name}</div>
      <div class="person-info">📅 ${birthYear}년생 ${age ? `(${age}세)` : ''}</div>
      ${person.phone_number ? `<div class="person-info">📞 ${person.phone_number}</div>` : ''}
      ${person.occupation ? `<div class="person-info">💼 ${person.occupation}</div>` : ''}
      <div>
        <span class="person-badge badge-generation">${person.generation}세대</span>
        <span class="person-badge ${person.is_alive ? 'badge-alive' : 'badge-deceased'}">
          ${person.is_alive ? '생존' : '고인'}
        </span>
      </div>
    </div>
  `;
}

/**
 * 사람 상세 정보 표시
 */
async function showPersonDetail(id) {
  try {
    const response = await PersonAPI.getFamily(id);
    const family = response.data;
    const person = family.person;

    const modal = document.getElementById('person-modal');
    const detailContainer = document.getElementById('person-detail');

    const photoUrl = person.photo || getDefaultAvatar(person.gender);
    const age = person.birth_date ? calculateAge(person.birth_date) : '';

    let html = `
      <h2>${person.name}</h2>
      <img src="${photoUrl}" alt="${person.name}" style="max-width: 200px; border-radius: 8px; margin: 15px 0;" onerror="handleImageError(this, '${person.gender || ''}')">
      
      <div style="margin: 20px 0;">
        <h3>기본 정보</h3>
        <p><strong>성별:</strong> ${person.gender === 'male' ? '남성' : person.gender === 'female' ? '여성' : '미지정'}</p>
        ${person.birth_date ? `<p><strong>생년월일:</strong> ${person.birth_date} ${age ? `(${age}세)` : ''}</p>` : ''}
        ${person.death_date ? `<p><strong>사망일:</strong> ${person.death_date}</p>` : ''}
        ${person.phone_number ? `<p><strong>전화번호:</strong> ${person.phone_number}</p>` : ''}
        ${person.email ? `<p><strong>이메일:</strong> ${person.email}</p>` : ''}
        ${person.address ? `<p><strong>주소:</strong> ${person.address}</p>` : ''}
        ${person.occupation ? `<p><strong>직업:</strong> ${person.occupation}</p>` : ''}
        <p><strong>세대:</strong> ${person.generation}세대</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>가족 관계</h3>
    `;

    if (family.father) {
      html += `<p><strong>아버지:</strong> ${family.father.name}</p>`;
    }
    if (family.mother) {
      html += `<p><strong>어머니:</strong> ${family.mother.name}</p>`;
    }
    if (family.spouse) {
      html += `<p><strong>배우자:</strong> ${family.spouse.name}</p>`;
    }
    if (family.children.length > 0) {
      html += `<p><strong>자녀:</strong> ${family.children.map(c => c.name).join(', ')}</p>`;
    }
    if (family.siblings.length > 0) {
      html += `<p><strong>형제자매:</strong> ${family.siblings.map(s => s.name).join(', ')}</p>`;
    }

    html += `</div>`;

    if (person.notes) {
      html += `
        <div style="margin: 20px 0;">
          <h3>메모</h3>
          <p>${person.notes}</p>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 30px; display: flex; gap: 10px;">
        <button class="btn btn-secondary" onclick="editPerson(${person.id})">수정</button>
        <button class="btn btn-danger" onclick="deletePerson(${person.id})">삭제</button>
      </div>
    `;

    detailContainer.innerHTML = html;
    modal.classList.add('active');
  } catch (error) {
    console.error('상세 정보 로드 오류:', error);
    alert('정보를 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 검색 처리
 */
function handleSearch(e) {
  const keyword = e.target.value.toLowerCase();
  
  if (!keyword) {
    renderPersonsList();
    return;
  }

  const filtered = allPersons.filter(person => 
    person.name.toLowerCase().includes(keyword) ||
    (person.phone_number && person.phone_number.includes(keyword)) ||
    (person.email && person.email.toLowerCase().includes(keyword))
  );

  renderPersonsList(filtered);
}

/**
 * 필터 처리
 */
function handleFilter() {
  const isAlive = document.getElementById('filter-alive').checked;
  const gender = document.getElementById('filter-gender').value;
  const generation = document.getElementById('filter-generation').value;

  let filtered = allPersons;

  if (isAlive) {
    filtered = filtered.filter(p => p.is_alive);
  }

  if (gender) {
    filtered = filtered.filter(p => p.gender === gender);
  }

  if (generation) {
    filtered = filtered.filter(p => p.generation === parseInt(generation));
  }

  renderPersonsList(filtered);
}

/**
 * 세대 필터 업데이트
 */
function updateGenerationFilter() {
  const select = document.getElementById('filter-generation');
  if (!select) return;

  const generations = [...new Set(allPersons.map(p => p.generation))].sort();
  
  const currentValue = select.value;
  select.innerHTML = '<option value="">모든 세대</option>';
  
  generations.forEach(gen => {
    const option = document.createElement('option');
    option.value = gen;
    option.textContent = `${gen}세대`;
    select.appendChild(option);
  });

  select.value = currentValue;
}

/**
 * 가계도 렌더링 (트리 구조)
 */
async function renderTree() {
  try {
    const response = await TreeAPI.getAll(currentFamilyTreeId);
    const treeData = response.data;

    // 루트 선택 옵션 업데이트
    const rootSelect = document.getElementById('tree-root-select');
    rootSelect.innerHTML = '<option value="">전체 보기</option>';
    
    treeData.forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = `${person.name} (${person.generation}세대)`;
      rootSelect.appendChild(option);
    });

    const container = document.getElementById('tree-container');
    
    if (treeData.length === 0) {
      container.innerHTML = `
        <div class="tree-empty">
          <div class="tree-empty-icon">🌳</div>
          <p>표시할 가계도가 없습니다.</p>
        </div>
      `;
      return;
    }

    // 전체 가계도 빌드
    const tree = buildFamilyTree(treeData);
    container.innerHTML = tree;
  } catch (error) {
    console.error('가계도 렌더링 오류:', error);
  }
}

/**
 * 전체 가계도 빌드 (계층적 구조)
 */
function buildFamilyTree(allPeople) {
  const rendered = new Set();
  let html = '<div class="family-tree">';
  
  // 1세대(최상위 조상)부터 시작
  const rootGeneration = Math.min(...allPeople.map(p => p.generation));
  const roots = allPeople.filter(p => p.generation === rootGeneration);
  
  // 최상위 세대 렌더링
  html += renderGenerationLevel(rootGeneration, roots, allPeople, rendered);
  
  html += '</div>';
  return html;
}

/**
 * 세대 레벨 렌더링 (재귀적으로 자녀 세대 포함)
 */
function renderGenerationLevel(generation, people, allPeople, rendered) {
  if (people.length === 0) return '';
  
  let html = `<div class="generation-level">`;
  html += `<div class="generation-title">${generation}세대</div>`;
  html += '<div class="family-units">';
  
  // 부부 단위로 그룹화
  const couples = groupCouples(people, allPeople, rendered);
  
  couples.forEach(couple => {
    html += renderCoupleAndChildren(couple, allPeople, rendered);
  });
  
  html += '</div></div>';
  
  return html;
}

/**
 * 부부를 그룹화 (배우자가 다른 세대여도 함께)
 */
function groupCouples(people, allPeople, rendered) {
  const couples = [];
  const processed = new Set();
  
  people.forEach(person => {
    if (processed.has(person.id) || rendered.has(person.id)) return;
    
    const couple = {
      husband: null,
      wife: null
    };
    
    // 성별에 따라 배치
    if (person.gender === 'male') {
      couple.husband = person;
      if (person.spouse_id) {
        const spouse = allPeople.find(p => p.id === person.spouse_id);
        if (spouse) {
          couple.wife = spouse;
          processed.add(spouse.id);
        }
      }
    } else {
      couple.wife = person;
      if (person.spouse_id) {
        const spouse = allPeople.find(p => p.id === person.spouse_id);
        if (spouse) {
          couple.husband = spouse;
          processed.add(spouse.id);
        }
      }
    }
    
    processed.add(person.id);
    couples.push(couple);
  });
  
  return couples;
}

/**
 * 부부와 그 자녀들을 렌더링
 */
function renderCoupleAndChildren(couple, allPeople, rendered) {
  const { husband, wife } = couple;
  
  let html = '<div class="family-unit">';
  
  // 자녀 찾기 (먼저 확인)
  const parentIds = [husband?.id, wife?.id].filter(id => id);
  const children = allPeople.filter(p => 
    parentIds.includes(p.father_id) || parentIds.includes(p.mother_id)
  );
  const hasChildren = children.length > 0;
  
  // 부부 렌더링 (자녀 유무에 따라 클래스 추가)
  html += `<div class="couple ${hasChildren ? 'has-children' : 'no-children'}">`;
  
  if (husband && !rendered.has(husband.id)) {
    html += createPersonNodeHTML(husband);
    rendered.add(husband.id);
  }
  
  if (wife && !rendered.has(wife.id)) {
    html += createPersonNodeHTML(wife);
    rendered.add(wife.id);
  }
  
  html += '</div>';
  
  // 자녀 렌더링
  if (hasChildren) {
    // 자녀들의 세대
    const childGeneration = children[0].generation;
    
    const multipleClass = children.length > 1 ? 'multiple' : '';
    html += `<div class="children-container ${multipleClass}">`;
    
    // 각 자녀와 그 배우자, 손자들을 재귀적으로 렌더링
    children.forEach(child => {
      if (!rendered.has(child.id)) {
        html += '<div class="child-wrapper">';
        
        // 자녀 부부와 그 자녀들
        const childCouple = {
          husband: child.gender === 'male' ? child : null,
          wife: child.gender === 'female' ? child : null
        };
        
        // 배우자 추가
        if (child.spouse_id) {
          const spouse = allPeople.find(p => p.id === child.spouse_id);
          if (spouse) {
            if (child.gender === 'male') {
              childCouple.wife = spouse;
            } else {
              childCouple.husband = spouse;
            }
          }
        }
        
        html += renderCoupleAndChildren(childCouple, allPeople, rendered);
        html += '</div>';
      }
    });
    
    html += '</div>';
  }
  
  html += '</div>';
  
  return html;
}

/**
 * 트리 루트 변경 처리
 */
async function handleTreeRootChange(e) {
  const rootId = e.target.value;
  
  if (!rootId) {
    renderTree();
    return;
  }

  try {
    const response = await TreeAPI.getByRoot(rootId, 4);
    const treeData = response.data;
    
    const container = document.getElementById('tree-container');
    
    if (treeData.length === 0) {
      container.innerHTML = `
        <div class="tree-empty">
          <div class="tree-empty-icon">🌳</div>
          <p>표시할 가계도가 없습니다.</p>
        </div>
      `;
      return;
    }

    // 전체 가계도 빌드 (루트 강조)
    const tree = buildFamilyTreeWithRoot(treeData, parseInt(rootId));
    container.innerHTML = tree;
  } catch (error) {
    console.error('가계도 로드 오류:', error);
  }
}

/**
 * 루트 강조 가계도 빌드
 */
function buildFamilyTreeWithRoot(allPeople, rootId) {
  const rendered = new Set();
  let html = '<div class="family-tree">';
  
  // 루트 사람 찾기
  const rootPerson = allPeople.find(p => p.id === rootId);
  if (!rootPerson) return '<div class="tree-empty">사람을 찾을 수 없습니다.</div>';
  
  // 가장 높은 조상부터 시작
  const minGeneration = Math.min(...allPeople.map(p => p.generation));
  const roots = allPeople.filter(p => p.generation === minGeneration);
  
  html += renderGenerationLevelWithRoot(minGeneration, roots, allPeople, rendered, rootId);
  
  html += '</div>';
  return html;
}

/**
 * 세대 레벨 렌더링 (루트 강조, 재귀적)
 */
function renderGenerationLevelWithRoot(generation, people, allPeople, rendered, rootId) {
  if (people.length === 0) return '';
  
  let html = `<div class="generation-level">`;
  html += `<div class="generation-title">${generation}세대</div>`;
  html += '<div class="family-units">';
  
  const couples = groupCouples(people, allPeople, rendered);
  
  couples.forEach(couple => {
    html += renderCoupleAndChildrenWithRoot(couple, allPeople, rendered, rootId);
  });
  
  html += '</div></div>';
  
  return html;
}

/**
 * 부부와 자녀 렌더링 (루트 강조)
 */
function renderCoupleAndChildrenWithRoot(couple, allPeople, rendered, rootId) {
  const { husband, wife } = couple;
  
  let html = '<div class="family-unit">';
  
  // 자녀 찾기 (먼저 확인)
  const parentIds = [husband?.id, wife?.id].filter(id => id);
  const children = allPeople.filter(p => 
    parentIds.includes(p.father_id) || parentIds.includes(p.mother_id)
  );
  const hasChildren = children.length > 0;
  
  // 부부 렌더링 (자녀 유무에 따라 클래스 추가)
  html += `<div class="couple ${hasChildren ? 'has-children' : 'no-children'}">`;
  
  if (husband && !rendered.has(husband.id)) {
    html += createPersonNodeHTML(husband, rootId);
    rendered.add(husband.id);
  }
  
  if (wife && !rendered.has(wife.id)) {
    html += createPersonNodeHTML(wife, rootId);
    rendered.add(wife.id);
  }
  
  html += '</div>';
  
  // 자녀 렌더링
  if (hasChildren) {
    const multipleClass = children.length > 1 ? 'multiple' : '';
    html += `<div class="children-container ${multipleClass}">`;
    
    children.forEach(child => {
      if (!rendered.has(child.id)) {
        html += '<div class="child-wrapper">';
        
        const childCouple = {
          husband: child.gender === 'male' ? child : null,
          wife: child.gender === 'female' ? child : null
        };
        
        if (child.spouse_id) {
          const spouse = allPeople.find(p => p.id === child.spouse_id);
          if (spouse) {
            if (child.gender === 'male') {
              childCouple.wife = spouse;
            } else {
              childCouple.husband = spouse;
            }
          }
        }
        
        html += renderCoupleAndChildrenWithRoot(childCouple, allPeople, rendered, rootId);
        html += '</div>';
      }
    });
    
    html += '</div>';
  }
  
  html += '</div>';
  
  return html;
}

/**
 * 부부 HTML 생성 (루트 강조 버전)
 */
function createCoupleHTML(couple, allPeople, rootId = null) {
  const { person1, person2 } = couple;
  
  let html = '<div class="family-group">';
  html += '<div class="couple">';
  
  // 첫 번째 사람
  html += createPersonNodeHTML(person1, rootId);
  
  // 두 번째 사람 (배우자)
  if (person2) {
    html += createPersonNodeHTML(person2, rootId);
  }
  
  html += '</div>';
  
  // 자녀가 있는 경우
  const children = allPeople.filter(p => 
    p.father_id === person1.id || p.mother_id === person1.id ||
    (person2 && (p.father_id === person2.id || p.mother_id === person2.id))
  );
  
  if (children.length > 0) {
    const multipleClass = children.length > 1 ? 'multiple' : '';
    html += `<div class="children-container ${multipleClass}">`;
    
    children.forEach(child => {
      html += '<div class="child-wrapper">';
      html += createPersonNodeHTML(child, rootId);
      html += '</div>';
    });
    
    html += '</div>';
  }
  
  html += '</div>';
  
  return html;
}

/**
 * 개인 노드 HTML 생성 (루트 강조 버전)
 */
function createPersonNodeHTML(person, rootId = null) {
  const photoUrl = person.photo || getDefaultAvatar(person.gender);
  const birthYear = person.birth_date ? new Date(person.birth_date).getFullYear() : '?';
  const genderClass = person.gender || '';
  const deceasedClass = person.is_alive ? '' : 'deceased';
  const rootClass = rootId && person.id === rootId ? 'root' : '';
  const statusText = person.is_alive ? '' : '(고인)';
  
  return `
    <div class="tree-person ${genderClass} ${deceasedClass} ${rootClass}" onclick="showPersonDetail(${person.id})">
      <img src="${photoUrl}" alt="${person.name}" class="tree-person-photo" onerror="handleImageError(this, '${person.gender || ''}')">
      <div class="tree-person-name">${person.name}</div>
      <div class="tree-person-birth">${birthYear}년생</div>
      ${statusText ? `<div class="tree-person-status">${statusText}</div>` : ''}
    </div>
  `;
}

/**
 * 가계도 줌 기능
 */
let currentZoom = 1;

function zoomTree(factor) {
  const wrapper = document.getElementById('tree-wrapper');
  if (!wrapper) return;
  
  if (factor === 1) {
    // 리셋
    currentZoom = 1;
  } else {
    // 상대적 줌
    currentZoom *= factor;
    currentZoom = Math.max(0.5, Math.min(2, currentZoom)); // 0.5x ~ 2x 제한
  }
  
  const tree = wrapper.querySelector('.family-tree');
  if (tree) {
    tree.style.transform = `scale(${currentZoom})`;
    tree.style.transformOrigin = 'top center';
  }
}

/**
 * 추가 폼 설정
 */
function setupAddForm() {
  // 부모/배우자 선택 옵션 업데이트
  const fatherSelect = document.getElementById('father_id');
  const motherSelect = document.getElementById('mother_id');
  const spouseSelect = document.getElementById('spouse_id');

  [fatherSelect, motherSelect, spouseSelect].forEach(select => {
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">선택</option>';
    
    allPersons.forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = `${person.name} (${person.generation}세대)`;
      select.appendChild(option);
    });
    
    select.value = currentValue;
  });
}

/**
 * 사람 추가 처리
 */
async function handleAddPerson(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    family_tree_id: currentFamilyTreeId // 현재 선택된 가계도에 추가
  };

  // 폼 데이터 수집
  for (let [key, value] of formData.entries()) {
    if (key === 'photo') continue; // 파일은 별도 처리
    if (value) {
      data[key] = value;
    }
  }

  // 숫자 변환
  ['father_id', 'mother_id', 'spouse_id'].forEach(field => {
    if (data[field]) {
      data[field] = parseInt(data[field]);
    }
  });

  try {
    // 사진 업로드 (있는 경우)
    const photoInput = document.getElementById('photo');
    if (photoInput.files.length > 0) {
      const uploadResponse = await UploadAPI.uploadFile(photoInput.files[0]);
      data.photo = uploadResponse.data.path;
    }

    // 사람 생성
    await PersonAPI.create(data);
    
    // 데이터 새로고침
    await loadPersons();
    
    // 폼 초기화
    e.target.reset();
    document.getElementById('photo-preview').innerHTML = '';
    
    alert('가족 구성원이 추가되었습니다!');
    
    // 대시보드로 이동
    showPage('dashboard');
  } catch (error) {
    console.error('추가 오류:', error);
    alert('추가 중 오류가 발생했습니다: ' + error.message);
  }
}

/**
 * 사진 미리보기
 */
function handlePhotoPreview(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('photo-preview');

  if (!file) {
    preview.innerHTML = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = `<img src="${e.target.result}" alt="미리보기">`;
  };
  reader.readAsDataURL(file);
}

/**
 * 사람 삭제
 */
async function deletePerson(id) {
  if (!confirm('정말 삭제하시겠습니까?')) {
    return;
  }

  try {
    await PersonAPI.delete(id);
    await loadPersons();
    
    // 모달 닫기
    document.getElementById('person-modal').classList.remove('active');
    
    alert('삭제되었습니다.');
    
    // 현재 페이지 새로고침
    if (currentPage === 'dashboard') {
      renderDashboard();
    } else if (currentPage === 'persons') {
      renderPersonsList();
    }
  } catch (error) {
    console.error('삭제 오류:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

/**
 * 유틸리티 함수들
 */

// 기본 아바타 이미지 (SVG Data URI)
function getDefaultAvatar(gender) {
  const color = gender === 'male' ? '#4299e1' : gender === 'female' ? '#ed64a6' : '#a0aec0';
  const icon = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '👤';
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="50%" y="50%" font-size="80" text-anchor="middle" dy=".3em">${icon}</text>
    </svg>
  `)}`;
}

// 이미지 로드 에러 처리 (무한 루프 방지)
function handleImageError(img, gender) {
  // 이미 에러 처리된 경우 무시
  if (img.dataset.errorHandled) return;
  
  img.dataset.errorHandled = 'true';
  img.src = getDefaultAvatar(gender);
}

// 나이 계산
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// 디바운스
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 가계도 관련 함수들
 */

// 가계도 목록 로드
async function loadFamilyTrees() {
  try {
    const response = await FamilyTreeAPI.getAll();
    allFamilyTrees = response.data;
    
    // 기본 가계도 선택 (첫 번째)
    if (allFamilyTrees.length > 0 && !currentFamilyTreeId) {
      currentFamilyTreeId = allFamilyTrees[0].id;
    }
    
    // 가계도 선택 드롭다운 렌더링
    renderFamilyTreeSelector();
  } catch (error) {
    console.error('가계도 목록 로드 오류:', error);
  }
}

// 가계도 선택 드롭다운 렌더링
function renderFamilyTreeSelector() {
  const select = document.getElementById('family-tree-select');
  if (!select) return;

  select.innerHTML = allFamilyTrees.map(tree => `
    <option value="${tree.id}" ${tree.id === currentFamilyTreeId ? 'selected' : ''}>
      ${tree.name} (${tree.member_count || 0}명)
    </option>
  `).join('');
}

// 가계도 변경 핸들러
async function handleFamilyTreeChange(e) {
  currentFamilyTreeId = parseInt(e.target.value);
  
  // 데이터 새로고침
  await loadPersons();
  
  // 현재 페이지 새로고침
  if (currentPage === 'dashboard') {
    renderDashboard();
  } else if (currentPage === 'persons') {
    renderPersonsList();
  } else if (currentPage === 'tree') {
    renderTree();
  }
}

// 가계도 관리 페이지 렌더링
async function renderManageTreesPage() {
  const container = document.getElementById('family-trees-list');
  if (!container) return;

  if (allFamilyTrees.length === 0) {
    container.innerHTML = '<p class="empty-message">등록된 가계도가 없습니다.</p>';
    return;
  }

  container.innerHTML = allFamilyTrees.map(tree => `
    <div class="family-tree-card">
      <div class="tree-card-header">
        <h3>${tree.name}</h3>
        ${tree.id === 1 ? '<span class="badge badge-primary">기본</span>' : ''}
      </div>
      <p class="tree-description">${tree.description || '설명 없음'}</p>
      <div class="tree-stats">
        <div class="tree-stat">
          <span class="tree-stat-label">구성원:</span>
          <span class="tree-stat-value">${tree.member_count || 0}명</span>
        </div>
        <div class="tree-stat">
          <span class="tree-stat-label">루트:</span>
          <span class="tree-stat-value">${tree.root_person_name || '미설정'}</span>
        </div>
      </div>
      <div class="tree-card-actions">
        <button onclick="selectFamilyTree(${tree.id})" class="btn btn-sm btn-primary">선택</button>
        <button onclick="viewFamilyTreeStats(${tree.id})" class="btn btn-sm btn-secondary">통계</button>
        <button onclick="cloneFamilyTree(${tree.id})" class="btn btn-sm btn-secondary">복제</button>
        ${tree.id !== 1 ? `<button onclick="deleteFamilyTree(${tree.id})" class="btn btn-sm btn-danger">삭제</button>` : ''}
      </div>
    </div>
  `).join('');
}

// 가계도 선택
function selectFamilyTree(id) {
  currentFamilyTreeId = id;
  document.getElementById('family-tree-select').value = id;
  showPage('dashboard');
  loadPersons();
  renderDashboard();
}

// 가계도 통계 보기
async function viewFamilyTreeStats(id) {
  try {
    const response = await FamilyTreeAPI.getStatistics(id);
    const stats = response.data;
    
    alert(`
가계도 통계

총 구성원: ${stats.total}명
생존: ${stats.alive}명
사망: ${stats.deceased}명
남성: ${stats.male}명
여성: ${stats.female}명
세대: ${stats.generations}세대
    `.trim());
  } catch (error) {
    console.error('통계 조회 오류:', error);
    alert('통계를 불러오는 중 오류가 발생했습니다.');
  }
}

// 가계도 복제
async function cloneFamilyTree(id) {
  const newName = prompt('새 가계도 이름을 입력하세요:');
  if (!newName) return;

  try {
    await FamilyTreeAPI.clone(id, newName);
    await loadFamilyTrees();
    renderManageTreesPage();
    alert('가계도가 복제되었습니다!');
  } catch (error) {
    console.error('복제 오류:', error);
    alert('복제 중 오류가 발생했습니다.');
  }
}

// 가계도 삭제
async function deleteFamilyTree(id) {
  if (id === 1) {
    alert('기본 가계도는 삭제할 수 없습니다.');
    return;
  }

  if (!confirm('이 가계도와 모든 구성원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
    return;
  }

  try {
    await FamilyTreeAPI.delete(id);
    
    // 현재 선택된 가계도가 삭제된 경우 기본 가계도로 변경
    if (currentFamilyTreeId === id) {
      currentFamilyTreeId = 1;
    }
    
    await loadFamilyTrees();
    renderManageTreesPage();
    alert('가계도가 삭제되었습니다.');
  } catch (error) {
    console.error('삭제 오류:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// 가계도 생성 폼 표시
function showCreateTreeForm() {
  document.getElementById('create-tree-form-container').style.display = 'block';
  document.getElementById('create-tree-btn').style.display = 'none';
}

// 가계도 생성 폼 숨기기
function hideCreateTreeForm() {
  document.getElementById('create-tree-form-container').style.display = 'none';
  document.getElementById('create-tree-btn').style.display = 'block';
  document.getElementById('create-tree-form').reset();
}

// 가계도 생성 핸들러
async function handleCreateTree(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    description: formData.get('description')
  };

  try {
    await FamilyTreeAPI.create(data);
    await loadFamilyTrees();
    hideCreateTreeForm();
    renderManageTreesPage();
    alert('새 가계도가 생성되었습니다!');
  } catch (error) {
    console.error('생성 오류:', error);
    alert('생성 중 오류가 발생했습니다: ' + error.message);
  }
}

