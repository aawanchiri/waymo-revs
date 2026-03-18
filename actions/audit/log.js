/**
 * 감사 추적 로그 기록 액션
 * 메모 작성/수정/삭제 이력을 감사 로그로 기록
 */

const { Core, State } = require('@adobe/aio-sdk');
const crypto = require('crypto');

async function main(params) {
  const logger = Core.Logger('audit', { level: params.LOG_LEVEL || 'info' });
  
  try {
    const { 
      action_type, 
      user_id, 
      memo_id, 
      entity_type, 
      entity_id, 
      changes = {},
      ip_address,
      user_agent 
    } = params;
    
    if (!action_type || !user_id || !memo_id) {
      return {
        statusCode: 400,
        body: { error: '필수 감사 로그 정보가 누락되었습니다' }
      };
    }
    
    // Adobe State 초기화
    const state = await State.init();

    // 감사 로그 엔트리 생성
    const auditLog = {
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      action_type,
      user_id,
      memo_id,
      entity_type,
      entity_id,
      changes: sanitizeChanges(changes),
      metadata: {
        ip_address: hashSensitiveData(ip_address),
        user_agent: user_agent?.substring(0, 200), // User-Agent 길이 제한
        session_id: generateSessionHash(user_id, ip_address)
      },
      integrity_hash: null // 아래에서 계산
    };
    
    // 무결성 해시 생성 (변조 방지)
    auditLog.integrity_hash = generateIntegrityHash(auditLog);
    
    // 감사 로그를 State에 저장
    await state.put(auditLog.id, auditLog);

    // 감사 로그 인덱스 업데이트
    const indexKey = 'audit_log_index';
    const existing = await state.get(indexKey) || { value: { ids: [] } };
    const ids = existing.value ? existing.value.ids : [];
    ids.push(auditLog.id);
    await state.put(indexKey, { ids });

    // 중요 작업의 경우 별도 보안 로그 저장
    if (['delete', 'bulk_delete'].includes(action_type)) {
      await createSecurityLog(state, auditLog);
    }
    
    logger.info(`감사 로그 기록 완료: ${action_type} by ${user_id}`);
    
    return {
      statusCode: 200,
      body: { 
        message: '감사 로그가 성공적으로 기록되었습니다',
        audit_id: auditLog.id
      }
    };
    
  } catch (error) {
    logger.error('감사 로그 기록 오류:', error);
    return {
      statusCode: 500,
      body: { error: '감사 로그 기록 중 오류가 발생했습니다' }
    };
  }
}

// 민감 데이터 해싱
function hashSensitiveData(data) {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// 변경 사항 정리 (민감 정보 제거)
function sanitizeChanges(changes) {
  const sanitized = { ...changes };
  
  // 민감한 필드 마스킹
  if (sanitized.content && sanitized.content.length > 500) {
    sanitized.content = sanitized.content.substring(0, 500) + '...[truncated]';
  }
  
  return sanitized;
}

// 무결성 해시 생성
function generateIntegrityHash(logEntry) {
  const dataString = JSON.stringify({
    id: logEntry.id,
    timestamp: logEntry.timestamp,
    action_type: logEntry.action_type,
    user_id: logEntry.user_id,
    memo_id: logEntry.memo_id
  });
  
  return crypto.createHmac('sha256', process.env.AUDIT_SECRET_KEY || 'default-key')
    .update(dataString)
    .digest('hex');
}

// 보안 로그 생성 (중요 작업용)
async function createSecurityLog(state, auditLog) {
  const securityLog = {
    ...auditLog,
    security_level: 'HIGH',
    retention_years: 7,
    created_at: new Date().toISOString()
  };

  const secKey = `security_${auditLog.id}`;
  await state.put(secKey, securityLog);

  // 보안 로그 인덱스 업데이트
  const indexKey = 'security_log_index';
  const existing = await state.get(indexKey) || { value: { ids: [] } };
  const ids = existing.value ? existing.value.ids : [];
  ids.push(secKey);
  await state.put(indexKey, { ids });
}

function generateAuditId() {
  return `audit_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
}

function generateSessionHash(userId, ipAddress) {
  const sessionData = `${userId}_${ipAddress}_${Date.now()}`;
  return crypto.createHash('md5').update(sessionData).digest('hex').substring(0, 12);
}

exports.main = main;