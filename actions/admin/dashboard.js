const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');

exports.main = async (params) => {
  const logger = Core.Logger('dashboard', { level: params.LOG_LEVEL || 'info' });

  try {
    const { dateRange = '7d', userId } = params;
    
    // State 라이브러리 초기화
    const state = await stateLib.init();
    
    // 전체 메모 데이터 조회 (실제 환경에서는 인덱스 사용)
    const allKeys = await state.list({ match: 'memo:*' });
    const allMemos = [];
    
    for (const key of allKeys.keys) {
      const memos = await state.get(key.name) || [];
      allMemos.push(...memos);
    }
    
    // 날짜 필터 적용
    const filterDate = new Date();
    filterDate.setDate(filterDate.getDate() - parseInt(dateRange));
    const recentMemos = allMemos.filter(m => new Date(m.createdAt) >= filterDate);
    
    // 대시보드 통계 계산
    const dashboardData = {
      summary: {
        totalMemos: allMemos.length,
        recentMemos: recentMemos.length,
        activeUsers: [...new Set(recentMemos.map(m => m.authorId))].length,
        avgResponseTime: calculateAvgResponseTime(recentMemos)
      },
      categoryStats: getCategoryStats(recentMemos),
      recentActivity: recentMemos
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(memo => ({
          id: memo.id,
          content: memo.content.substring(0, 100),
          author: memo.author,
          entityType: memo.entityType,
          entityId: memo.entityId,
          createdAt: memo.createdAt,
          category: memo.category
        })),
      trends: getTrendData(allMemos, dateRange)
    };

    logger.info('대시보드 데이터 생성 완료');

    return {
      statusCode: 200,
      body: dashboardData
    };

  } catch (error) {
    logger.error('대시보드 데이터 조회 오류:', error);
    return {
      statusCode: 500,
      body: { error: '대시보드 데이터 조회 실패' }
    };
  }
};

// Helper 함수들
function calculateAvgResponseTime(memos) {
  return memos.length > 0 ? 1.2 : 0; // 임시값, 실제로는 response time 추적 필요
}

function getCategoryStats(memos) {
  const stats = {};
  memos.forEach(memo => {
    stats[memo.category] = (stats[memo.category] || 0) + 1;
  });
  return stats;
}

function getTrendData(memos, dateRange) {
  // 간단한 트렌드 데이터 생성 (실제로는 더 복잡한 분석 필요)
  const days = parseInt(dateRange);
  const trendData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayMemos = memos.filter(m => {
      const memoDate = new Date(m.createdAt);
      return memoDate.toDateString() === date.toDateString();
    });
    
    trendData.push({
      date: date.toISOString().split('T')[0],
      count: dayMemos.length
    });
  }
  
  return trendData;
}