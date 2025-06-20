document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const avatarInfoDiv = document.getElementById('avatar-info');
  const avatarImg = document.getElementById('avatar-img');
  const avatarText = document.getElementById('avatar-text');

  try {
    // 현재 활성 탭 가져오기
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Content script에서 상태 정보 가져오기
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
    
    if (result && result.success) {
      statusDiv.textContent = '✅ 확장 프로그램이 활성화되었습니다';
      statusDiv.className = 'status active';
      
      if (result.avatarSrc) {
        avatarInfoDiv.style.display = 'block';
        avatarImg.src = result.avatarSrc;
        avatarText.textContent = '아바타가 감지되었습니다';
      }
    } else {
      statusDiv.textContent = '⚠️ 이 페이지에서는 사용할 수 없습니다';
      statusDiv.className = 'status inactive';
    }
  } catch (error) {
    statusDiv.textContent = '❌ 확장 프로그램 오류가 발생했습니다';
    statusDiv.className = 'status inactive';
    console.error('Popup error:', error);
  }
}); 