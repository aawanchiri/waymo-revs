/*
 * Waymo Rev - Adobe App Builder 앱
 * 바닐라 테스트용 간단한 프론트엔드
 */
window.onload = () => {
  const app = document.getElementById('root');
  if (app) {
    app.innerHTML = `
      <div style="font-family: Adobe Clean, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; text-align: center;">
        <h1>🚀 waymo-revs</h1>
        <div style="border: 1px solid #ccc; border-radius: 12px; padding: 24px; margin: 20px 0; background-color: #f9f9f9;">
          <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
          <h2>HOORAY! APP COMPLETE</h2>
          <p style="font-size: 13px; color: #888; margin-top: 10px;">
            이 페이지가 보이면 로컬 개발 서버가 정상 작동하는 것입니다.
          </p>
        </div>
        <div id="actions" style="margin-top: 20px;"></div>
      </div>
    `;
    loadActions();
  }
};

async function loadActions() {
  const el = document.getElementById('actions');
  try {
    const res = await fetch('/api/v1/web/waymo-rev/generic');
    const data = await res.json();
    el.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  } catch (e) {
    el.innerHTML = '<p style="color:green;">✅ 앱이 정상적으로 실행 중입니다. 액션 테스트 URL에서 직접 호출하세요.</p>';
  }
}