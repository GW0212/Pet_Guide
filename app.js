(() => {
  'use strict';

  const DATA = window.PET_DATA;
  const TABS = ['breeds', 'likes', 'dislikes', 'food', 'care', 'checklist', 'quiz', 'behavior'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let currentPet = 'dog';
  let currentTab = 'breeds';
  let breedQuery = '';
  let openedBreedKey = '';
  let isComposing = false;
  const quizState = { dog: null, cat: null };

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

  function scrollToContentTop(behavior = 'smooth') {
    if (!app) return;
    window.requestAnimationFrame(() => {
      const targetTop = app.getBoundingClientRect().top + window.pageYOffset - getStickyOffset();
      window.scrollTo({ top: Math.max(0, targetTop), behavior });
    });
  }

  function setActiveButtons() {
    $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.pet === currentPet));
    const quizBtn = $('.tab-btn[data-tab="quiz"]');
    if (quizBtn) quizBtn.textContent = DATA[currentPet].theme.emoji + ' 관련 지식 테스트';
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
        result.push({ name: group.name, desc: group.desc, breeds });
      }
    });
    return result;
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
        '<div class="breed-detail-grid">' +
          '<div class="breed-fact"><strong>분류</strong><span>' + escapeHTML(groupName) + '</span></div>' +
          '<div class="breed-fact"><strong>핵심 특징</strong><span>' + escapeHTML(profile) + '</span></div>' +
          '<div class="breed-fact"><strong>돌봄 포인트</strong><span>' + escapeHTML(care) + '</span></div>' +
          '<div class="breed-fact"><strong>건강 주의</strong><span>' + escapeHTML(health) + '</span></div>' +
          '<div class="breed-fact"><strong>참고</strong><span>' + escapeHTML(note) + '</span></div>' +
        '</div>' +
      '</article>';
  }

  function breedListMarkup() {
    const groups = getFilteredBreedGroups();
    if (!groups.length) {
      return '<div class="notice"><strong>검색 결과가 없습니다.</strong><br />품종명을 다시 확인해 주세요. 예: 푸들, 진돗개, 샴</div>';
    }

    return groups.map((group) => {
      const opened = group.breeds.find((item) => item.key === openedBreedKey);
      const chips = group.breeds.map((item) => {
        const active = openedBreedKey === item.key ? ' active' : '';
        return '<button class="chip' + active + '" type="button" data-breed-key="' + escapeHTML(item.key) + '" aria-expanded="' + (openedBreedKey === item.key ? 'true' : 'false') + '">' + escapeHTML(getBreedName(item.breed)) + '</button>';
      }).join('');

      if (opened) opened.groupName = group.name;

      return '' +
        '<section class="breed-list-card">' +
          '<h3>' + escapeHTML(group.name) + '</h3>' +
          '<p>' + escapeHTML(group.desc) + '</p>' +
          '<div class="chips">' + chips + '</div>' +
          (opened ? breedDetailCard(opened) : '') +
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

  function renderBreeds() {
    const pet = DATA[currentPet];
    app.innerHTML = '' +
      sectionHeader('🏷️', pet.theme.label + ' 품종 & 특징', pet.theme.label + ' 품종을 한국어 목록으로 정리했습니다', pet.breedBasis) +
      '<div class="source-box"><strong>사용 방법:</strong> 품종 버튼을 누르면 상세 정보 카드가 펼쳐집니다. 같은 버튼을 다시 누르거나 카드 우측 상단 × 버튼을 누르면 닫힙니다.</div>' +
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
      scrollToContentTop('smooth');
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
      '<div class="quiz-toolbar step-toolbar">' +
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

  function renderCards(section) {
    app.innerHTML = '' +
      sectionHeader(section.icon, section.kicker, section.title, '') +
      '<div class="info-grid">' + section.cards.map((card) => (
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
      )).join('') + '</div>' +
      '<div class="notice"><strong>실전 기준:</strong> 정보는 학습용 기본값입니다. 통증, 식욕 저하, 반복 구토, 호흡 이상, 배뇨 문제, 갑작스러운 공격성처럼 평소와 다른 변화가 보이면 인터넷 정보보다 진료가 우선입니다.</div>';
  }

  function render() {
    setActiveButtons();
    updateStickyMetrics();
    if (currentTab === 'breeds') {
      renderBreeds();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'checklist') {
      renderChecklist();
      updateStickyMetrics();
      return;
    }
    if (currentTab === 'quiz') {
      renderQuiz();
      updateStickyMetrics();
      return;
    }
    renderCards(DATA[currentPet].sections[currentTab]);
    updateStickyMetrics();
  }

  function resetHome() {
    currentPet = 'dog';
    currentTab = 'breeds';
    breedQuery = '';
    openedBreedKey = '';
    document.body.className = 'dog-mode';
    renderHero();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setPet(pet) {
    if (!DATA[pet]) return;
    currentPet = pet;
    currentTab = 'breeds';
    breedQuery = '';
    openedBreedKey = '';
    document.body.className = pet + '-mode';
    renderHero();
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

  function bindEvents() {
    window.addEventListener('resize', updateStickyMetrics);
    window.addEventListener('orientationchange', updateStickyMetrics);
    window.addEventListener('scroll', updateStickyMetrics, { passive: true });
    const homeLogo = $('#homeLogo');
    if (homeLogo) homeLogo.addEventListener('click', resetHome);
    $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => setPet(btn.dataset.pet)));
    $$('.tab-btn').forEach((btn) => btn.addEventListener('click', (event) => {
      event.preventDefault();
      setTab(btn.dataset.tab);
    }));

    $('#backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

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

      const quizPrevBtn = event.target.closest('[data-quiz-prev]');
      if (quizPrevBtn) {
        const session = ensureQuizSession();
        session.currentIndex = Math.max(0, (session.currentIndex || 0) - 1);
        session.message = '';
        renderQuiz();
        scrollToContentTop('smooth');
        return;
      }

      const quizNextBtn = event.target.closest('[data-quiz-next]');
      if (quizNextBtn) {
        const session = ensureQuizSession();
        session.currentIndex = Math.min(session.items.length - 1, (session.currentIndex || 0) + 1);
        session.message = '';
        renderQuiz();
        scrollToContentTop('smooth');
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
          scrollToContentTop('smooth');
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
        updateBreedList();
        if (openedBreedKey) {
          window.requestAnimationFrame(() => {
            const card = document.getElementById('breedDetail-' + openedBreedKey);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
      }
    });

    app.addEventListener('change', (event) => {
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
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
