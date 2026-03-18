const { Core, State } = require('@adobe/aio-sdk');

/**
 * 메모 업데이트 액션 - 기존 메모 내용 및 메타데이터 수정
 * @param {object} params - 액션 파라미터
 * @returns {object} 업데이트된 메모 정보
 */
exports.main = async (params) => {
  const logger = Core.Logger('memo-update');
  
  try {
    const { memoId, content, category, tags, visibility } = params;
    
    if (!memoId) {
      return {
        statusCode: 400,
        body: { error: 'memoId가 필요합니다' }
      };
    }
    
    const state = await State.init();
    
    // 기존 메모 조회
    const existingMemo = await state.get(memoId);
    if (!existingMemo || existingMemo.deleted) {
      return {
        statusCode: 404,
        body: { error: '메모를 찾을 수 없습니다' }
      };
    }
    
    // 권한 검사 (작성자만 수정 가능)
    const currentUser = params.userId || 'system';
    if (existingMemo.author !== currentUser && !params.isAdmin) {
      return {
        statusCode: 403,
        body: { error: '메모 수정 권한이 없습니다' }
      };
    }
    
    // 변경 사항 추적
    const changes = [];
    const updatedMemo = { ...existingMemo };
    
    if (content && content !== decrypt(existingMemo.content)) {
      updatedMemo.content = encrypt(content);
      changes.push('content');
    }
    
    if (category && category !== existingMemo.category) {
      updatedMemo.category = category;
      changes.push('category');
    }
    
    if (tags && JSON.stringify(tags) !== JSON.stringify(existingMemo.tags)) {
      updatedMemo.tags = tags;
      changes.push('tags');
    }
    
    if (visibility && visibility !== existingMemo.visibility) {
      updatedMemo.visibility = visibility;
      changes.push('visibility');
    }
    
    // 변경 사항이 없으면 304 반환
    if (changes.length === 0) {
      return {
        statusCode: 304,
        body: { message: '변경 사항이 없습니다' }
      };
    }
    
    // 업데이트 메타데이터
    updatedMemo.updatedAt = new Date().toISOString();
    updatedMemo.lastModifiedBy = currentUser;
    
    // 변경 이력 추가
    if (!updatedMemo.changeHistory) {
      updatedMemo.changeHistory = [];
    }
    updatedMemo.changeHistory.push({
      timestamp: updatedMemo.updatedAt,
      user: currentUser,
      changes: changes
    });
    
    // Adobe State에 저장
    await state.put(memoId, updatedMemo);
    
    logger.info(`메모 업데이트됨: ${memoId} by ${currentUser}, 변경사항: ${changes.join(', ')}`);
    
    // 실시간 알림 발송
    await sendUpdateNotification({
      type: 'memo.updated',
      memoId,
      changes,
      updatedBy: currentUser,
      entityType: updatedMemo.entityType,
      entityId: updatedMemo.entityId
    });
    
    return {
      statusCode: 200,
      body: {
        memoId,
        updatedAt: updatedMemo.updatedAt,
        changes,
        author: updatedMemo.author,
        lastModifiedBy: currentUser
      }
    };
    
  } catch (error) {
    logger.error('메모 업데이트 실패:', error);
    return {
      statusCode: 500,
      body: { error: '메모 업데이트에 실패했습니다' }
    };
  }
};

// 암호화/복호화 헬퍼
function encrypt(text) {
  return Buffer.from(text).toString('base64');
}

function decrypt(encryptedText) {
  return Buffer.from(encryptedText, 'base64').toString();
}

// 업데이트 알림 헬퍼
async function sendUpdateNotification(data) {
  // Adobe I/O Events API 호출
  // 구현 생략
}