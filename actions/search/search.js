/**
 * Elasticsearch 기반 메모 전문 검색 액션
 * 키워드, 날짜, 작성자 기반 검색 및 하이라이팅 기능 제공
 */

const { Core, State } = require('@adobe/aio-sdk');
const fetch = require('node-fetch');

async function main(params) {
  const logger = Core.Logger('search', { level: params.LOG_LEVEL || 'info' });
  
  try {
    const { query, filters = {}, page = 1, limit = 20 } = params;

    // Adobe State 초기화
    const state = await State.init();

    // State에서 메모 검색 인덱스 조회
    const searchIndex = await state.get('search_index');
    const allMemoIds = (searchIndex && searchIndex.value && searchIndex.value.ids) ? searchIndex.value.ids : [];

    // 모든 메모 로드 및 필터링
    const allMemos = [];
    for (const memoId of allMemoIds) {
      const memo = await state.get(memoId);
      if (memo && memo.value && !memo.value.deleted) {
        allMemos.push({ id: memoId, ...memo.value });
      }
    }

    // 키워드 검색 필터링
    let filtered = allMemos;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(m =>
        (m.content && m.content.toLowerCase().includes(lowerQuery)) ||
        (m.title && m.title.toLowerCase().includes(lowerQuery)) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(lowerQuery)))
      );
    }

    // 필터 적용
    filtered = applyFilters(filtered, filters);

    // 날짜 내림차순 정렬
    filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // 페이지네이션
    const total = filtered.length;
    const start = (page - 1) * limit;
    const memos = filtered.slice(start, start + limit);

    logger.info(`검색 완료: ${total}개 결과`);

    return {
      statusCode: 200,
      body: {
        memos,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
    
  } catch (error) {
    logger.error('검색 오류:', error);
    return {
      statusCode: 500,
      body: { error: '검색 처리 중 오류가 발생했습니다' }
    };
  }
}

// 필터 조건 적용 함수
function applyFilters(memos, filters) {
  let result = memos;

  if (filters.author) {
    result = result.filter(m => m.author === filters.author);
  }
  if (filters.category) {
    result = result.filter(m => m.category === filters.category);
  }
  if (filters.entity_type) {
    result = result.filter(m => m.entityType === filters.entity_type);
  }
  if (filters.date_from) {
    result = result.filter(m => m.createdAt >= filters.date_from);
  }
  if (filters.date_to) {
    result = result.filter(m => m.createdAt <= filters.date_to);
  }

  return result;
}

exports.main = main;