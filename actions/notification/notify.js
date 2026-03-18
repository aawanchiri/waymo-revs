/**
 * 실시간 알림 전송 액션
 * 새 메모 작성/수정 시 관련 사용자에게 알림 발송
 */

const { Core, State } = require('@adobe/aio-sdk');
const fetch = require('node-fetch');

async function main(params) {
  const logger = Core.Logger('notification', { level: params.LOG_LEVEL || 'info' });
  
  try {
    const { event_type, memo_data, user_id } = params;
    
    if (!memo_data || !event_type) {
      return {
        statusCode: 400,
        body: { error: '필수 파라미터가 누락되었습니다' }
      };
    }
    
    // Adobe State 초기화
    const state = await State.init();

    // 알림 대상 사용자 조회
    const targetUsers = await getNotificationTargets(
      state, memo_data.entity_type, memo_data.entity_id, user_id
    );
    
    // 알림 메시지 생성
    const notification = {
      id: generateNotificationId(),
      type: event_type,
      title: getNotificationTitle(event_type, memo_data),
      message: getNotificationMessage(event_type, memo_data),
      memo_id: memo_data.id,
      entity_type: memo_data.entity_type,
      entity_id: memo_data.entity_id,
      created_at: new Date().toISOString(),
      read: false
    };
    
    // 각 대상 사용자에게 알림 전송
    const promises = targetUsers.map(async (targetUserId) => {
      // 사용자별 알림 저장
      const notifKey = `notif_${targetUserId}_${notification.id}`;
      await state.put(notifKey, { ...notification, user_id: targetUserId });

      // 사용자별 알림 인덱스 업데이트
      const indexKey = `notif_index_${targetUserId}`;
      const existing = await state.get(indexKey) || { value: { ids: [] } };
      const ids = existing.value ? existing.value.ids : [];
      ids.push(notification.id);
      await state.put(indexKey, { ids });

      // 실시간 푸시 알림 (WebSocket/SSE)
      await sendRealTimeNotification(targetUserId, notification);
    });

    await Promise.all(promises);
    
    logger.info(`알림 전송 완료: ${targetUsers.length}명`);
    
    return {
      statusCode: 200,
      body: { 
        message: '알림이 성공적으로 전송되었습니다',
        recipients: targetUsers.length
      }
    };
    
  } catch (error) {
    logger.error('알림 전송 오류:', error);
    return {
      statusCode: 500,
      body: { error: '알림 전송 중 오류가 발생했습니다' }
    };
  }
}

// 알림 대상 사용자 조회
async function getNotificationTargets(state, entityType, entityId, authorId) {
  // 해당 엔터티의 메모 인덱스에서 작성자 목록 조회
  const indexKey = `index_${entityType}_${entityId}`;
  const indexData = await state.get(indexKey);
  if (!indexData || !indexData.value || !indexData.value.memoIds) {
    return [];
  }

  // 각 메모에서 작성자를 수집하고 현재 작성자 제외
  const authors = new Set();
  for (const memoId of indexData.value.memoIds) {
    const memo = await state.get(memoId);
    if (memo && memo.value && memo.value.author && memo.value.author !== authorId) {
      authors.add(memo.value.author);
    }
  }

  return Array.from(authors);
}

// 실시간 알림 전송 (예: I/O Events 또는 WebSocket)
async function sendRealTimeNotification(userId, notification) {
  // I/O Events를 통한 실시간 알림 발송
  const eventPayload = {
    event_id: `notification_${notification.id}`,
    event_type: 'memo.notification',
    user_id: userId,
    notification
  };
  
  // Adobe I/O Events API 호출 (실제 구현 시)
  // await publishEvent(eventPayload);
}

// 알림 제목/메시지 생성 함수들
function getNotificationTitle(eventType, memoData) {
  const titles = {
    'memo.created': '새 메모가 작성되었습니다',
    'memo.updated': '메모가 수정되었습니다',
    'memo.deleted': '메모가 삭제되었습니다'
  };
  return titles[eventType] || '메모 알림';
}

function getNotificationMessage(eventType, memoData) {
  return `${memoData.entity_type} #${memoData.entity_id}에 관한 메모가 ${eventType.split('.')[1]}되었습니다.`;
}

function generateNotificationId() {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

exports.main = main;