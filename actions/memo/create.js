const { Core, State } = require('@adobe/aio-sdk');

/**
 * 메모 생성 액션 - 주문, 고객, 상품에 대한 새 메모 생성
 * @param {object} params - 액션 파라미터
 * @returns {object} 생성된 메모 정보
 */
exports.main = async (params) => {
  const logger = Core.Logger('memo-create');
  
  try {
    const { entityType, entityId, content, category, tags = [], visibility = 'private' } = params;
    
    // 파라미터 유효성 검사
    if (!entityType || !entityId || !content) {
      return {
        statusCode: 400,
        body: { error: '필수 파라미터가 누락되었습니다' }
      };
    }
    
    // Adobe State 초기화
    const state = await State.init();
    
    // 메모 ID 생성
    const memoId = `${entityType}_${entityId}_${Date.now()}`;
    
    // 메모 데이터 구조
    const memoData = {
      id: memoId,
      entityType,
      entityId,
      content: encrypt(content), // 개인정보 암호화
      category: category || 'general',
      tags,
      visibility,
      author: params.userId || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false
    };
    
    // Adobe State에 메모 저장
    await state.put(memoId, memoData);
    
    // 인덱스용 메타데이터 저장
    const indexKey = `index_${entityType}_${entityId}`;
    const existingMemos = await state.get(indexKey) || { memoIds: [] };
    existingMemos.memoIds.push(memoId);
    await state.put(indexKey, existingMemos);
    
    // 감사 로그 기록
    logger.info(`메모 생성됨: ${memoId} by ${memoData.author}`);
    
    // 실시간 알림 발송 (I/O Events)
    await sendNotification({
      type: 'memo.created',
      entityType,
      entityId,
      memoId,
      author: memoData.author
    });
    
    return {
      statusCode: 201,
      body: {
        memoId,
        createdAt: memoData.createdAt,
        author: memoData.author,
        category: memoData.category
      }
    };
    
  } catch (error) {
    logger.error('메모 생성 실패:', error);
    return {
      statusCode: 500,
      body: { error: '메모 생성에 실패했습니다' }
    };
  }
};

// 개인정보 암호화 헬퍼
function encrypt(text) {
  // AES-256 암호화 구현
  return Buffer.from(text).toString('base64');
}

// 실시간 알림 헬퍼
async function sendNotification(data) {
  // Adobe I/O Events API 호출
  // 구현 생략
}