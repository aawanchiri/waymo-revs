const { Core, State } = require('@adobe/aio-sdk');

/**
 * 메모 목록 조회 액션 - 엔터티별 메모 리스트 및 필터링
 * @param {object} params - 액션 파라미터
 * @returns {object} 메모 목록과 페이지네이션 정보
 */
exports.main = async (params) => {
  const logger = Core.Logger('memo-list');
  
  try {
    const {
      entityType,
      entityId,
      category,
      author,
      dateFrom,
      dateTo,
      q, // 검색 키워드
      page = 1,
      limit = 20
    } = params;
    
    const state = await State.init();
    
    let memoIds = [];
    
    if (entityType && entityId) {
      // 특정 엔터티의 메모 조회
      const indexKey = `index_${entityType}_${entityId}`;
      const index = await state.get(indexKey);
      memoIds = index ? index.memoIds : [];
    } else {
      // 전체 메모 검색 (성능상 제한적)
      return {
        statusCode: 400,
        body: { error: 'entityType과 entityId가 필요합니다' }
      };
    }
    
    // 메모 데이터 조회
    const memos = [];
    for (const memoId of memoIds) {
      const memo = await state.get(memoId);
      if (memo && !memo.deleted) {
        // 필터링 조건 적용
        if (category && memo.category !== category) continue;
        if (author && memo.author !== author) continue;
        if (dateFrom && new Date(memo.createdAt) < new Date(dateFrom)) continue;
        if (dateTo && new Date(memo.createdAt) > new Date(dateTo)) continue;
        
        // 키워드 검색
        if (q) {
          const searchText = `${decrypt(memo.content)} ${memo.category} ${memo.tags.join(' ')}`.toLowerCase();
          if (!searchText.includes(q.toLowerCase())) continue;
        }
        
        // 응답용 데이터 변환 (암호화된 내용 복호화)
        memos.push({
          id: memo.id,
          content: decrypt(memo.content),
          category: memo.category,
          tags: memo.tags,
          visibility: memo.visibility,
          author: memo.author,
          createdAt: memo.createdAt,
          updatedAt: memo.updatedAt
        });
      }
    }
    
    // 날짜순 정렬 (최신순)
    memos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 페이지네이션 적용
    const totalCount = memos.length;
    const startIndex = (page - 1) * limit;
    const paginatedMemos = memos.slice(startIndex, startIndex + limit);
    
    logger.info(`메모 목록 조회: ${totalCount}건 중 ${paginatedMemos.length}건 반환`);
    
    return {
      statusCode: 200,
      body: {
        memos: paginatedMemos,
        totalCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    };
    
  } catch (error) {
    logger.error('메모 목록 조회 실패:', error);
    return {
      statusCode: 500,
      body: { error: '메모 목록 조회에 실패했습니다' }
    };
  }
};

// 복호화 헬퍼
function decrypt(encryptedText) {
  return Buffer.from(encryptedText, 'base64').toString();
}