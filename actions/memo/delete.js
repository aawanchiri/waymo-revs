const { Core, State } = require('@adobe/aio-sdk');

/**
 * 메모 삭제 액션 - 소프트 삭제 및 감사 로그 기록
 * @param {object} params - 액션 파라미터
 * @returns {object} 삭제 처리 결과
 */
exports.main = async (params) => {
  const logger = Core.Logger('memo-delete');
  
  try {
    const { memoId, reason = '사용자 요청' } = params;
    
    if (!memoId) {
      return {
        statusCode: 400,
        body: { error: 'memoId가 필요합니다' }
      };
    }
    
    const state = await State.init();
    
    // 기존 메모 조회
    const existingMemo = await state.get(memoId);
    if (!existingMemo) {
      return {
        statusCode: 404,
        body: { error: '메모를 찾을 수 없습니다' }
      };
    }
    
    if (existingMemo.deleted) {
      return {
        statusCode: 409,
        body: { error: '이미 삭제된 메모입니다' }
      };
    }
    
    // 권한 검사 (작성자 또는 관리자만 삭제 가능)
    const currentUser = params.userId || 'system';
    if (existingMemo.author !== currentUser && !params.isAdmin) {
      return {
        statusCode: 403,
        body: { error: '메모 삭제 권한이 없습니다' }
      };
    }
    
    // 소프트 삭제 처리
    const deletedMemo = {
      ...existingMemo,
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser,
      deleteReason: reason
    };
    
    // 변경 이력 추가
    if (!deletedMemo.changeHistory) {
      deletedMemo.changeHistory = [];
    }
    deletedMemo.changeHistory.push({
      timestamp: deletedMemo.deletedAt,
      user: currentUser,
      changes: ['deleted'],
      reason
    });
    
    // Adobe State에 업데이트 (완전 삭제하지 않고 deleted 플래그 설정)
    await state.put(memoId, deletedMemo);
    
    // 인덱스에서 제거
    const indexKey = `index_${existingMemo.entityType}_${existingMemo.entityId}`;
    const index = await state.get(indexKey);
    if (index && index.memoIds) {
      index.memoIds = index.memoIds.filter(id => id !== memoId);
      await state.put(indexKey, index);
    }
    
    // 감사 로그 기록
    logger.info(`메모 삭제됨: ${memoId} by ${currentUser}, 사유: ${reason}`);
    
    // 삭제 감사 로그를 별도 저장소에 기록
    const auditLog = {
      action: 'memo.deleted',
      memoId,
      entityType: existingMemo.entityType,
      entityId: existingMemo.entityId,
      deletedBy: currentUser,
      deletedAt: deletedMemo.deletedAt,
      reason,
      originalAuthor: existingMemo.author,
      createdAt: existingMemo.createdAt
    };
    
    await state.put(`audit_${memoId}_${Date.now()}`, auditLog);
    
    // 실시간 알림 발송
    await sendDeleteNotification({
      type: 'memo.deleted',
      memoId,
      deletedBy: currentUser,
      entityType: existingMemo.entityType,
      entityId: existingMemo.entityId,
      originalAuthor: existingMemo.author
    });
    
    return {
      statusCode: 200,
      body: {
        message: '메모가 성공적으로 삭제되었습니다',
        memoId,
        deletedAt: deletedMemo.deletedAt,
        deletedBy: currentUser
      }
    };
    
  } catch (error) {
    logger.error('메모 삭제 실패:', error);
    return {
      statusCode: 500,
      body: { error: '메모 삭제에 실패했습니다' }
    };
  }
};

// 삭제 알림 헬퍼
async function sendDeleteNotification(data) {
  // Adobe I/O Events API 호출
  // 구현 생략
}