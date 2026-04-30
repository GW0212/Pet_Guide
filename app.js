(() => {
  'use strict';

  const DATA = window.PET_DATA;
  const TABS = ['breeds', 'likes', 'dislikes', 'food', 'care', 'checklist', 'match', 'quiz', 'behavior'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let currentPet = 'dog';
  let currentTab = 'breeds';
  let breedQuery = '';
  let openedBreedKey = '';
  let isComposing = false;
  let foodQuery = '';
  const quizState = { dog: null, cat: null };
  const compareState = { dog: ['', '', ''], cat: ['', '', ''] };
  const matchAnswers = { dog: {}, cat: {} };
  const expandedBreedGroups = { dog: new Set(), cat: new Set() };

  const app = $('#app');

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[char]));
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/\s+/g, '');
  }

  function getBreedName(breed) {
    return typeof breed === 'string' ? breed : breed.name;
  }

  function getBreedKey(groupIndex, breedIndex) {
    return currentPet + '-' + groupIndex + '-' + breedIndex;
  }


  function getAllBreedItems(petKey = currentPet) {
    const pet = DATA[petKey];
    const items = [];
    pet.groups.forEach((group, groupIndex) => {
      group.breeds.forEach((breed, breedIndex) => {
        const name = getBreedName(breed);
        items.push({
          key: petKey + '-' + groupIndex + '-' + breedIndex,
          petKey,
          groupIndex,
          breedIndex,
          groupName: group.name,
          groupDesc: group.desc,
          breed,
          name
        });
      });
    });
    return items.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  }

  function findBreedItemByKey(key, petKey = currentPet) {
    return getAllBreedItems(petKey).find((item) => item.key === key) || null;
  }

  function getBreedOneLineSummary(groupName, name) {
    if (currentPet === 'dog') {
      if (/토이|반려/.test(groupName)) return name + '은(는) 실내 적응력은 좋지만 치아·관절·분리불안 관리가 핵심인 소형 반려견 유형입니다.';
      if (/조렵|회수|스포츠/.test(groupName)) return name + '은(는) 활동량과 탐색 욕구가 높아 산책·놀이·훈련 루틴이 반드시 필요한 활동형 견종입니다.';
      if (/목양|허딩/.test(groupName)) return name + '은(는) 지능과 반응성이 높아 규칙적인 과제와 일관된 훈련이 잘 맞는 견종입니다.';
      if (/하운드|수렵/.test(groupName)) return name + '은(는) 냄새나 움직임을 쫓는 본능이 강해 리드줄 관리와 회상 훈련이 중요합니다.';
      if (/테리어/.test(groupName)) return name + '은(는) 활발하고 집요한 편이라 충분한 에너지 발산과 씹기 욕구 관리가 필요합니다.';
      if (/워킹|사역|작업/.test(groupName)) return name + '은(는) 체격과 힘이 있는 경우가 많아 공간, 운동, 핸들링 준비가 중요합니다.';
      return name + '은(는) 외형보다 실제 활동량, 건강 상태, 생활 환경을 기준으로 돌봄 계획을 세워야 하는 품종입니다.';
    }
    if (/장모|메인쿤|페르시안|랙돌|노르웨이|히말라얀|라가머핀/.test(groupName + name)) return name + '은(는) 털 관리와 헤어볼, 체중 관리를 함께 봐야 하는 장모·대형묘 성향의 품종입니다.';
    if (/뱅갈|아비시니안|사바나|토이거|오시캣/.test(name)) return name + '은(는) 활동량과 탐색 욕구가 높아 수직 공간과 사냥놀이가 중요한 고양이입니다.';
    if (/스코티시|먼치킨|킬트/.test(name)) return name + '은(는) 귀·다리·관절 관련 특징을 세심하게 확인해야 하는 품종입니다.';
    if (/스핑크스|피터볼드|돈스코이|밤비노/.test(name)) return name + '은(는) 피모가 적어 피부 유분, 체온 유지, 햇빛 노출 관리가 중요한 품종입니다.';
    return name + '은(는) 품종 경향보다 실제 성격, 놀이 반응, 화장실 습관, 건강 상태를 함께 확인해야 합니다.';
  }

  function cardsMarkup(section) {
    return '<div class="info-grid">' + section.cards.map((card) => (
      '<article class="info-card">' +
        '<div class="card-head">' +
          '<div class="card-icon">' + escapeHTML(card.icon) + '</div>' +
          '<div>' +
            '<div class="card-title">' + escapeHTML(card.title) + '</div>' +
            '<div class="card-subtitle">' + escapeHTML(card.subtitle || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="item-list">' + card.items.map((item) => (
          '<div class="list-item"><span class="dot">•</span><div><strong>' + escapeHTML(item[0]) + '</strong><span class="txt">' + escapeHTML(item[1]) + '</span></div></div>'
        )).join('') + '</div>' +
      '</article>'
    )).join('') + '</div>';
  }

  function sourceNotice() {
    return '<div class="notice"><strong>실전 기준:</strong> 정보는 학습용 기본값입니다. 통증, 식욕 저하, 반복 구토, 호흡 이상, 배뇨 문제, 갑작스러운 공격성처럼 평소와 다른 변화가 보이면 인터넷 정보보다 진료가 우선입니다.</div>';
  }

  function uniqCount(groups) {
    const set = new Set();
    groups.forEach((group) => group.breeds.forEach((breed) => set.add(normalizeText(getBreedName(breed)))));
    return set.size;
  }

  function updateStickyMetrics() {
    const header = $('header');
    const sectionNav = $('.section-nav');
    if (header) document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
    if (sectionNav) document.documentElement.style.setProperty('--section-nav-height', sectionNav.offsetHeight + 'px');
  }

  function getStickyOffset() {
    updateStickyMetrics();
    const header = $('header');
    const sectionNav = $('.section-nav');
    return (header ? header.offsetHeight : 0) + (sectionNav ? sectionNav.offsetHeight : 0) + 14;
  }

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia('(max-width: 560px)').matches;
  }

  function scrollToElementTop(element, behavior = 'smooth', extraMargin = 10) {
    if (!element) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        updateStickyMetrics();
        const targetTop = element.getBoundingClientRect().top + window.pageYOffset - getStickyOffset() - extraMargin;
        window.scrollTo({ top: Math.max(0, targetTop), behavior });
      });
    });
  }

  function scrollToQuizToolbar(behavior = 'smooth') {
    scrollToElementTop(document.getElementById('quizToolbar'), behavior, 8);
  }

  function scrollToContentTop(behavior = 'smooth') {
    if (!app) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        updateStickyMetrics();
        const targetTop = app.getBoundingClientRect().top + window.pageYOffset - getStickyOffset();
        window.scrollTo({ top: Math.max(0, targetTop), behavior });
      });
    });
  }

  function preventIconDrag() {
    $$('img, .hero-emoji, .hero-badge, .section-icon, .feature-emoji, .card-icon').forEach((el) => {
      el.setAttribute('draggable', 'false');
      el.addEventListener('dragstart', (event) => event.preventDefault());
      el.addEventListener('selectstart', (event) => event.preventDefault());
    });
  }

  function setActiveButtons() {
    $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.pet === currentPet));
    const quizBtn = $('.tab-btn[data-tab="quiz"]');
    if (quizBtn) quizBtn.textContent = DATA[currentPet].theme.emoji + ' 관련 지식 테스트';
    const matchBtn = $('.tab-btn[data-tab="match"]');
    if (matchBtn) matchBtn.textContent = '🎯 맞춤 추천';
    $$('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === currentTab));
  }

  function renderHero() {
    const pet = DATA[currentPet];
    $('#heroBadge').textContent = '🐾 ' + pet.theme.label + ' 백과';
    $('#heroEmoji').textContent = pet.theme.emoji;
    $('#heroTitle').textContent = pet.theme.title;
    $('#heroDesc').textContent = pet.theme.desc;
    $('#quickFacts').innerHTML = pet.quickFacts.map((fact) => (
      '<div class="summary-pill"><strong>' + escapeHTML(fact.label) + '</strong><span>' + escapeHTML(fact.value) + '</span></div>'
    )).join('');
  }

  function sectionHeader(icon, kicker, title, lead) {
    return '' +
      '<div class="section-header">' +
        '<div class="section-icon">' + escapeHTML(icon) + '</div>' +
        '<div class="kicker">' + escapeHTML(kicker) + '</div>' +
        '<h2>' + escapeHTML(title) + '</h2>' +
      '</div>' +
      (lead ? '<p class="lead">' + escapeHTML(lead) + '</p>' : '');
  }

  function getFilteredBreedGroups() {
    const query = normalizeText(breedQuery);
    const pet = DATA[currentPet];
    const result = [];

    pet.groups.forEach((group, groupIndex) => {
      const breeds = [];
      group.breeds.forEach((breed, breedIndex) => {
        const name = getBreedName(breed);
        const original = typeof breed === 'string' ? '' : (breed.original || '');
        const haystack = normalizeText(name + ' ' + original + ' ' + group.name);
        if (!query || haystack.indexOf(query) !== -1) {
          breeds.push({ breed, groupIndex, breedIndex, key: getBreedKey(groupIndex, breedIndex) });
        }
      });
      if (breeds.length) {
        result.push({ name: group.name, desc: group.desc, groupIndex, breeds });
      }
    });
    return result;
  }


  function getBreedLifestyleNote(groupName, name) {
    if (currentPet === 'dog') {
      if (/조렵|회수|스포츠/.test(groupName)) return '냄새 탐색, 회수 놀이, 물놀이처럼 목적이 있는 활동을 넣어야 지루함과 문제 행동을 줄이기 쉽습니다.';
      if (/목양|허딩/.test(groupName)) return '움직임을 통제하려는 본능이 강할 수 있어 산책뿐 아니라 두뇌 과제와 규칙 훈련이 중요합니다.';
      if (/하운드|수렵/.test(groupName)) return '후각이나 시각 자극을 따라가려는 성향이 있어 리드줄 관리와 리콜 훈련을 초반부터 잡는 편이 안전합니다.';
      if (/테리어/.test(groupName)) return '활동성과 집요함이 강한 편이라 짧고 명확한 훈련, 씹기 장난감, 에너지 발산 루틴이 잘 맞습니다.';
      if (/토이|반려/.test(groupName)) return '체구는 작아도 치아, 슬개골, 체중 변화에 민감할 수 있어 생활 공간과 놀이 강도를 섬세하게 조절해야 합니다.';
      if (/워킹|사역|작업/.test(groupName)) return '체격과 힘이 큰 경우가 많아 충분한 운동, 명확한 규칙, 안전한 핸들링이 함께 필요합니다.';
      if (/비사냥|논스포팅/.test(groupName)) return '품종별 체형과 목적 차이가 커서 외형보다 호흡, 피부, 활동량, 체중 관리 포인트를 먼저 확인하는 것이 좋습니다.';
      return '품종의 평균 성향보다 실제 개체의 에너지, 사회화 경험, 건강 상태를 기준으로 생활 루틴을 맞추는 것이 중요합니다.';
    }
    if (/메인쿤|노르웨이|랙돌|라가머핀/.test(name)) return '대형묘 또는 장모묘 성향이 강한 경우 성장기 영양, 관절 부담, 털 엉킴 관리까지 함께 봐야 합니다.';
    if (/스핑크스|피터볼드|밤비노|돈스코이/.test(name)) return '피모가 적은 품종은 체온 유지, 피부 유분, 햇빛 노출, 목욕 주기를 별도로 관리해야 합니다.';
    if (/렉스|라펌/.test(name)) return '특수 피모 품종은 털 빠짐이 적어 보여도 피부와 피모 상태를 정기적으로 확인하는 것이 좋습니다.';
    if (/스코티시|먼치킨|킬트|하이랜더/.test(name)) return '귀, 다리, 체형 특징이 강한 품종은 관절과 움직임 이상을 조기에 살피는 것이 중요합니다.';
    if (/뱅갈|사바나|토이거|아비시니안|오시캣/.test(name)) return '활동성과 탐색 욕구가 큰 편이라 캣타워, 사냥놀이, 창가 관찰 같은 환경 자극을 충분히 제공해야 합니다.';
    if (/페르시안|히말라얀|엑조틱/.test(name)) return '짧은 주둥이와 장모 특성이 있는 경우 눈물, 호흡, 털 엉킴, 더위 민감도를 함께 관리하는 것이 좋습니다.';
    return '품종명보다 실제 성격, 활동량, 피모 상태, 병력, 나이를 기준으로 화장실·놀이·식이 루틴을 조정해야 합니다.';
  }

  function breedDetailCard(item) {
    const breed = item.breed;
    const groupName = typeof breed === 'string' ? item.groupName : (breed.group || item.groupName);
    const name = getBreedName(breed);
    const profile = typeof breed === 'string'
      ? name + '은(는) ' + groupName + '에 속하는 품종입니다. 품종별 성향은 출신 목적, 사회화, 건강 상태에 따라 달라질 수 있습니다.'
      : breed.profile;
    const care = typeof breed === 'string'
      ? '품종의 원래 목적과 체격에 맞춰 운동량, 피모 관리, 사회화 강도를 조절하는 것이 좋습니다.'
      : breed.care;
    const health = typeof breed === 'string'
      ? '정기 검진, 체중 관리, 치아 관리, 예방접종과 구충을 기본 루틴으로 유지하세요.'
      : breed.health;
    const note = typeof breed === 'string'
      ? '같은 품종이라도 개체차가 크므로 실제 성격과 건강 상태를 기준으로 돌봄 계획을 세워야 합니다.'
      : breed.note;

    return '' +
      '<article class="breed-detail-card" id="breedDetail-' + escapeHTML(item.key) + '">' +
        '<button class="detail-close" type="button" data-close-breed="true" aria-label="품종 정보 닫기">×</button>' +
        '<h4>' + escapeHTML(name) + '</h4>' +
        '<p class="breed-summary"><strong>한 줄 요약</strong> ' + escapeHTML(getBreedOneLineSummary(groupName, name)) + '</p>' +
        '<div class="breed-detail-grid">' +
          '<div class="breed-fact"><strong>생활 적합도</strong><span>' + escapeHTML(getBreedLifestyleNote(groupName, name)) + '</span></div>' +
          '<div class="breed-fact"><strong>핵심 특징</strong><span>' + escapeHTML(profile) + '</span></div>' +
          '<div class="breed-fact"><strong>돌봄 포인트</strong><span>' + escapeHTML(care) + '</span></div>' +
          '<div class="breed-fact"><strong>건강 주의</strong><span>' + escapeHTML(health) + '</span></div>' +
          '<div class="breed-fact"><strong>보호자 체크</strong><span>' + escapeHTML(note) + '</span></div>' +
        '</div>' +
      '</article>';
  }

  function breedListMarkup() {
    const groups = getFilteredBreedGroups();
    if (!groups.length) {
      return '<div class="notice"><strong>검색 결과가 없습니다.</strong><br />품종명을 다시 확인해 주세요. 예: 푸들, 진돗개, 샴</div>';
    }

    return groups.map((group) => {
      const groupKey = currentPet + '-group-' + group.groupIndex;
      const opened = group.breeds.find((item) => item.key === openedBreedKey);
      const forceOpen = Boolean(breedQuery) || Boolean(opened);
      const expanded = forceOpen || expandedBreedGroups[currentPet].has(groupKey);
      const cardClass = expanded ? ' is-open' : ' is-collapsed';
      const toggleText = expanded ? '접기' : '펼치기';
      const chips = group.breeds.map((item) => {
        const active = openedBreedKey === item.key ? ' active' : '';
        return '<button class="chip' + active + '" type="button" data-breed-key="' + escapeHTML(item.key) + '" aria-expanded="' + (openedBreedKey === item.key ? 'true' : 'false') + '">' + escapeHTML(getBreedName(item.breed)) + '</button>';
      }).join('');

      if (opened) opened.groupName = group.name;

      return '' +
        '<section class="breed-list-card' + cardClass + '" data-breed-group-key="' + escapeHTML(groupKey) + '">' +
          '<div class="breed-group-head">' +
            '<h3>' + escapeHTML(group.name) + '</h3>' +
            '<button class="breed-group-toggle" type="button" data-breed-group-toggle="' + escapeHTML(groupKey) + '" aria-expanded="' + (expanded ? 'true' : 'false') + '">' + toggleText + '</button>' +
          '</div>' +
          '<p class="breed-group-desc">' + escapeHTML(group.desc) + '</p>' +
          '<div class="breed-group-body">' +
            '<div class="chips">' + chips + '</div>' +
            (opened ? breedDetailCard(opened) : '') +
          '</div>' +
        '</section>';
    }).join('');
  }

  function updateBreedList() {
    const groups = getFilteredBreedGroups();
    const listEl = $('#breedList');
    if (listEl) listEl.innerHTML = breedListMarkup();
  }

  function setupBreedSearch() {
    const input = $('#breedSearch');
    if (!input) return;
    input.value = breedQuery;
    input.addEventListener('compositionstart', () => { isComposing = true; });
    input.addEventListener('compositionend', () => {
      isComposing = false;
      breedQuery = input.value;
      openedBreedKey = '';
      updateBreedList();
    });
    input.addEventListener('input', () => {
      if (isComposing) return;
      breedQuery = input.value;
      openedBreedKey = '';
      updateBreedList();
    });
  }


  function comparePanelMarkup() {
    const all = getAllBreedItems(currentPet);
    const options = '<option value="">품종 선택</option>' + all.map((item) => (
      '<option value="' + escapeHTML(item.key) + '">' + escapeHTML(item.name) + '</option>'
    )).join('');
    const selects = compareState[currentPet].map((value, index) => (
      '<label class="compare-select-label"><span>' + (index + 1) + '번 품종</span><select class="compare-select" data-compare-index="' + index + '">' + options.replace('value="' + escapeHTML(value) + '"', 'value="' + escapeHTML(value) + '" selected') + '</select></label>'
    )).join('');
    const selected = compareState[currentPet].map((key) => findBreedItemByKey(key)).filter(Boolean);
    const result = selected.length ? (
      '<div class="compare-result">' +
        '<div class="compare-grid">' + selected.map((item) => {
          const breed = item.breed;
          const profile = typeof breed === 'string' ? getBreedOneLineSummary(item.groupName, item.name) : breed.profile;
          const care = typeof breed === 'string' ? getBreedLifestyleNote(item.groupName, item.name) : breed.care;
          const health = typeof breed === 'string' ? '정기 검진, 체중 관리, 치아 관리, 예방접종과 구충을 기본 루틴으로 유지하세요.' : breed.health;
          return '<article class="compare-card">' +
            '<h4>' + escapeHTML(item.name) + '</h4>' +
            '<p class="compare-group">' + escapeHTML(item.groupName) + '</p>' +
            '<dl>' +
              '<div><dt>한 줄 판단</dt><dd>' + escapeHTML(getBreedOneLineSummary(item.groupName, item.name)) + '</dd></div>' +
              '<div><dt>핵심 특징</dt><dd>' + escapeHTML(profile) + '</dd></div>' +
              '<div><dt>관리 포인트</dt><dd>' + escapeHTML(care) + '</dd></div>' +
              '<div><dt>건강 주의</dt><dd>' + escapeHTML(health) + '</dd></div>' +
            '</dl>' +
          '</article>';
        }).join('') + '</div>' +
      '</div>'
    ) : '<div class="compare-empty">비교할 품종을 2~3개 선택하면 생활 적합도와 관리 포인트를 한눈에 확인할 수 있습니다.</div>';
    return '' +
      '<section class="tool-card compare-tool" id="breedCompareTool">' +
        '<div class="tool-head"><span>⚖️</span><div><strong>품종 비교</strong><em>2~3개 품종을 가나다순으로 선택해 활동량, 관리 포인트, 건강 주의를 비교합니다.</em></div></div>' +
        '<div class="compare-selects">' + selects + '</div>' +
        '<div class="compare-actions"><button class="compare-reset" type="button" data-compare-reset="true">선택 초기화</button></div>' +
        result +
      '</section>';
  }

  function renderBreeds() {
    const pet = DATA[currentPet];
    app.innerHTML = '' +
      sectionHeader('🏷️', pet.theme.label + ' 품종 & 특징', pet.theme.label + ' 품종을 한국어 목록으로 정리했습니다', pet.breedBasis) +
      '<div class="source-box"><strong>사용 방법:</strong> 품종 버튼을 누르면 상세 정보 카드가 펼쳐집니다. 같은 버튼을 다시 누르거나 카드 우측 상단 × 버튼을 누르면 닫힙니다.</div>' +
      comparePanelMarkup() +
      '<div class="feature-grid">' + pet.featured.map((breed) => (
        '<article class="feature-card">' +
          '<div class="feature-emoji">' + escapeHTML(breed.emoji) + '</div>' +
          '<h3>' + escapeHTML(breed.name) + '</h3>' +
          '<span class="tag">' + escapeHTML(breed.tag) + '</span>' +
          '<p>' + escapeHTML(breed.text) + '</p>' +
        '</article>'
      )).join('') + '</div>' +
      '<div class="breed-tools">' +
        '<input id="breedSearch" type="search" inputmode="search" autocomplete="off" placeholder="품종명 검색 · 예: 푸들, 진돗개, 샴" />' +
        '<button class="breed-all-toggle" type="button" data-breed-all="open">전체 펼치기</button>' +
        '<button class="breed-all-toggle" type="button" data-breed-all="close">전체 접기</button>' +
      '</div>' +
      '<div class="breed-list" id="breedList"></div>' +
      '<div class="notice"><strong>품종 정보 읽는 법:</strong> 품종은 성향의 출발점일 뿐 정답지는 아닙니다. 같은 품종이어도 부모견/부모묘, 초기 사회화, 건강 상태, 생활 환경에 따라 성격과 관리 난이도는 크게 달라집니다.</div>';
    setupBreedSearch();
    updateBreedList();
  }


  function checklistStorageKey() {
    return 'petGuideChecklist:' + currentPet;
  }

  function getChecklistStore() {
    try {
      return JSON.parse(localStorage.getItem(checklistStorageKey()) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function saveChecklistStore(store) {
    try {
      localStorage.setItem(checklistStorageKey(), JSON.stringify(store));
    } catch (error) {}
  }

  function getChecklistItems() {
    const checklist = DATA[currentPet].checklist;
    const items = [];
    checklist.groups.forEach((group, groupIndex) => {
      group.items.forEach((text, itemIndex) => {
        items.push({ key: currentPet + '-' + groupIndex + '-' + itemIndex, text });
      });
    });
    return items;
  }

  function updateChecklistProgress() {
    const all = $$('.check-input');
    const checked = all.filter((input) => input.checked).length;
    const textEl = $('#checkProgressText');
    const fillEl = $('#checkProgressFill');
    if (textEl) textEl.textContent = checked + ' / ' + all.length + '개 완료';
    if (fillEl) fillEl.style.width = all.length ? Math.round((checked / all.length) * 100) + '%' : '0%';
  }


  function shuffleArray(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }

  function resetQuizSession(shouldRender = true) {
    const pool = DATA[currentPet].quiz || [];
    quizState[currentPet] = {
      items: shuffleArray(pool).slice(0, 20),
      answers: {},
      currentIndex: 0,
      submitted: false,
      result: null,
      message: ''
    };
    if (shouldRender) {
      renderQuiz();
      scrollToQuizToolbar('smooth');
    }
  }

  function ensureQuizSession() {
    if (!quizState[currentPet] || !quizState[currentPet].items || quizState[currentPet].items.length !== 20) {
      resetQuizSession(false);
    }
    if (typeof quizState[currentPet].currentIndex !== 'number') quizState[currentPet].currentIndex = 0;
    quizState[currentPet].currentIndex = Math.max(0, Math.min(19, quizState[currentPet].currentIndex));
    return quizState[currentPet];
  }

  function getAnsweredCount(session) {
    return session.items.reduce((count, _, index) => session.answers[index] != null ? count + 1 : count, 0);
  }

  function updateQuizProgress() {
    const session = ensureQuizSession();
    const answered = getAnsweredCount(session);
    const current = Math.max(0, Math.min(session.items.length - 1, session.currentIndex || 0));
    const currentText = document.getElementById('quizCurrentText');
    const answeredText = document.getElementById('quizAnsweredText');
    const progressFill = document.getElementById('quizProgressFill');
    if (currentText) currentText.textContent = '문제 ' + (current + 1) + ' / ' + session.items.length;
    if (answeredText) answeredText.textContent = '답변 완료 ' + answered + ' / ' + session.items.length;
    if (progressFill) progressFill.style.width = Math.round((answered / session.items.length) * 100) + '%';
  }

  function gradeQuiz(session) {
    let correct = 0;
    const wrong = [];
    session.items.forEach((item, index) => {
      const selected = Number(session.answers[index]);
      if (selected === item.answer) {
        correct += 1;
      } else {
        wrong.push({ index, item, selected });
      }
    });
    const score = Math.round((correct / session.items.length) * 100);
    let level = '';
    let message = '';
    if (score >= 90) {
      level = '우수';
      message = '기본 지식 준비도가 높습니다. 비용, 시간, 병원 루틴까지 준비되어 있다면 키워도 되는 수준입니다.';
    } else if (score >= 75) {
      level = '양호';
      message = '핵심은 알고 있습니다. 오답 노트만 보완하면 반려 생활 준비도가 꽤 안정적입니다.';
    } else if (score >= 60) {
      level = '보완 필요';
      message = '키우기 전에 조금 더 공부가 필요합니다. 특히 오답 항목은 실제 사고와 직결될 수 있습니다.';
    } else {
      level = '준비 부족';
      message = '지금 바로 입양하기보다는 기본 돌봄, 위험 음식, 행동 신호부터 다시 학습하는 편이 안전합니다.';
    }
    return { correct, score, wrong, level, message };
  }

  function renderQuizResult(session) {
    if (!session.submitted || !session.result) return '';
    const result = session.result;
    const wrongMarkup = result.wrong.length ? result.wrong.map((entry) => {
      const item = entry.item;
      const selectedText = Number.isInteger(entry.selected) && item.options[entry.selected] ? item.options[entry.selected] : '미선택';
      return '' +
        '<article class="wrong-card">' +
          '<strong>Q' + (entry.index + 1) + '. ' + escapeHTML(item.question) + '</strong>' +
          '<p><b>내 답:</b> ' + escapeHTML(selectedText) + '</p>' +
          '<p><b>정답:</b> ' + escapeHTML(item.options[item.answer]) + '</p>' +
          '<p><b>해설:</b> ' + escapeHTML(item.explanation) + '</p>' +
        '</article>';
    }).join('') : '<div class="perfect-note">오답이 없습니다. 이 정도면 펫 박사님, 거의 사료 봉투 뒷면까지 정독한 수준입니다. 🐾</div>';

    return '' +
      '<section class="quiz-result" id="quizResultCard">' +
        '<div class="result-score">' + result.score + '<span>점</span></div>' +
        '<div class="result-summary">' +
          '<h3>' + escapeHTML(DATA[currentPet].theme.label) + ' 지식 테스트 결과 · ' + escapeHTML(result.level) + '</h3>' +
          '<p>' + escapeHTML(result.message) + '</p>' +
          '<div class="result-meta">20문제 중 ' + result.correct + '개 정답 · 오답 ' + result.wrong.length + '개</div>' +
        '</div>' +
        '<button class="download-result" type="button" data-download-result="true">결과지 PNG 다운로드</button>' +
      '</section>' +
      '<section class="wrong-note">' +
        '<h3>오답 노트</h3>' +
        wrongMarkup +
      '</section>';
  }

  function renderQuiz() {
    const session = ensureQuizSession();
    const petLabel = DATA[currentPet].theme.label;
    const total = session.items.length;
    const currentIndex = Math.max(0, Math.min(total - 1, session.currentIndex || 0));
    session.currentIndex = currentIndex;
    const answered = getAnsweredCount(session);
    const item = session.items[currentIndex];
    const selected = session.answers[currentIndex];
    const canPrev = currentIndex > 0;
    const canNext = currentIndex < total - 1;
    const resultMarkup = renderQuizResult(session);

    app.innerHTML = '' +
      sectionHeader('🧠', petLabel + ' 관련 지식 테스트', petLabel + '를 키우기 전 꼭 알아야 할 핵심 지식을 점검합니다', '총 100문제 중 랜덤 20문제가 출제됩니다. 새로고침하거나 문제 초기화 버튼을 누르면 다시 랜덤으로 뽑힙니다.') +
      '<div class="quiz-toolbar step-toolbar" id="quizToolbar">' +
        '<div><strong>랜덤 20문제</strong><span>한 문제씩 풀고, 이전/다음 버튼으로 답안을 다시 확인할 수 있습니다.</span></div>' +
        '<button class="reset-quiz" type="button" data-reset-quiz="true">문제 초기화</button>' +
      '</div>' +
      (session.message ? '<div class="quiz-alert">' + escapeHTML(session.message) + '</div>' : '') +
      '<div class="quiz-step-shell">' +
        '<div class="quiz-step-head">' +
          '<div class="quiz-progress-main" id="quizCurrentText">문제 ' + (currentIndex + 1) + ' / ' + total + '</div>' +
          '<div class="quiz-progress-sub" id="quizAnsweredText">답변 완료 ' + answered + ' / ' + total + '</div>' +
        '</div>' +
        '<div class="quiz-progress-track" aria-hidden="true"><div class="quiz-progress-fill" id="quizProgressFill" style="width:' + Math.round((answered / total) * 100) + '%"></div></div>' +
        '<form class="quiz-form quiz-step-form" id="quizForm">' +
          '<fieldset class="quiz-card quiz-single-card" data-question-index="' + currentIndex + '">' +
            '<legend><span>' + String(currentIndex + 1).padStart(2, '0') + '</span>' + escapeHTML(item.question) + '</legend>' +
            '<div class="quiz-category">' + escapeHTML(item.category) + '</div>' +
            '<div class="quiz-options">' + item.options.map((option, optionIndex) => {
              const checked = String(selected) === String(optionIndex) ? ' checked' : '';
              return '' +
                '<label class="quiz-option">' +
                  '<input class="quiz-option-input" type="radio" name="q' + currentIndex + '" value="' + optionIndex + '" data-quiz-index="' + currentIndex + '"' + checked + ' />' +
                  '<span>' + escapeHTML(option) + '</span>' +
                '</label>';
            }).join('') + '</div>' +
          '</fieldset>' +
          '<div class="quiz-step-actions">' +
            '<button class="quiz-nav-btn prev" type="button" data-quiz-prev="true"' + (canPrev ? '' : ' disabled') + '>← 이전</button>' +
            (canNext
              ? '<button class="quiz-nav-btn next" type="button" data-quiz-next="true">다음 →</button>'
              : '<button class="submit-quiz" type="button" data-submit-quiz="true">제출하고 결과 보기</button>') +
          '</div>' +
        '</form>' +
      '</div>' +
      resultMarkup +
      '<div class="notice"><strong>안내:</strong> 이 테스트는 학습용입니다. 실제 입양 가능 여부는 시간, 비용, 주거 환경, 가족 동의, 알레르기, 병원 접근성까지 함께 판단해야 합니다.</div>';
    updateStickyMetrics();
    updateQuizProgress();
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text).split(' ');
    let line = '';
    let lines = 0;
    for (let i = 0; i < words.length; i += 1) {
      const testLine = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        lines += 1;
        line = words[i];
        if (maxLines && lines >= maxLines) return y;
      } else {
        line = testLine;
      }
    }
    if (line && (!maxLines || lines < maxLines)) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function downloadQuizResultPNG() {
    const session = ensureQuizSession();
    if (!session.submitted || !session.result) return;
    const result = session.result;
    const petLabel = DATA[currentPet].theme.label;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = Math.max(1280, 720 + result.wrong.length * 132);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = currentPet === 'dog' ? '#fff0e4' : '#f3efff';
    ctx.beginPath();
    ctx.arc(1040, 120, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = currentPet === 'dog' ? '#d86f34' : '#7c68aa';
    ctx.font = '900 46px Noto Sans KR, Arial, sans-serif';
    ctx.fillText(petLabel + ' 관련 지식 테스트 결과', 70, 90);
    ctx.font = '700 26px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('펫 가이드 · ' + new Date().toLocaleDateString('ko-KR'), 70, 132);

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 70, 180, 1060, 240, 34);
    ctx.fill();
    ctx.fillStyle = currentPet === 'dog' ? '#d86f34' : '#7c68aa';
    ctx.font = '900 96px Noto Sans KR, Arial, sans-serif';
    ctx.fillText(String(result.score), 115, 325);
    ctx.font = '900 34px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('점', 270, 325);
    ctx.font = '900 34px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('판정: ' + result.level, 390, 270);
    ctx.fillStyle = '#66584f';
    ctx.font = '600 26px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('20문제 중 ' + result.correct + '개 정답 · 오답 ' + result.wrong.length + '개', 390, 314);
    ctx.font = '500 24px Noto Sans KR, Arial, sans-serif';
    wrapCanvasText(ctx, result.message, 390, 356, 670, 34, 3);

    let y = 500;
    ctx.fillStyle = '#20130b';
    ctx.font = '900 34px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('오답 노트', 70, y);
    y += 42;
    if (!result.wrong.length) {
      ctx.fillStyle = '#66584f';
      ctx.font = '700 26px Noto Sans KR, Arial, sans-serif';
      ctx.fillText('오답이 없습니다. 훌륭합니다!', 70, y + 30);
    } else {
      result.wrong.forEach((entry) => {
        const item = entry.item;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 70, y, 1060, 100, 22);
        ctx.fill();
        ctx.fillStyle = '#20130b';
        ctx.font = '800 23px Noto Sans KR, Arial, sans-serif';
        wrapCanvasText(ctx, 'Q' + (entry.index + 1) + '. ' + item.question, 100, y + 34, 1000, 28, 2);
        ctx.fillStyle = '#66584f';
        ctx.font = '600 21px Noto Sans KR, Arial, sans-serif';
        ctx.fillText('정답: ' + item.options[item.answer], 100, y + 82);
        y += 120;
      });
    }
    ctx.fillStyle = '#9b8d81';
    ctx.font = '500 20px Noto Sans KR, Arial, sans-serif';
    ctx.fillText('※ 학습용 결과지이며, 실제 반려 여부는 시간·비용·주거·병원 접근성까지 함께 판단하세요.', 70, canvas.height - 60);
    const link = document.createElement('a');
    link.download = 'pet-guide-' + currentPet + '-quiz-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function renderChecklist() {
    const checklist = DATA[currentPet].checklist;
    const store = getChecklistStore();
    app.innerHTML = '' +
      sectionHeader(checklist.icon, checklist.kicker, checklist.title, checklist.lead) +
      '<div class="check-progress">' +
        '<strong id="checkProgressText">0 / 0개 완료</strong>' +
        '<div class="progress-track" aria-hidden="true"><div class="progress-fill" id="checkProgressFill"></div></div>' +
        '<button class="reset-checks" type="button" data-reset-checks="true">체크 초기화</button>' +
      '</div>' +
      costCalculatorMarkup() +
      '<div class="checklist-grid">' + checklist.groups.map((group, groupIndex) => (
        '<article class="check-card">' +
          '<div class="card-head">' +
            '<div class="card-icon">' + escapeHTML(group.icon) + '</div>' +
            '<div>' +
              '<h3>' + escapeHTML(group.title) + '</h3>' +
              '<p>' + escapeHTML(group.desc) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="check-items">' + group.items.map((item, itemIndex) => {
            const key = currentPet + '-' + groupIndex + '-' + itemIndex;
            const checked = store[key] ? ' checked' : '';
            return '<label class="check-row"><input class="check-input" type="checkbox" data-check-key="' + escapeHTML(key) + '"' + checked + ' /><span>' + escapeHTML(item) + '</span></label>';
          }).join('') + '</div>' +
        '</article>'
      )).join('') + '</div>' +
      '<div class="notice"><strong>추가 기능:</strong> 체크한 항목은 이 브라우저에 저장됩니다. 입양 전 준비도를 눈으로 확인하고, 남은 항목만 빠르게 점검할 수 있습니다.</div>';
    updateChecklistProgress();
  }


  function getFoodSearchEntries(section, rawQuery = foodQuery) {
    const query = normalizeText(rawQuery);
    const entries = [];
    section.cards.forEach((card) => card.items.forEach((item) => {
      const name = item[0] || '';
      const desc = item[1] || '';
      const haystack = normalizeText(name + ' ' + desc + ' ' + card.title + ' ' + (card.subtitle || ''));
      if (!query || haystack.indexOf(query) !== -1) entries.push({ card, item });
    }));
    return entries;
  }

  function foodResultsMarkup(section, rawQuery = foodQuery) {
    const entries = getFoodSearchEntries(section, rawQuery);
    if (!rawQuery) return '<div class="compare-empty">음식명을 검색하면 위험도와 대응 포인트를 바로 확인할 수 있습니다.</div>';
    if (!entries.length) return '<div class="compare-empty">검색 결과가 없습니다. 음식명을 짧게 입력해 보세요. 예: 포도, 우유, 초콜릿</div>';
    return entries.map((entry) => (
      '<article class="food-result-card">' +
        '<strong>' + escapeHTML(entry.item[0]) + '</strong>' +
        '<span class="food-risk">' + escapeHTML(entry.card.title) + '</span>' +
        '<p>' + escapeHTML(entry.item[1]) + '</p>' +
      '</article>'
    )).join('');
  }

  function updateFoodResults() {
    const section = DATA[currentPet].sections.food;
    const results = document.getElementById('foodResults');
    if (results) results.innerHTML = foodResultsMarkup(section, foodQuery);
  }

  function setupFoodSearch() {
    const input = document.getElementById('foodSearch');
    if (!input) return;
    input.value = foodQuery;
    input.addEventListener('compositionstart', () => { isComposing = true; });
    input.addEventListener('compositionend', () => {
      isComposing = false;
      foodQuery = input.value;
      updateFoodResults();
    });
    input.addEventListener('input', () => {
      if (isComposing) return;
      foodQuery = input.value;
      updateFoodResults();
    });
  }

  function foodSearchMarkup(section) {
    return '' +
      '<section class="tool-card food-search-tool">' +
        '<div class="tool-head"><span>🔎</span><div><strong>위험 음식 빠른 검색</strong><em>음식명을 입력하면 위험도와 대응 포인트가 바로 표시됩니다.</em></div></div>' +
        '<input class="tool-input" id="foodSearch" type="search" inputmode="search" autocomplete="off" placeholder="음식 검색 · 예: 초콜릿, 포도, 우유" value="' + escapeHTML(foodQuery) + '" />' +
        '<div class="food-results" id="foodResults">' + foodResultsMarkup(section, foodQuery) + '</div>' +
      '</section>';
  }

  function renderFood() {
    const section = DATA[currentPet].sections.food;
    app.innerHTML = sectionHeader(section.icon, section.kicker, section.title, section.lead || '') + foodSearchMarkup(section) + cardsMarkup(section) + sourceNotice();
    setupFoodSearch();
  }

  const lifecycleData = {
    dog: [
      ['새끼 시기', '사회화, 배변, 짧은 훈련, 예방접종 루틴이 핵심입니다. 과한 점프와 장거리 운동은 성장판과 관절에 부담이 될 수 있습니다.'],
      ['성견 시기', '체중, 치아, 피부, 산책 루틴을 안정적으로 유지해야 합니다. 문제 행동은 운동 부족보다 규칙 부재에서 시작되는 경우가 많습니다.'],
      ['노령견 시기', '6개월 단위 검진, 관절 보조, 미끄럼 방지, 시력·청력 변화 관찰이 중요합니다. 활동량은 줄이되 냄새 탐색과 가벼운 놀이를 유지하세요.'],
      ['중성화·예방', '나이, 체중, 품종, 질환 여부에 따라 시기가 달라집니다. 일정은 수의사와 상담해 확정하는 것이 안전합니다.']
    ],
    cat: [
      ['새끼 시기', '화장실 위치, 스크래처, 손을 장난감으로 쓰지 않는 놀이 규칙을 초반에 잡아야 합니다.'],
      ['성묘 시기', '체중, 음수량, 화장실 횟수, 놀이 시간을 꾸준히 확인하세요. 고양이는 아픈 티를 늦게 내는 편입니다.'],
      ['노령묘 시기', '신장, 치아, 관절, 갑상선 관련 변화 관찰이 중요합니다. 물그릇과 화장실 접근성을 높여 주세요.'],
      ['중성화·예방', '발정 스트레스, 생식기 질환, 영역 표시를 줄이는 데 도움이 될 수 있으나 개체 상태에 따라 상담이 필요합니다.']
    ]
  };

  const mistakeData = {
    dog: [
      ['사람 음식 급여', '귀엽다고 한 입 주는 습관이 췌장염, 비만, 독성 섭취 사고로 이어질 수 있습니다.'],
      ['산책을 배변 시간으로만 보기', '강아지에게 산책은 냄새 정보 수집과 스트레스 해소 시간입니다.'],
      ['문제 행동을 고집으로만 판단', '짖음, 물기, 파괴는 불안, 통증, 지루함, 규칙 부재의 신호일 수 있습니다.'],
      ['예방 관리 미루기', '접종, 구충, 치아 관리는 문제가 생긴 뒤보다 미리 하는 편이 안전하고 비용도 낮습니다.']
    ],
    cat: [
      ['화장실을 적게 두기', '다묘 가정은 고양이 수 + 1개가 기본입니다. 위치와 청결도 중요합니다.'],
      ['강제로 안기', '고양이는 선택권을 중요하게 느낍니다. 억지 스킨십은 공격성과 회피를 키울 수 있습니다.'],
      ['놀이 부족', '사냥 놀이가 부족하면 새벽 소란, 과식, 공격 놀이로 이어질 수 있습니다.'],
      ['물 섭취 무시', '고양이는 음수량이 부족하기 쉬워 습식, 물그릇 위치, 음수대를 함께 고려해야 합니다.']
    ]
  };

  function extraLearningMarkup() {
    return '' +
      '<section class="tool-card learning-tool">' +
        '<div class="tool-head"><span>📅</span><div><strong>생애주기 관리</strong><em>나이에 따라 관리 기준이 달라집니다.</em></div></div>' +
        '<div class="mini-grid">' + lifecycleData[currentPet].map((item) => '<article><strong>' + escapeHTML(item[0]) + '</strong><p>' + escapeHTML(item[1]) + '</p></article>').join('') + '</div>' +
      '</section>' +
      '<section class="tool-card mistakes-tool">' +
        '<div class="tool-head"><span>⚠️</span><div><strong>초보자 실수 모음</strong><em>반려 생활 초반에 가장 많이 놓치는 부분입니다.</em></div></div>' +
        '<div class="mini-grid">' + mistakeData[currentPet].map((item) => '<article><strong>' + escapeHTML(item[0]) + '</strong><p>' + escapeHTML(item[1]) + '</p></article>').join('') + '</div>' +
      '</section>';
  }

  function renderCare() {
    const section = DATA[currentPet].sections.care;
    app.innerHTML = sectionHeader(section.icon, section.kicker, section.title, section.lead || '') + cardsMarkup(section) + extraLearningMarkup() + sourceNotice();
  }

  function costDefaults() {
    return currentPet === 'dog'
      ? { food: 60000, snack: 20000, grooming: 50000, medical: 30000, prevention: 25000, supplies: 20000 }
      : { food: 55000, snack: 18000, grooming: 10000, medical: 30000, prevention: 15000, supplies: 35000 };
  }

  function getCostValues() {
    const defaults = costDefaults();
    const values = {};
    Object.keys(defaults).forEach((key) => {
      const input = document.querySelector('[data-cost-key="' + key + '"]');
      values[key] = input ? Math.max(0, Number(input.value || 0)) : defaults[key];
    });
    return values;
  }

  function formatWon(value) {
    return Math.round(value).toLocaleString('ko-KR') + '원';
  }

  function updateCostTotal() {
    const values = getCostValues();
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    const totalEl = document.getElementById('costTotal');
    const yearlyEl = document.getElementById('costYearly');
    if (totalEl) totalEl.textContent = formatWon(total);
    if (yearlyEl) yearlyEl.textContent = formatWon(total * 12);
  }

  function costCalculatorMarkup() {
    const defaults = costDefaults();
    const labels = currentPet === 'dog'
      ? { food: '사료비', snack: '간식비', grooming: '미용비', medical: '병원 예비비', prevention: '예방약·구충', supplies: '배변패드·장난감' }
      : { food: '사료비', snack: '간식비', grooming: '미용·빗질 용품', medical: '병원 예비비', prevention: '예방약·구충', supplies: '모래·스크래처' };
    const fields = Object.keys(defaults).map((key) => (
      '<label class="cost-field"><span>' + escapeHTML(labels[key]) + '</span><input type="number" min="0" step="1000" data-cost-key="' + key + '" value="' + defaults[key] + '" /></label>'
    )).join('');
    return '' +
      '<section class="tool-card cost-tool">' +
        '<div class="tool-head"><span>💰</span><div><strong>월 예상 비용 계산기</strong><em>입양 전 실제 유지비를 숫자로 확인합니다. 기본값은 수정 가능합니다.</em></div></div>' +
        '<div class="cost-grid">' + fields + '</div>' +
        '<div class="cost-total"><span>예상 월 비용</span><strong id="costTotal">0원</strong><em>연간 약 <b id="costYearly">0원</b></em></div>' +
      '</section>';
  }

  const matchQuestions = [
    { key: 'time', label: '하루 돌봄 가능 시간', options: [['low', '30분 이하'], ['mid', '30분~1시간'], ['high', '1시간 이상']] },
    { key: 'activity', label: '원하는 활동량', options: [['low', '조용한 생활'], ['mid', '적당한 놀이'], ['high', '활동적인 산책·놀이']] },
    { key: 'grooming', label: '털 관리 부담', options: [['low', '최소 관리 선호'], ['mid', '주기적 빗질 가능'], ['high', '미용·장모 관리 가능']] },
    { key: 'alone', label: '집을 비우는 시간', options: [['low', '짧은 편'], ['mid', '보통'], ['high', '긴 편']] },
    { key: 'budget', label: '월 관리 비용 여유', options: [['low', '낮음'], ['mid', '보통'], ['high', '충분함']] }
  ];

  function getMatchRecommendedBreeds(answers) {
    if (currentPet === 'dog') {
      if (answers.activity === 'high') {
        return answers.grooming === 'low'
          ? ['래브라도 리트리버', '비글', '달마시안', '저먼 쇼트헤어드 포인터']
          : ['골든 리트리버', '보더 콜리', '오스트레일리안 셰퍼드', '스탠더드 푸들'];
      }
      if (answers.activity === 'low') {
        return answers.grooming === 'high'
          ? ['말티즈', '비숑 프리제', '시추', '토이 푸들']
          : ['프렌치 불독', '퍼그', '치와와', '보스턴 테리어'];
      }
      return answers.grooming === 'high'
        ? ['미니어처 푸들', '코커 스패니얼', '캐벌리어 킹 찰스 스패니얼', '비숑 프리제']
        : ['웰시 코기 펨브로크', '시바이누', '진돗개', '미니어처 슈나우저'];
    }
    if (answers.activity === 'high') return ['뱅갈', '아비시니안', '오시캣', '사바나', '토이거'];
    if (answers.activity === 'low') {
      return answers.grooming === 'high'
        ? ['페르시안', '랙돌', '히말라얀', '라가머핀']
        : ['브리티시 숏헤어', '러시안 블루', '엑조틱 숏헤어', '스코티시 폴드'];
    }
    return ['코리안 숏헤어', '아메리칸 숏헤어', '샴', '버만', '데본 렉스'];
  }

  function evaluateMatch() {
    const answers = matchAnswers[currentPet];
    const missing = matchQuestions.find((q) => !answers[q.key]);
    if (missing) return { missing: missing.label };
    let score = 0;
    if (answers.time === 'high') score += 2; else if (answers.time === 'mid') score += 1;
    if (answers.budget === 'high') score += 2; else if (answers.budget === 'mid') score += 1;
    if (answers.alone === 'low') score += 2; else if (answers.alone === 'mid') score += 1;
    const style = currentPet === 'dog'
      ? (answers.activity === 'high' ? '활동형 견종' : answers.activity === 'low' ? '소형 반려견·차분한 성향의 견종' : '중간 활동량의 반려견')
      : (answers.activity === 'high' ? '활동형 고양이' : answers.activity === 'low' ? '차분한 성향의 고양이' : '중간 활동량의 고양이');
    const level = score >= 5 ? '입양 준비 적합도 높음' : score >= 3 ? '조건 보완 후 입양 권장' : '입양 전 준비 보강 필요';
    const message = score >= 5
      ? '시간, 비용, 생활 루틴이 비교적 안정적입니다. 실제 입양 전에는 알레르기, 병원 접근성, 가족 동의까지 최종 확인하세요.'
      : score >= 3
        ? '기본 조건은 가능하지만 일부 항목 보완이 필요합니다. 특히 혼자 있는 시간과 비용 계획을 현실적으로 조정하세요.'
        : '현재 조건에서는 귀여움보다 리스크가 큽니다. 돌봄 시간, 비용, 가족 합의부터 먼저 준비하는 편이 안전합니다.';
    return { level, style, message, breeds: getMatchRecommendedBreeds(answers) };
  }

  function renderMatchResult() {
    const result = evaluateMatch();
    if (result.missing) return '<div class="match-result muted">모든 문항을 선택하면 추천 결과가 표시됩니다.</div>';
    return '<div class="match-result"><strong>' + escapeHTML(result.level) + '</strong><p><b>추천 유형:</b> ' + escapeHTML(result.style) + '</p><p><b>추천 품종 예시:</b> ' + result.breeds.map((name) => '<span class="match-breed-chip">' + escapeHTML(name) + '</span>').join('') + '</p><p class="match-note">' + escapeHTML(result.message) + '</p><p class="match-caution">※ 품종 예시는 참고용입니다. 실제 입양은 개체 성격, 건강 상태, 보호자의 생활 루틴을 기준으로 판단하세요.</p></div>';
  }

  function renderMatch() {
    const petLabel = DATA[currentPet].theme.label;
    const answers = matchAnswers[currentPet];
    app.innerHTML = '' +
      sectionHeader('🎯', petLabel + ' 맞춤 추천 테스트', '내 생활 조건에 맞는 반려동물 유형을 점검합니다', '입양 가능 여부를 확정하는 기능은 아니며, 시간·비용·주거 환경·가족 동의까지 함께 판단해야 합니다.') +
      '<section class="tool-card match-tool">' +
        '<div class="tool-head"><span>🧭</span><div><strong>생활 조건 체크</strong><em>답변을 선택하면 추천 유형과 준비도를 즉시 확인합니다.</em></div></div>' +
        '<div class="match-form">' + matchQuestions.map((q) => (
          '<fieldset class="match-field"><legend>' + escapeHTML(q.label) + '</legend>' +
            '<div class="match-options">' + q.options.map((opt) => (
              '<label><input type="radio" name="match-' + q.key + '" data-match-key="' + q.key + '" value="' + opt[0] + '"' + (answers[q.key] === opt[0] ? ' checked' : '') + ' /><span>' + escapeHTML(opt[1]) + '</span></label>'
            )).join('') + '</div>' +
          '</fieldset>'
        )).join('') + '</div>' +
        '<div id="matchResult">' + renderMatchResult() + '</div>' +
      '</section>' +
      '<div class="notice"><strong>주의:</strong> 추천 결과는 학습용입니다. 실제 입양 전에는 보호자의 근무 시간, 비용, 알레르기, 병원 접근성, 장기 돌봄 가능성을 별도로 점검하세요.</div>';
  }

  function renderCards(section) {
    app.innerHTML = sectionHeader(section.icon, section.kicker, section.title, section.lead || '') + cardsMarkup(section) + sourceNotice();
  }

  function render() {
    setActiveButtons();
    updateStickyMetrics();
    if (currentTab === 'breeds') {
      renderBreeds();
      preventIconDrag();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'food') {
      renderFood();
      preventIconDrag();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'care') {
      renderCare();
      preventIconDrag();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'checklist') {
      renderChecklist();
      preventIconDrag();
      updateStickyMetrics();
      updateCostTotal();
      return;
    }
    if (currentTab === 'match') {
      renderMatch();
      preventIconDrag();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'quiz') {
      renderQuiz();
      preventIconDrag();
      updateStickyMetrics();
      return;
    }
    renderCards(DATA[currentPet].sections[currentTab]);
    preventIconDrag();
    updateStickyMetrics();
  }

  function resetHome() {
    currentPet = 'dog';
    currentTab = 'breeds';
    breedQuery = '';
    foodQuery = '';
    openedBreedKey = '';
    expandedBreedGroups.dog.clear();
    expandedBreedGroups.cat.clear();
    document.body.className = 'dog-mode';
    renderHero();
    preventIconDrag();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setPet(pet) {
    if (!DATA[pet]) return;
    currentPet = pet;
    currentTab = 'breeds';
    breedQuery = '';
    foodQuery = '';
    openedBreedKey = '';
    if (expandedBreedGroups[pet]) expandedBreedGroups[pet].clear();
    document.body.className = pet + '-mode';
    renderHero();
    preventIconDrag();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setTab(tab) {
    if (TABS.indexOf(tab) === -1) return;
    const sameTab = currentTab === tab;
    currentTab = tab;
    if (!sameTab) {
      breedQuery = '';
      openedBreedKey = '';
      render();
    } else {
      setActiveButtons();
    }
    scrollToContentTop('smooth');
  }


  function renderEmergencyModal() {
    const modalBody = document.getElementById('emergencyBody');
    if (!modalBody) return;
    const items = currentPet === 'dog'
      ? ['초콜릿·자일리톨·포도·양파류 섭취', '호흡곤란, 잇몸 창백, 발작', '반복 구토·혈변·복부 팽만', '배뇨 불가 또는 갑작스러운 마비', '갑작스러운 공격성·심한 통증 반응']
      : ['양파류·초콜릿·카페인·알코올 섭취', '호흡곤란, 개구호흡, 발작', '반복 구토·식욕 완전 저하', '배뇨 자세만 잡고 소변이 나오지 않음', '높은 곳에서 추락 후 절뚝거림·숨기'];
    modalBody.innerHTML = '<p><strong>' + escapeHTML(DATA[currentPet].theme.label) + ' 응급 체크</strong><br />아래 항목 중 하나라도 해당되면 인터넷 검색보다 동물병원 상담이 우선입니다.</p>' +
      '<ul>' + items.map((item) => '<li>' + escapeHTML(item) + '</li>').join('') + '</ul>' +
      '<div class="emergency-note">섭취한 음식, 시간, 추정량, 증상을 메모해 병원에 전달하세요.</div>';
  }

  function bindEvents() {
    window.addEventListener('resize', () => { updateStickyMetrics(); if (currentTab === 'breeds') updateBreedList(); });
    window.addEventListener('orientationchange', () => { updateStickyMetrics(); if (currentTab === 'breeds') updateBreedList(); });
    window.addEventListener('scroll', updateStickyMetrics, { passive: true });
    const homeLogo = $('#homeLogo');
    if (homeLogo) homeLogo.addEventListener('click', resetHome);
    $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => setPet(btn.dataset.pet)));
    $$('.tab-btn').forEach((btn) => btn.addEventListener('click', (event) => {
      event.preventDefault();
      setTab(btn.dataset.tab);
    }));

    $('#backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const emergencyBtn = $('#emergencyBtn');
    const emergencyModal = $('#emergencyModal');
    const emergencyClose = $('#emergencyClose');
    if (emergencyBtn && emergencyModal) emergencyBtn.addEventListener('click', () => { renderEmergencyModal(); emergencyModal.classList.add('open'); emergencyModal.setAttribute('aria-hidden', 'false'); });
    if (emergencyClose && emergencyModal) emergencyClose.addEventListener('click', () => { emergencyModal.classList.remove('open'); emergencyModal.setAttribute('aria-hidden', 'true'); });
    if (emergencyModal) emergencyModal.addEventListener('click', (event) => { if (event.target === emergencyModal) { emergencyModal.classList.remove('open'); emergencyModal.setAttribute('aria-hidden', 'true'); } });

    app.addEventListener('click', (event) => {
      const resetChecksBtn = event.target.closest('[data-reset-checks]');
      if (resetChecksBtn) {
        saveChecklistStore({});
        $$('.check-input').forEach((input) => { input.checked = false; });
        updateChecklistProgress();
        return;
      }

      const resetQuizBtn = event.target.closest('[data-reset-quiz]');
      if (resetQuizBtn) {
        resetQuizSession(true);
        return;
      }

      const compareResetBtn = event.target.closest('[data-compare-reset]');
      if (compareResetBtn) {
        compareState[currentPet] = ['', '', ''];
        renderBreeds();
        window.requestAnimationFrame(() => scrollToElementTop(document.getElementById('breedCompareTool'), 'smooth', 8));
        return;
      }

      const quizPrevBtn = event.target.closest('[data-quiz-prev]');
      if (quizPrevBtn) {
        const session = ensureQuizSession();
        session.currentIndex = Math.max(0, (session.currentIndex || 0) - 1);
        session.message = '';
        renderQuiz();
        scrollToQuizToolbar('smooth');
        return;
      }

      const quizNextBtn = event.target.closest('[data-quiz-next]');
      if (quizNextBtn) {
        const session = ensureQuizSession();
        session.currentIndex = Math.min(session.items.length - 1, (session.currentIndex || 0) + 1);
        session.message = '';
        renderQuiz();
        scrollToQuizToolbar('smooth');
        return;
      }

      const submitQuizBtn = event.target.closest('[data-submit-quiz]');
      if (submitQuizBtn) {
        const session = ensureQuizSession();
        const unanswered = session.items.findIndex((_, index) => session.answers[index] == null);
        if (unanswered !== -1) {
          session.currentIndex = unanswered;
          session.message = '아직 풀지 않은 문제가 있습니다. Q' + (unanswered + 1) + '번을 확인해 주세요.';
          renderQuiz();
          scrollToQuizToolbar('smooth');
          return;
        }
        session.submitted = true;
        session.message = '';
        session.result = gradeQuiz(session);
        renderQuiz();
        window.requestAnimationFrame(() => {
          const result = document.getElementById('quizResultCard');
          if (result) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }

      const downloadResultBtn = event.target.closest('[data-download-result]');
      if (downloadResultBtn) {
        downloadQuizResultPNG();
        return;
      }


      const breedAllToggle = event.target.closest('[data-breed-all]');
      if (breedAllToggle) {
        const action = breedAllToggle.dataset.breedAll;
        const store = expandedBreedGroups[currentPet];
        store.clear();
        if (action === 'open') {
          getFilteredBreedGroups().forEach((group) => store.add(currentPet + '-group-' + group.groupIndex));
        }
        if (action === 'close') openedBreedKey = '';
        updateBreedList();
        const list = document.getElementById('breedList');
        scrollToElementTop(list, 'smooth', 8);
        return;
      }

      const groupToggle = event.target.closest('[data-breed-group-toggle]');
      if (groupToggle) {
        const groupKey = groupToggle.dataset.breedGroupToggle;
        const store = expandedBreedGroups[currentPet];
        const isOpen = groupToggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) store.delete(groupKey);
        else store.add(groupKey);
        if (isOpen) openedBreedKey = '';
        updateBreedList();
        const targetGroup = document.querySelector('[data-breed-group-key="' + groupKey + '"]');
        scrollToElementTop(targetGroup, 'smooth', 8);
        return;
      }

      const closeBtn = event.target.closest('[data-close-breed]');
      if (closeBtn) {
        openedBreedKey = '';
        updateBreedList();
        return;
      }

      const breedBtn = event.target.closest('[data-breed-key]');
      if (breedBtn) {
        const key = breedBtn.dataset.breedKey;
        openedBreedKey = openedBreedKey === key ? '' : key;
        if (openedBreedKey) {
          const groupCard = breedBtn.closest('[data-breed-group-key]');
          if (groupCard && groupCard.dataset.breedGroupKey) {
            expandedBreedGroups[currentPet].add(groupCard.dataset.breedGroupKey);
          }
        }
        updateBreedList();
        if (openedBreedKey) {
          const card = document.getElementById('breedDetail-' + openedBreedKey);
          scrollToElementTop(card, 'smooth', 12);
        }
      }
    });



    app.addEventListener('input', (event) => {
      const costInput = event.target.closest('[data-cost-key]');
      if (costInput) {
        updateCostTotal();
      }
    });

    app.addEventListener('change', (event) => {
      const compareSelect = event.target.closest('.compare-select');
      if (compareSelect) {
        const index = Number(compareSelect.dataset.compareIndex);
        compareState[currentPet][index] = compareSelect.value;
        renderBreeds();
        window.requestAnimationFrame(() => scrollToElementTop(document.getElementById('breedCompareTool'), 'smooth', 8));
        return;
      }

      const matchInput = event.target.closest('[data-match-key]');
      if (matchInput) {
        matchAnswers[currentPet][matchInput.dataset.matchKey] = matchInput.value;
        const resultEl = document.getElementById('matchResult');
        if (resultEl) resultEl.innerHTML = renderMatchResult();
        return;
      }

      const quizInput = event.target.closest('.quiz-option-input');
      if (quizInput) {
        const session = ensureQuizSession();
        session.answers[quizInput.dataset.quizIndex] = Number(quizInput.value);
        if (session.submitted) {
          session.submitted = false;
          session.result = null;
          session.message = '답안을 수정했습니다. 다시 제출하면 새 점수로 계산됩니다.';
          renderQuiz();
        } else {
          session.message = '';
          updateQuizProgress();
        }
        return;
      }

      const input = event.target.closest('.check-input');
      if (!input) return;
      const store = getChecklistStore();
      if (input.checked) store[input.dataset.checkKey] = true;
      else delete store[input.dataset.checkKey];
      saveChecklistStore(store);
      updateChecklistProgress();
    });
  }

  function init() {
    if (!DATA || !app) return;
    bindEvents();
    updateStickyMetrics();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateStickyMetrics).catch(() => {});
    }
    renderHero();
    preventIconDrag();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
