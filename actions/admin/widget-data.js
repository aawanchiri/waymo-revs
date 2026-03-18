const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');

exports.main = async (params) => {
  const logger = Core.Logger('widget-data', { level: params.LOG_LEVEL || 'info' });

  try {
    const { entityType, entityId } = params;
    
    // 파라미터 검증
    if (!entityType || !entityId) {
      return {
        statusCode: 400,
        body: { error: '필수 파라미터가 누락되었습니다' }
      };
    }

    // State 라이브러리 초기화
    const state = await stateLib.init();
    
    // 엔티티별 메모 조회
    const memoKey = `memo:${entityType}:${entityId}`;
    const memos = await state.get(memoKey) || [];
    
    // Admin Widget용 데이터 가공
    const widgetData = {
      totalCount: memos.length,
      recentMemos: memos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(memo => ({
          id: memo.id,
          content: memo.content.length > 50 
            ? memo.content.substring(0, 50) + '...'
            : memo.content,
          author: memo.author,
          createdAt: memo.createdAt,
          category: memo.category,
          priority: memo.priority
        })),
      categories: [...new Set(memos.map(m => m.category))],
      lastUpdated: memos.length > 0 
        ? Math.max(...memos.map(m => new Date(m.createdAt)))
        : null
    };

    logger.info(`Widget 데이터 조회 완료: ${entityType}-${entityId}`);

    return {
      statusCode: 200,
      body: widgetData
    };

  } catch (error) {
    logger.error('Widget 데이터 조회 오류:', error);
    return {
      statusCode: 500,
      body: { error: 'Widget 데이터 조회 실패' }
    };
  }
};