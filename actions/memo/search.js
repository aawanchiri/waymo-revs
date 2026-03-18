const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters } = require('../utils')
const stateLib = require('@adobe/aio-lib-state')

exports.main = async function (params) {
  const logger = Core.Logger('memo-search', { level: params.LOG_LEVEL || 'info' })
  
  try {
    const token = getBearerToken(params)
    if (!token) {
      return errorResponse(401, 'Unauthorized - missing token', logger)
    }

    const state = await stateLib.init()
    const { q, category, author, entityType, entityId, limit = 50, offset = 0 } = params
    
    // 메모 검색 및 필터링
    const keys = await state.list({ match: 'memo:*' })
    const memos = []
    
    for (const key of keys.keys) {
      const memo = await state.get(key)
      
      if (!memo || memo.isDeleted) continue
      
      // 필터 적용
      if (entityType && memo.entityType !== entityType) continue
      if (entityId && memo.entityId !== entityId) continue
      if (category && memo.category !== category) continue
      if (author && memo.authorId !== author) continue
      
      // 텍스트 검색
      if (q) {
        const searchText = `${memo.content} ${memo.tags.join(' ')} ${memo.category}`.toLowerCase()
        if (!searchText.includes(q.toLowerCase())) continue
      }
      
      memos.push({
        id: memo.id,
        entityType: memo.entityType,
        entityId: memo.entityId,
        authorId: memo.authorId,
        content: memo.content.substring(0, 200) + (memo.content.length > 200 ? '...' : ''),
        category: memo.category,
        tags: memo.tags,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt
      })
    }
    
    // 날짜 기준 정렬 (최신순)
    memos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const paginatedMemos = memos.slice(offset, offset + parseInt(limit))
    
    logger.info(`Search returned ${paginatedMemos.length} memos`)
    
    return {
      statusCode: 200,
      body: {
        memos: paginatedMemos,
        totalCount: memos.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + parseInt(limit) < memos.length
        }
      }
    }
    
  } catch (error) {
    logger.error('Error searching memos:', error)
    return errorResponse(500, 'Internal server error', logger)
  }
}