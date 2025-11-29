class ChatExtension {
  constructor() {
    this.myAvatarSrc = null;
    this.observer = null;
    this.replyState = {
      isReplying: false,
      targetUser: null,
      targetMessage: null,
      replyUI: null
    };
    this.originalTextareaValue = '';
    this.isUserInput = false; // 사용자 직접 입력 판정 플래그
    this.isResizing = false; // 전역 리사이즈 상태 추적
    this.transparencyCheckbox = null; // 투명도 체크박스 참조
    this.isChatTransparent = false; // 투명도 상태
    // 이미지 ASCII 변환을 위한 Unicode 블록 문자들 (밝기 순)
    this.blockChars = {
      quadrants: [
        ' ',  // 0000 - 완전 검정
        '▗', // 0001 - bottom right
        '▖', // 0010 - bottom left  
        '▄', // 0011 - bottom half
        '▝', // 0100 - top right
        '▐', // 0101 - right half
        '▞', // 0110 - top right + bottom left
        '▟', // 0111 - bottom + top right
        '▘', // 1000 - top left
        '▚', // 1001 - top left + bottom right
        '▌', // 1010 - left half
        '▙', // 1011 - left + bottom right
        '▀', // 1100 - top half
        '▜', // 1101 - top + bottom right
        '▛', // 1110 - top + bottom left
        '█'  // 1111 - full block
      ]
    };
    this.init();
  }

  init() {
    console.log('채팅 플러스 확장 프로그램이 시작되었습니다.');
    
    // 초기 실행
    this.detectMyAvatar();
    this.processExistingChats();
    this.setupReplyFeature();
    this.setupImageAsciiFeature(); // 이미지 ASCII 기능 추가
    this.setupResizableDraggable(); // 리사이즈 가능한 드래그 컴포넌트 추가
    this.setupTransparencyFeature(); // 투명도 기능 추가
    
    // DOM 변화 감지를 위한 MutationObserver 설정
    this.setupObserver();
  }

  // 내 아바타 감지
  detectMyAvatar() {
    const myButton = document.querySelector('a[role="button"].my.css-19ffkn8.eayh7zq5');
    
    if (myButton) {
      const avatarImg = myButton.querySelector('img');
      if (avatarImg && avatarImg.src) {
        const newAvatarSrc = avatarImg.src;
        
        // 아바타가 변경되었는지 확인
        if (this.myAvatarSrc !== newAvatarSrc) {
          this.myAvatarSrc = newAvatarSrc;
          console.log('내 아바타 감지됨:', this.myAvatarSrc);
          
          // 아바타가 변경되었으므로 모든 채팅을 다시 처리
          this.processAllChats();
        }
      }
    }
  }

  // 기존 채팅들 처리
  processExistingChats() {
    if (!this.myAvatarSrc) return;
    
    const chatContainers = document.querySelectorAll('div[opacity="0.25"].css-1ad1slj.e4nn04i0');
    chatContainers.forEach(container => {
      this.processChatContainer(container);
    });
  }

  // 모든 채팅 다시 처리 (아바타 변경 시)
  processAllChats() {
    // 기존 my-chat 클래스 제거 (span 요소들에서)
    const existingMyChats = document.querySelectorAll('p.message span.my-chat');
    existingMyChats.forEach(span => {
      span.classList.remove('my-chat');
    });
    
    // 기존 답장 처리 제거 (재처리를 위해)
    const existingReplyProcessed = document.querySelectorAll('p.message span.reply-processed');
    existingReplyProcessed.forEach(span => {
      span.classList.remove('reply-processed');
      
      // 답장 표기 요소 제거
      const messageParagraph = span.parentElement;
      if (messageParagraph && messageParagraph.classList.contains('message')) {
        const replyIndicator = messageParagraph.querySelector('.reply-indicator');
        if (replyIndicator) {
          // 원본 답장 텍스트 복원
          const userSpan = replyIndicator.querySelector('.reply-target-user');
          const messageSpan = replyIndicator.querySelector('.reply-target-message');
          
          if (userSpan && messageSpan) {
            const user = userSpan.textContent;
            const message = messageSpan.textContent;
            const currentText = span.textContent;
            
            // 답장 텍스트를 다시 추가
            span.textContent = `[||${user}님의 채팅 ${message}에 답장||]${currentText}`;
          }
          
          // 답장 표기 요소 제거
          replyIndicator.remove();
        }
      }
    });
    
    // 다시 처리
    this.processExistingChats();
  }

  // 채팅 컨테이너 처리
  processChatContainer(container) {
    if (!this.myAvatarSrc) return;

    const elements = Array.from(container.children);
    let currentAvatarSrc = null;
    
    for (const element of elements) {
      // 아바타 div 확인
      if (element.classList.contains('css-1vl0v4w') && element.classList.contains('e4nn04i1')) {
        const avatarImg = element.querySelector('img');
        if (avatarImg && avatarImg.src) {
          currentAvatarSrc = avatarImg.src;
        }
      }
      // 채팅 div 확인
      else if (element.classList.contains('css-qjh7qy') && element.classList.contains('e4nn04i2')) {
        // 채팅 메시지 안의 span 찾기
        const messageSpan = element.querySelector('p.message span');
        
        if (messageSpan) {
          if (currentAvatarSrc === this.myAvatarSrc) {
            // 내 메시지이므로 span에 my-chat 클래스 추가
            if (!messageSpan.classList.contains('my-chat')) {
              messageSpan.classList.add('my-chat');
              console.log('내 메시지 span에 my-chat 클래스 추가됨');
            }
          } else {
            // 다른 사람 메시지이므로 span에서 my-chat 클래스 제거 (있다면)
            if (messageSpan.classList.contains('my-chat')) {
              messageSpan.classList.remove('my-chat');
            }
          }
          
          // 답장 메시지 처리 (모든 메시지에 대해)
          this.processReplyMessage(messageSpan);
        }
      }
    }
  }

  // 답장 메시지 처리
  processReplyMessage(messageSpan) {
    const messageText = messageSpan.textContent;
    
    // 답장 텍스트 패턴 감지: [||사용자명님의 채팅 메시지내용에 답장||]
    const replyPattern = /\[\|\|(.+?)님의 채팅 (.+?)에 답장\|\|\]/;
    const match = messageText.match(replyPattern);
    
    if (match) {
      // 이미 처리된 답장 메시지인지 확인
      if (messageSpan.classList.contains('reply-processed')) {
        return;
      }
      
      const referencedUser = match[1];
      const referencedMessage = match[2];
      const fullReplyText = match[0];
      
      // 실제 메시지 내용 추출 (답장 텍스트 제거)
      const actualMessage = messageText.replace(fullReplyText, '').trim();
      
      console.log('답장 메시지 감지됨:', {
        user: referencedUser,
        referencedMessage: referencedMessage,
        actualMessage: actualMessage
      });
      
      // 메시지 내용에서 답장 텍스트만 제거
      messageSpan.textContent = actualMessage;
      
      // p.message 요소 찾기 (messageSpan의 부모)
      const messageParagraph = messageSpan.parentElement;
      if (messageParagraph && messageParagraph.classList.contains('message')) {
        // 이미 답장 표기가 있는지 확인
        if (!messageParagraph.querySelector('.reply-indicator')) {
          // 답장 표기 요소 생성
          const replyIndicator = document.createElement('div');
          replyIndicator.className = 'reply-indicator';
          replyIndicator.innerHTML = `
            <div class="reply-badge">↩ 답장</div>
            <div class="reply-info">
              <div class="reply-target-user">${referencedUser}</div>님의 "<div class="reply-target-message">${referencedMessage}</div>"에 답장
            </div>
          `;
          
          // p.message 맨 앞에 삽입
          messageParagraph.insertBefore(replyIndicator, messageSpan);
        }
      }
      
      messageSpan.classList.add('reply-processed');
      console.log('답장 메시지 스타일 적용 완료');
      
      // 두 요소의 가로 길이를 맞춤
      this.adjustReplyElementsWidth(messageParagraph);
    }
  }

  // 답장 요소들의 가로 길이 조정
  adjustReplyElementsWidth(messageParagraph) {
    const replyIndicator = messageParagraph.querySelector('.reply-indicator');
    const replyProcessedSpan = messageParagraph.querySelector('.reply-processed');
    
    if (!replyIndicator || !replyProcessedSpan) return;
    
    // 잠시 기다린 후 크기 측정 (렌더링 완료 후)
    setTimeout(() => {
      // 먼저 너비를 초기화
      replyIndicator.style.width = '';
      replyProcessedSpan.style.width = '';
      
      // 강제로 리플로우 발생시키기
      replyIndicator.offsetHeight;
      replyProcessedSpan.offsetHeight;
      
      // 각 요소의 실제 너비 측정 (content + padding + border)
      const indicatorRect = replyIndicator.getBoundingClientRect();
      const processedRect = replyProcessedSpan.getBoundingClientRect();
      
      const indicatorWidth = indicatorRect.width;
      const processedWidth = processedRect.width;
      
      // 더 긴 너비 선택
      const maxWidth = Math.max(indicatorWidth, processedWidth);
      
      // 두 요소 모두 동일한 너비로 설정 (box-sizing: border-box이므로 전체 너비)
      replyIndicator.style.width = maxWidth + 'px';
      replyProcessedSpan.style.width = maxWidth + 'px';
      
      console.log('답장 요소 너비 조정 완료:', { indicatorWidth, processedWidth, maxWidth });
    }, 50);
  }

  // MutationObserver 설정
  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      
      mutations.forEach((mutation) => {
        // 새로운 노드가 추가되었는지 확인
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 내 아바타 버튼이 추가되었는지 확인
              if (node.matches && node.matches('a[role="button"].my.css-19ffkn8.eayh7zq5')) {
                needsUpdate = true;
              }
                             // 채팅 컨테이너가 추가되었는지 확인
               else if (node.matches && node.matches('div[opacity="0.25"].css-1ad1slj.e4nn04i0')) {
                 this.processChatContainer(node);
                 this.addReplyButtonsToContainer(node);
                 
                 // 투명도가 활성화되어 있으면 적용
                 if (this.isChatTransparent) {
                   node.style.setProperty('background', 'transparent', 'important');
                   node.style.setProperty('background-color', 'transparent', 'important');
                 }
                 
                 // 답장 모드 중이라면 자신의 채팅인지 확인
                 if (this.replyState.isReplying) {
                   this.checkIfMyNewChat(node);
                 }
               }
                                                            // 채팅 메시지가 추가되었는지 확인
               else if (node.matches && node.matches('div.css-qjh7qy.e4nn04i2')) {
                 // 부모 컨테이너 찾아서 처리
                 const container = node.closest('div[opacity="0.25"].css-1ad1slj.e4nn04i0');
                 if (container) {
                   this.processChatContainer(container);
                   this.addReplyButtonsToContainer(container);
                   
                   // 답장 모드 중이라면 자신의 채팅인지 확인
                   if (this.replyState.isReplying) {
                     this.checkIfMyNewChat(container);
                   }
                 }
               }
                             // 아바타 div가 추가되었는지 확인
               else if (node.matches && node.matches('div.css-1vl0v4w.e4nn04i1')) {
                 const container = node.closest('div[opacity="0.25"].css-1ad1slj.e4nn04i0');
                 if (container) {
                   this.processChatContainer(container);
                   this.addReplyButtonsToContainer(container);
                 }
               }
               // 이미지 버튼 대상 요소가 추가되었는지 확인
               else if (node.matches && node.matches('div.css-15ws93w.eeo291g1')) {
                 this.addImageButtonToElement(node);
               }
               // draggable 요소가 추가되었는지 확인
               else if (node.matches && node.matches('.react-draggable.css-e7o6ze')) {
                 this.addResizeFunctionalityToElement(node);
               }
               // 채팅 슬라이더 바가 추가되었는지 확인 (투명도 기능용)
               else if (node.matches && node.matches('.chatting_slider_bar.css-ezaneu.ea1elk92')) {
                 this.addTransparencyCheckboxIfNeeded();
               }
              
              // 하위 요소들도 확인
              if (node.querySelector) {
                if (node.querySelector('a[role="button"].my.css-19ffkn8.eayh7zq5')) {
                  needsUpdate = true;
                }
                                 if (node.querySelector('div[opacity="0.25"].css-1ad1slj.e4nn04i0')) {
                   const containers = node.querySelectorAll('div[opacity="0.25"].css-1ad1slj.e4nn04i0');
                   containers.forEach(container => {
                     this.processChatContainer(container);
                     this.addReplyButtonsToContainer(container);
                     
                     // 투명도가 활성화되어 있으면 적용
                     if (this.isChatTransparent) {
                       container.style.setProperty('background', 'transparent', 'important');
                       container.style.setProperty('background-color', 'transparent', 'important');
                     }
                   });
                 }
                 
                 // 이미지 버튼 대상 요소 확인
                 if (node.querySelector('div.css-15ws93w.eeo291g1')) {
                   const targetElements = node.querySelectorAll('div.css-15ws93w.eeo291g1');
                   targetElements.forEach(element => {
                     this.addImageButtonToElement(element);
                   });
                 }
                 
                 // draggable 요소 확인
                 if (node.querySelector('.react-draggable.css-e7o6ze')) {
                   const draggableElements = node.querySelectorAll('.react-draggable.css-e7o6ze');
                   draggableElements.forEach(element => {
                     this.addResizeFunctionalityToElement(element);
                   });
                 }
                 
                 // 채팅 슬라이더 바 확인 (투명도 기능용)
                 if (node.querySelector('.chatting_slider_bar.css-ezaneu.ea1elk92')) {
                   this.addTransparencyCheckboxIfNeeded();
                 }
              }
            }
          });
        }
        
        // 속성 변경 확인 (아바타 이미지 src 변경 등)
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.tagName === 'IMG' && target.closest('a[role="button"].my.css-19ffkn8.eayh7zq5')) {
            needsUpdate = true;
          }
        }
      });
      
      if (needsUpdate) {
        // 내 아바타 다시 감지
        this.detectMyAvatar();
      }
    });

    // 전체 document 감시
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  // 답글 기능 설정
  setupReplyFeature() {
    // 기존 채팅에 답글 버튼 추가
    this.addReplyButtonsToExistingChats();
    
    // textarea 모니터링 설정
    this.setupTextareaMonitoring();
  }

  // 기존 채팅에 답글 버튼 추가
  addReplyButtonsToExistingChats() {
    const chatContainers = document.querySelectorAll('div[opacity="0.25"].css-1ad1slj.e4nn04i0');
    chatContainers.forEach(container => {
      this.addReplyButtonsToContainer(container);
    });
  }

  // 컨테이너에 답글 버튼 추가
  addReplyButtonsToContainer(container) {
    const elements = Array.from(container.children);
    let currentUser = null;
    let currentAvatarSrc = null;
    
    for (const element of elements) {
      // 아바타 div 확인
      if (element.classList.contains('css-1vl0v4w') && element.classList.contains('e4nn04i1')) {
        const avatarImg = element.querySelector('img');
        const userNameElement = element.querySelector('.inner_name');
        
        if (avatarImg && avatarImg.src && userNameElement) {
          currentAvatarSrc = avatarImg.src;
          currentUser = userNameElement.textContent.trim();
        }
      }
      // 채팅 div 확인
      else if (element.classList.contains('css-qjh7qy') && element.classList.contains('e4nn04i2')) {
        // 내 메시지가 아닌 경우에만 답글 버튼 추가
        if (currentAvatarSrc && currentAvatarSrc !== this.myAvatarSrc && currentUser) {
          this.addReplyButtonToMessage(element, currentUser, currentAvatarSrc);
        }
      }
    }
  }

  // 메시지에 답글 버튼 추가
  addReplyButtonToMessage(messageElement, userName, avatarSrc) {
    // 이미 답글 버튼이 있으면 추가하지 않음
    if (messageElement.querySelector('.reply-button')) return;
    
    // 메시지 span 찾기
    const messageSpan = messageElement.querySelector('p.message span');
    if (!messageSpan) return;
    
    // 메시지 내용 추출
    const messageContent = messageSpan.textContent.trim();
    
    // p.message 요소를 컨테이너로 만들기
    const messageParagraph = messageElement.querySelector('p.message');
    if (!messageParagraph) return;
    
    messageParagraph.classList.add('chat-message-container');
    
    // 답글 버튼 생성
    const replyButton = document.createElement('button');
    replyButton.className = 'reply-button';
    replyButton.innerHTML = '↩';
    replyButton.title = '답글';
    
    // 클릭 이벤트 추가
    replyButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startReply(userName, messageContent);
    });
    
    // p.message 요소에 답글 버튼 추가 (span 바로 옆에 위치)
    messageParagraph.appendChild(replyButton);
  }

  // 답글 시작
  startReply(userName, messageContent) {
    // 이미 답글 중이면 기존 답글 취소
    if (this.replyState.isReplying) {
      this.cancelReply();
    }
    
    this.replyState.isReplying = true;
    this.replyState.targetUser = userName;
    this.replyState.targetMessage = messageContent;
    
    // 답글 UI 생성
    this.createReplyUI();
    
    // textarea에 답글 텍스트 추가
    this.addReplyTextToTextarea();
    
    console.log(`${userName}님의 메시지에 답글 시작:`, messageContent);
  }

  // 답글 UI 생성
  createReplyUI() {
    // 기존 UI 제거
    if (this.replyState.replyUI) {
      this.replyState.replyUI.remove();
    }
    
    // 대상 요소 찾기
    const targetElement = document.querySelector('div.css-1nanq3g.ea1elk96');
    if (!targetElement) {
      console.warn('대상 요소를 찾을 수 없습니다.');
      return;
    }
    
    const replyUI = document.createElement('div');
    replyUI.className = 'reply-ui';
    
    replyUI.innerHTML = `
      <div class="reply-ui-content">
        <span class="reply-target-user">${this.replyState.targetUser}</span>님의 채팅 <span class="reply-target-message">${this.replyState.targetMessage}</span>에 답장
      </div>
      <button class="reply-ui-close">×</button>
    `;
    
    // 닫기 버튼 이벤트
    const closeButton = replyUI.querySelector('.reply-ui-close');
    closeButton.addEventListener('click', () => {
      this.cancelReply();
    });
    
    // 대상 요소 앞에 삽입
    targetElement.parentNode.insertBefore(replyUI, targetElement);
    this.replyState.replyUI = replyUI;
  }

  // textarea에 답글 텍스트 추가
  addReplyTextToTextarea() {
    const textarea = document.querySelector('#Message');
    if (!textarea) return;
    
    // 원본 값 저장
    this.originalTextareaValue = textarea.value;
    
    // 답글 텍스트 생성
    const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
    
    // textarea에 답글 텍스트 추가
    textarea.value = replyText + this.originalTextareaValue;
    textarea.classList.add('reply-mode');
    
    // textarea를 컨테이너로 감싸기 (상단 잘림을 위해)
    this.createTextareaContainer(textarea);
    
    // 커서를 답글 텍스트 뒤로 이동하고 포커스
    setTimeout(() => {
      textarea.setSelectionRange(replyText.length, replyText.length);
      textarea.focus();
      
      // 입력 이벤트를 트리거하여 화면 갱신
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }, 10);
  }

  // textarea 컨테이너 생성
  createTextareaContainer(textarea) {
    // 이미 컨테이너가 있으면 생략
    if (textarea.parentElement.classList.contains('textarea-container')) return;
    
    const container = document.createElement('div');
    container.className = 'textarea-container';
    
    // textarea를 컨테이너로 감싸기
    textarea.parentNode.insertBefore(container, textarea);
    container.appendChild(textarea);
  }

  // textarea 모니터링 설정
  setupTextareaMonitoring() {
    // textarea 값 변경 감지 (답글 텍스트 보호용)
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'Message' && this.replyState.isReplying) {
        // 사용자 직접 입력인지 확인 (isTrusted 속성 체크)
        const isUserAction = e.isTrusted && this.isUserInput;
        
        // 사용자 입력인 경우 즉시 답글 텍스트 보호 처리
        if (isUserAction) {
          console.log('사용자 입력 감지됨:', e.target.value);
          this.handleTextareaInput(e.target);
        }
        
        this.isUserInput = false; // 플래그 리셋
      }
    });
    
    // 추가 보안: beforeinput 이벤트로 더 빠른 차단
    document.addEventListener('beforeinput', (e) => {
      if (e.target && e.target.id === 'Message' && this.replyState.isReplying) {
        const textarea = e.target;
        const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
        
        // 전체 삭제 시도를 감지하고 차단
        if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContent') {
          if (textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length) {
            console.log('전체 삭제 시도 감지 - beforeinput에서 차단');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
          
          // 답장 텍스트 영역 삭제 시도 차단
          if (textarea.selectionStart < replyText.length) {
            console.log('답장 텍스트 영역 삭제 시도 - beforeinput에서 차단');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      }
    });
    
    // 키 입력 시작 감지 (사용자 입력 플래그 설정)
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'Message') {
        this.isUserInput = true; // 사용자 키 입력 시작
        
        if (this.replyState.isReplying) {
          console.log('키 입력 감지:', e.key, e.ctrlKey, e.target.selectionStart, e.target.selectionEnd);
          this.handleTextareaKeydown(e);
        }
      }
    });
    
    // 추가 보안: keyup에서도 체크
    document.addEventListener('keyup', (e) => {
      if (e.target && e.target.id === 'Message' && this.replyState.isReplying) {
        const textarea = e.target;
        const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
        
        // Ctrl+A나 Delete 후에 답장 텍스트가 사라졌는지 확인
        if (!textarea.value.startsWith(replyText)) {
          console.log('keyup에서 답장 텍스트 누락 감지 - 즉시 복원');
          this.isUserInput = false;
          this.handleTextareaInput(textarea);
        }
      }
    });
    
    // 붙여넣기 감지
    document.addEventListener('paste', (e) => {
      if (e.target && e.target.id === 'Message') {
        this.isUserInput = true; // 사용자 붙여넣기 액션
        
        if (this.replyState.isReplying) {
          setTimeout(() => {
            this.handleTextareaInput(e.target);
          }, 0);
        }
      }
    });
    
    // 마우스 클릭 감지 (포커스 변경 시에도 사용자 액션으로 간주)
    document.addEventListener('mousedown', (e) => {
      if (e.target && e.target.id === 'Message') {
        this.isUserInput = true;
      }
    });
  }

  // textarea 입력 처리
  handleTextareaInput(textarea) {
    const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
    
    // 답장 텍스트가 없거나 맨 앞에 없는 경우 즉시 복원
    if (!textarea.value.startsWith(replyText)) {
      console.log('답장 텍스트 복원 시작:', textarea.value);
      
      // 현재 커서 위치 저장
      const cursorStart = textarea.selectionStart;
      const cursorEnd = textarea.selectionEnd;
      
      // 1. 완전히 비어있는 경우 - 즉시 복원
      if (textarea.value === '') {
        console.log('완전히 비어있음 - 답장 텍스트 복원');
        this.isUserInput = false;
        textarea.value = replyText;
        textarea.setSelectionRange(replyText.length, replyText.length);
        return;
      }
      
      // 2. 답장 텍스트의 일부만 남아있는 경우도 복원
      if (textarea.value.length < replyText.length && replyText.startsWith(textarea.value)) {
        console.log('답장 텍스트 일부만 남음 - 완전 복원');
        this.isUserInput = false;
        textarea.value = replyText;
        textarea.setSelectionRange(replyText.length, replyText.length);
        return;
      }
      
      // 3. 답장 텍스트가 중간이나 다른 위치에 있는 경우
      const escapedUser = this.replyState.targetUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedMessage = this.replyState.targetMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const replyRegex = new RegExp(`\\[\\|\\|${escapedUser}님의 채팅 ${escapedMessage}에 답장\\|\\|\\]\\n?`, 'g');
      
      // 모든 답장 텍스트 제거하여 사용자 입력만 추출
      let userInputOnly = textarea.value.replace(replyRegex, '');
      
      // 4. 답장 텍스트 + 사용자 입력으로 재구성
      const newValue = replyText + userInputOnly;
      
      console.log('텍스트 재구성:', { original: textarea.value, userOnly: userInputOnly, new: newValue });
      
      // 프로그래밍적 변경임을 표시
      this.isUserInput = false;
      
      // 값 업데이트
      textarea.value = newValue;
      
      // 커서 위치 조정 - 사용자 입력 영역으로
      const newCursorPos = Math.max(replyText.length, Math.min(replyText.length + userInputOnly.length, newValue.length));
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      console.log('답장 텍스트 복원 완료');
    }
  }

  // textarea 키 입력 처리
  handleTextareaKeydown(e) {
    const textarea = e.target;
    const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
    
    // Ctrl 조합키 완전 차단 (답장 모드에서는 위험한 모든 조합 차단)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+A는 아예 막기
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // 사용자 입력 부분만 선택
        textarea.setSelectionRange(replyText.length, textarea.value.length);
        return false;
      }
      
      // Ctrl+X, Ctrl+C, Ctrl+V - 답장 텍스트 영역 포함 시 차단
      if (e.key === 'x' || e.key === 'X' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V') {
        if (textarea.selectionStart < replyText.length) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (e.key === 'v' || e.key === 'V') {
            textarea.setSelectionRange(replyText.length, replyText.length);
          } else {
            textarea.setSelectionRange(replyText.length, textarea.value.length);
          }
          return false;
        }
      }
    }
    
    // Delete나 Backspace 키 처리
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // 전체가 선택된 상태라면 완전 차단
      if (textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // 사용자 입력만 지우기
        this.isUserInput = false;
        textarea.value = replyText;
        textarea.setSelectionRange(replyText.length, replyText.length);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return false;
      }
      
      // 답장 텍스트 영역에 접근하려는 경우 차단
      if (textarea.selectionStart < replyText.length || 
          (textarea.selectionStart === replyText.length && textarea.selectionEnd > replyText.length)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        textarea.setSelectionRange(replyText.length, replyText.length);
        return false;
      }
    }
    
    // 네비게이션 키 제한
    if (e.key === 'ArrowLeft' && textarea.selectionStart <= replyText.length) {
      e.preventDefault();
      textarea.setSelectionRange(replyText.length, replyText.length);
      return false;
    }
    
    if (e.key === 'Home') {
      e.preventDefault();
      textarea.setSelectionRange(replyText.length, replyText.length);
      return false;
    }
  }

  // 답글 취소
  cancelReply() {
    if (!this.replyState.isReplying) return;
    
    // 1. 답글 요소 없애기
    console.log('cancelReply 호출됨, replyUI 존재:', !!this.replyState.replyUI);
    if (this.replyState.replyUI) {
      console.log('replyUI 제거 중...');
      this.replyState.replyUI.remove();
      this.replyState.replyUI = null;
      console.log('replyUI 제거 완료');
    } else {
      console.log('replyUI가 이미 null이거나 존재하지 않음');
    }
    
    const textarea = document.querySelector('#Message');
    if (textarea) {
      // 2. textarea 위치랑 추가 css설정 복원
      textarea.classList.remove('reply-mode');
      
      const container = textarea.parentElement;
      if (container && container.classList.contains('textarea-container')) {
        // 컨테이너에서 textarea를 꺼내기
        const parent = container.parentElement;
        parent.insertBefore(textarea, container);
        container.remove();
      }
      
      // 3. 포커스를 주기 전에 먼저 답장 텍스트 제거
      this.removeReplyTextAndFocus(textarea);
    }
    
    // 답글 상태 초기화
    this.replyState.isReplying = false;
    this.replyState.targetUser = null;
    this.replyState.targetMessage = null;
    this.originalTextareaValue = '';
    
    console.log('답글이 취소되었습니다.');
  }

  // 자신의 새로운 채팅 감지 (답장 모드 종료용)
  checkIfMyNewChat(container) {
    if (!this.myAvatarSrc || !this.replyState.isReplying) return;
    
    const elements = Array.from(container.children);
    let currentAvatarSrc = null;
    let hasNewMyMessage = false;
    
    for (const element of elements) {
      // 아바타 div 확인
      if (element.classList.contains('css-1vl0v4w') && element.classList.contains('e4nn04i1')) {
        const avatarImg = element.querySelector('img');
        if (avatarImg && avatarImg.src) {
          currentAvatarSrc = avatarImg.src;
        }
      }
      // 채팅 div 확인
      else if (element.classList.contains('css-qjh7qy') && element.classList.contains('e4nn04i2')) {
        // 내 메시지인지 확인
        if (currentAvatarSrc === this.myAvatarSrc) {
          const messageSpan = element.querySelector('p.message span');
          if (messageSpan) {
            const messageText = messageSpan.textContent;
            const replyPattern = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]`;
            
            // 1. 답장 텍스트가 아직 처리되지 않은 경우
            if (messageText.includes(replyPattern)) {
              console.log('자신의 답장 메시지 감지됨 (처리 전) - 답장 모드 종료');
              hasNewMyMessage = true;
              break;
            }
            
            // 2. 답장 표기가 있는 경우 (이미 처리된 경우)
            const messageParagraph = messageSpan.parentElement;
            if (messageParagraph && messageParagraph.querySelector('.reply-indicator')) {
              const replyIndicator = messageParagraph.querySelector('.reply-indicator');
              const targetUser = replyIndicator.querySelector('.reply-target-user');
              const targetMessage = replyIndicator.querySelector('.reply-target-message');
              
              if (targetUser && targetMessage &&
                  targetUser.textContent === this.replyState.targetUser &&
                  targetMessage.textContent === this.replyState.targetMessage) {
                console.log('자신의 답장 메시지 감지됨 (처리 후) - 답장 모드 종료');
                hasNewMyMessage = true;
                break;
              }
            }
          }
        }
      }
    }
    
    if (hasNewMyMessage) {
      // 답장 모드 종료
      setTimeout(() => {
        if (this.replyState.isReplying) {
          this.cancelReply();
        }
      }, 50);
    }
  }

  // 답장 텍스트 제거 후 안전한 포커스 설정
  removeReplyTextAndFocus(textarea) {
    const replyText = `[||${this.replyState.targetUser}님의 채팅 ${this.replyState.targetMessage}에 답장||]\n`;
    
    // 프로그래밍적 변경임을 표시
    this.isUserInput = false;
    
    // 1단계: 답장 텍스트가 있으면 즉시 제거
    if (textarea.value.includes(replyText)) {
      textarea.value = textarea.value.replace(replyText, '');
      // input 이벤트 수동 발생 (프로그래밍적 변경)
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (textarea.value === '' && this.originalTextareaValue) {
      // 비어있으면 원본 값 복원
      textarea.value = this.originalTextareaValue;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // 2단계: 포커스를 주고 사이트가 새로운 값을 인식하도록 충분히 기다림
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      
      // 3단계: 사이트가 새로운 내용을 저장할 시간을 주기 위해 추가 대기
      setTimeout(() => {
        // 포커스 유지 및 최종 확인
        if (document.activeElement !== textarea) {
          textarea.focus();
        }
        
        // 답장 텍스트가 다시 나타났다면 재제거
        if (textarea.value.includes(replyText)) {
          this.isUserInput = false; // 프로그래밍적 변경
          textarea.value = textarea.value.replace(replyText, '');
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 4단계: 최종 포커스 유지 (사이트가 내용을 완전히 인식할 때까지)
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          console.log('답장 취소 완료');
        }, 200);
      }, 100);
    }, 50);
  }

  // 이미지 ASCII 기능 설정
  setupImageAsciiFeature() {
    console.log('이미지 ASCII 기능 설정 중...');
    this.addImageButtonsToExistingElements();
  }

  // 기존 요소들에 이미지 버튼 추가
  addImageButtonsToExistingElements() {
    const targetElements = document.querySelectorAll('div.css-15ws93w.eeo291g1');
    targetElements.forEach(element => {
      this.addImageButtonToElement(element);
    });
  }

  // 요소에 이미지 버튼 추가
  addImageButtonToElement(element) {
    // 이미 이미지 버튼이 있으면 추가하지 않음
    if (element.querySelector('.image-ascii-button')) return;
    
    console.log('이미지 버튼을 요소에 추가:', element);
    
    // 이미지 버튼 생성
    const imageButton = document.createElement('button');
    imageButton.className = 'image-ascii-button';
    imageButton.title = '이미지를 ASCII 아트로 변환';
    
    // SVG 아이콘 추가 (이미지 아이콘)
    imageButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    
    // 클릭 이벤트 추가
    imageButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openImageSelector(); // 비율 유지 모드만
    });
    
    // 요소에 버튼 추가
    element.appendChild(imageButton);
    
    console.log('이미지 버튼 추가 완료');
  }

  // 이미지 선택창 열기
  openImageSelector() {
    // 숨겨진 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        console.log('이미지 파일 선택됨:', file.name);
        this.convertImageToAscii(file);
      }
      // 파일 입력 요소 제거
      document.body.removeChild(fileInput);
    });
    
    // DOM에 추가하고 클릭
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  // 이미지를 ASCII 아트로 변환
  convertImageToAscii(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('이미지 로드됨:', img.width, 'x', img.height);
        
        // ASCII 아트 생성
        const asciiArt = this.generateAsciiArt(img);
        
        // textarea에 추가
        this.addAsciiArtToTextarea(asciiArt);
      };
      
      img.onerror = () => {
        console.error('이미지 로드 실패');
        alert('이미지를 로드할 수 없습니다.');
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      console.error('파일 읽기 실패');
      alert('파일을 읽을 수 없습니다.');
    };
    
    reader.readAsDataURL(file);
  }

  // ASCII 아트 생성
  generateAsciiArt(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 최대 크기를 13으로 설정
    const maxSize = 13;
    let width, height;
    
    // 비율 유지 모드: 원본 비율 유지하되 최대 크기 제한
    if (img.width > img.height) {
      // 가로가 더 긴 경우
      width = maxSize;
      height = Math.round((img.height / img.width) * maxSize);
      // 최소 높이 보장
      if (height < 3) height = 3;
    } else {
      // 세로가 더 긴 경우  
      height = maxSize;
      width = Math.round((img.width / img.height) * maxSize);
      // 최소 너비 보장
      if (width < 3) width = 3;
    }
    
    // 너무 길어지는 것을 방지하기 위해 최대값 제한
    if (width > maxSize) width = maxSize;
    if (height > maxSize) height = maxSize;
    
    console.log('ASCII 변환 크기:', width, 'x', height);
    
    // 캔버스 크기 설정 (2배로 해서 더 세밀한 분석)
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    // Unicode 블록 문자가 세로가 더 길기 때문에 이미지의 세로를 압축해서 그리기
    // 2/3 비율로 세로 압축 (너무 많이 줄이지 않도록 조정)
    const aspectRatioCorrection = 2/3;
    const correctedHeight = canvas.height * aspectRatioCorrection;
    
    // 캔버스를 검은 배경으로 초기화 (투명 영역 처리)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 이미지를 세로 압축해서 중앙에 그리기
    const yOffset = (canvas.height - correctedHeight) / 2;
    ctx.drawImage(img, 0, yOffset, canvas.width, correctedHeight);
    
    // 이미지 데이터 가져오기
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 전체 이미지의 평균 밝기 계산
    const globalAvgBrightness = this.calculateGlobalAverageBrightness(data, canvas.width, canvas.height);
    console.log('전체 이미지 평균 밝기:', globalAvgBrightness);
    
    // 전체 평균 밝기를 기준으로 임계값 설정
    const globalThreshold = globalAvgBrightness;
    console.log('글로벌 임계값:', globalThreshold);
    
    let asciiArt = '';
    
    // 각 문자 위치에 대해 2x2 서브픽셀로 분석
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 2x2 서브픽셀의 밝기 계산
        const topLeft = this.getPixelBrightness(data, x * 2, y * 2, canvas.width);
        const topRight = this.getPixelBrightness(data, x * 2 + 1, y * 2, canvas.width);
        const bottomLeft = this.getPixelBrightness(data, x * 2, y * 2 + 1, canvas.width);
        const bottomRight = this.getPixelBrightness(data, x * 2 + 1, y * 2 + 1, canvas.width);
        
        // 전체 평균 밝기를 임계값으로 사용
        const threshold = globalThreshold;
        
        const tl = topLeft > threshold ? 1 : 0;
        const tr = topRight > threshold ? 1 : 0;
        const bl = bottomLeft > threshold ? 1 : 0;
        const br = bottomRight > threshold ? 1 : 0;
        
        // 4비트 패턴으로 변환 (top-left, top-right, bottom-left, bottom-right)
        const pattern = (tl << 3) | (tr << 2) | (bl << 1) | br;
        
        // 해당 패턴의 Unicode 블록 문자 선택
        const char = this.blockChars.quadrants[pattern];
        asciiArt += char;
      }
      
      // 줄바꿈 추가 (마지막 줄 제외)
      if (y < height - 1) {
        asciiArt += '\n';
      }
    }
    
    console.log('ASCII 아트 생성 완료:', asciiArt);
    return asciiArt;
  }

  // 픽셀 밝기 계산
  getPixelBrightness(data, x, y, width) {
    const index = (y * width + x) * 4;
    
    // 경계 체크
    if (index >= data.length) return 0;
    
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];
    
    // 알파 채널이 0이면 완전 투명 (어두움)
    if (a === 0) return 0;
    
    // 밝기 계산 (인간의 눈에 민감한 가중치 적용)
    return (r * 0.299 + g * 0.587 + b * 0.114);
  }

  // 전체 이미지의 평균 밝기 계산
  calculateGlobalAverageBrightness(data, width, height) {
    let totalBrightness = 0;
    let pixelCount = 0;
    
    // 모든 픽셀의 밝기를 계산
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const brightness = this.getPixelBrightness(data, x, y, width);
        
        // 투명하지 않은 픽셀만 계산에 포함
        if (brightness > 0 || data[(y * width + x) * 4 + 3] > 0) {
          totalBrightness += brightness;
          pixelCount++;
        }
      }
    }
    
    // 평균 밝기 반환 (픽셀이 없으면 중간 밝기 128 반환)
    return pixelCount > 0 ? totalBrightness / pixelCount : 128;
  }

  // ASCII 아트를 textarea에 추가
  addAsciiArtToTextarea(asciiArt) {
    const textarea = document.querySelector('#Message');
    if (!textarea) {
      console.warn('textarea를 찾을 수 없습니다.');
      return;
    }
    
    // 사용자 입력이 아님을 표시
    this.isUserInput = false;
    
    // 현재 값에 ASCII 아트 추가
    const currentValue = textarea.value;
    const newValue = currentValue + (currentValue ? '\n' : '') + asciiArt;
    
    textarea.value = newValue;
    
    // 커서를 끝으로 이동
    textarea.setSelectionRange(newValue.length, newValue.length);
    
    // input 이벤트 발생시켜서 화면 갱신
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 포커스
    textarea.focus();
    
    console.log('ASCII 아트가 textarea에 추가되었습니다.');
  }

  // 리사이즈 가능한 드래그 컴포넌트 설정
  setupResizableDraggable() {
    this.enhanceExistingDraggableElements();
    this.setupDraggableObserver();
    this.setupEmergencyResetHandlers();
  }

  // 기존 draggable 요소들을 찾아서 리사이즈 기능 추가
  enhanceExistingDraggableElements() {
    const draggableElements = document.querySelectorAll('.react-draggable.css-e7o6ze');
    draggableElements.forEach(element => {
      this.addResizeFunctionalityToElement(element);
    });
  }

  // 새로 생성되는 draggable 요소 감지 (기존 MutationObserver에 통합됨)
  setupDraggableObserver() {
    // 이 기능은 기존 setupObserver()에 통합되어 있음
  }

  // 특정 요소에 리사이즈 기능 추가
  addResizeFunctionalityToElement(element) {
    // 이미 리사이즈 기능이 추가되었는지 확인
    if (element.querySelector('.resize-handle')) {
      return;
    }

    // 요소에 resizable 클래스 추가
    element.classList.add('resizable-draggable-enhanced');
    
    // 최소 크기만 설정하고 기존 스타일 유지
    element.style.setProperty('min-width', '200px', 'important');
    element.style.setProperty('min-height', '200px', 'important');
    
    // 저장된 크기가 있으면 자동으로 적용
    this.applyStoredSize(element);
    
    // 리사이즈 핸들들 생성
    this.createResizeHandles(element);
  }

  // 리사이즈 핸들들 생성
  createResizeHandles(container) {
    const handles = [
      { name: 'top', cursor: 'n-resize', style: 'top: -5px; left: 5px; right: 5px; height: 10px;' },
      { name: 'bottom', cursor: 's-resize', style: 'bottom: -5px; left: 5px; right: 5px; height: 10px;' },
      { name: 'left', cursor: 'w-resize', style: 'left: -5px; top: 5px; bottom: 5px; width: 10px;' },
      { name: 'right', cursor: 'e-resize', style: 'right: -5px; top: 5px; bottom: 5px; width: 10px;' },
      { name: 'top-left', cursor: 'nw-resize', style: 'top: -5px; left: -5px; width: 15px; height: 15px;' },
      { name: 'top-right', cursor: 'ne-resize', style: 'top: -5px; right: -5px; width: 15px; height: 15px;' },
      { name: 'bottom-left', cursor: 'sw-resize', style: 'bottom: -5px; left: -5px; width: 15px; height: 15px;' },
      { name: 'bottom-right', cursor: 'se-resize', style: 'bottom: -5px; right: -5px; width: 15px; height: 15px;' }
    ];

    handles.forEach(handle => {
      const handleElement = document.createElement('div');
      handleElement.className = `resize-handle resize-${handle.name}`;
      handleElement.style.cssText = `
        position: absolute;
        ${handle.style}
        cursor: ${handle.cursor};
        background: transparent;
        z-index: 1001;
      `;

      // 호버 효과 제거 (시각적 표시 없음)

      this.setupResizeHandler(handleElement, handle.name, container);
      container.appendChild(handleElement);
    });
  }

    // 리사이즈 핸들러 설정
  setupResizeHandler(handle, direction, container) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    let mouseMoveHandler = null;
    let mouseUpHandler = null;
    let mouseLeaveHandler = null;

    const resetResizing = () => {
      if (!isResizing) return;
      
      isResizing = false;
      this.isResizing = false; // 전역 상태도 업데이트
      document.body.style.cursor = '';
      container.style.pointerEvents = 'auto';
      
      // 이벤트 리스너 제거
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (mouseUpHandler) {
        document.removeEventListener('mouseup', mouseUpHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
      }
      if (mouseLeaveHandler) {
        document.removeEventListener('mouseleave', mouseLeaveHandler);
        window.removeEventListener('mouseleave', mouseLeaveHandler);
      }
      
      // 변수 초기화
      mouseMoveHandler = null;
      mouseUpHandler = null;
      mouseLeaveHandler = null;
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 이미 리사이징 중이면 먼저 초기화
      resetResizing();
      
      isResizing = true;
      this.isResizing = true; // 전역 상태도 업데이트
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = container.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;

      // 현재 transform 값을 정확히 가져와서 저장
      const currentTransform = container.style.transform;
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      let initialX = 7, initialY = -18; // 기본값
      
      if (translateMatch) {
        initialX = parseFloat(translateMatch[1]);
        initialY = parseFloat(translateMatch[2]);
      }

      document.body.style.cursor = handle.style.cursor;
      container.style.pointerEvents = 'none';

      // 마우스 무브 핸들러
      mouseMoveHandler = (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        // 방향에 따른 리사이즈 로직
        let translateX = 0;
        let translateY = 0;

        if (direction.includes('right')) {
          newWidth = Math.max(200, startWidth + deltaX);
        }
        if (direction.includes('left')) {
          const proposedWidth = Math.max(200, startWidth - deltaX);
          const widthChange = proposedWidth - startWidth;
          newWidth = proposedWidth;
          // 왼쪽에서 크기 조정 시 위치 이동량 계산
          translateX = -widthChange;
        }
        if (direction.includes('bottom')) {
          newHeight = Math.max(200, startHeight + deltaY);
        }
        if (direction.includes('top')) {
          const proposedHeight = Math.max(200, startHeight - deltaY);
          const heightChange = proposedHeight - startHeight;
          newHeight = proposedHeight;
          // 위쪽에서 크기 조정 시 위치 이동량 계산
          translateY = -heightChange;
        }

        // 스타일 적용 (기존 CSS 오버라이드를 위해 setProperty 사용)
        container.style.setProperty('width', newWidth + 'px', 'important');
        container.style.setProperty('height', newHeight + 'px', 'important');
        
        // 위치 조정이 필요한 경우에만 transform 업데이트
        if (direction.includes('left') || direction.includes('top')) {
          // 초기값 기반으로 새로운 위치 계산
          const newX = initialX + translateX;
          const newY = initialY + translateY;
          
          container.style.transform = `translate(${newX}px, ${newY}px)`;
        }
      };

      // 마우스 업 핸들러
      mouseUpHandler = (e) => {
        // 크기 변경이 완료되면 자동으로 저장
        this.saveChatSize(container);
        resetResizing();
      };

      // 마우스가 창을 벗어났을 때 핸들러
      mouseLeaveHandler = (e) => {
        // 마우스가 창을 완전히 벗어났을 때만 리사이징 종료
        if (e.clientX < 0 || e.clientY < 0 || 
            e.clientX > window.innerWidth || e.clientY > window.innerHeight) {
          resetResizing();
        }
      };

      // 여러 곳에 이벤트 리스너 등록 (안전성 확보)
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      document.addEventListener('mouseleave', mouseLeaveHandler);
      
      // window에도 등록 (iframe 등에서의 이벤트 누락 방지)
      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('mouseup', mouseUpHandler);
      window.addEventListener('mouseleave', mouseLeaveHandler);
      
      // ESC 키로 강제 종료
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          resetResizing();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });

    // 핸들에서 마우스가 떠났을 때 처리 (시각적 효과 없음)
  }

  // 저장된 크기 적용
  applyStoredSize(element) {
    const storedSize = this.getStoredChatSize();
    if (storedSize) {
      // 저장된 크기로 즉시 적용
      element.style.setProperty('width', storedSize.width, 'important');
      element.style.setProperty('height', storedSize.height, 'important');
      element.style.transform = `translate(${storedSize.transformX}px, ${storedSize.transformY}px)`;
      
      console.log('저장된 크기 적용됨:', storedSize);
    }
  }

  // localStorage에서 채팅 크기 가져오기
  getStoredChatSize() {
    try {
      const stored = localStorage.getItem('chat-extension-size');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('저장된 크기 로드 실패:', e);
      return null;
    }
  }

  // 현재 크기를 localStorage에 저장
  saveChatSize(element) {
    try {
      const computedStyle = window.getComputedStyle(element);
      const currentTransform = element.style.transform;
      
      // transform 값 파싱
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      let translateX = 7, translateY = -18; // 기본값
      
      if (translateMatch) {
        translateX = parseFloat(translateMatch[1]);
        translateY = parseFloat(translateMatch[2]);
      }
      
      const sizeData = {
        width: computedStyle.width,
        height: computedStyle.height,
        transformX: translateX,
        transformY: translateY
      };
      
      localStorage.setItem('chat-extension-size', JSON.stringify(sizeData));
      console.log('채팅 크기 저장됨:', sizeData);
    } catch (e) {
      console.warn('크기 저장 실패:', e);
    }
  }

  // 비상 리셋 핸들러들 설정
  setupEmergencyResetHandlers() {
    // 전역 클릭으로 리사이즈 상태 강제 종료
    document.addEventListener('click', (e) => {
      if (this.isResizing && !e.target.classList.contains('resize-handle')) {
        this.forceResetAllResizing();
      }
    });

    // 더블클릭으로 강제 리셋
    document.addEventListener('dblclick', () => {
      this.forceResetAllResizing();
    });

    // 마우스 우클릭으로 강제 리셋
    document.addEventListener('contextmenu', () => {
      this.forceResetAllResizing();
    });

    // 윈도우 포커스 상실 시 리셋
    window.addEventListener('blur', () => {
      this.forceResetAllResizing();
    });

    // 스크롤 시에도 리셋
    document.addEventListener('scroll', () => {
      if (this.isResizing) {
        this.forceResetAllResizing();
      }
    });
  }

  // 모든 리사이징 상태 강제 초기화
  forceResetAllResizing() {
    this.isResizing = false;
    document.body.style.cursor = '';
    
    // 모든 enhanced 요소들의 pointerEvents 복원
    const enhancedElements = document.querySelectorAll('.resizable-draggable-enhanced');
    enhancedElements.forEach(element => {
      element.style.pointerEvents = 'auto';
    });
    
    // console.log('리사이즈 상태가 강제로 초기화되었습니다.');
  }

  // 확장 프로그램 종료
  destroy() {
    console.log('채팅 플러스 확장 프로그램이 종료됩니다.');
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // 답글 상태 정리
    this.cancelReply();
    
    // 강제로 모든 리사이즈 상태 초기화
    document.body.style.cursor = '';
    
    // 리사이즈 핸들들 제거
    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => handle.remove());
    
    // 리사이즈 기능이 추가된 요소들의 클래스 제거 및 상태 초기화
    const enhancedElements = document.querySelectorAll('.resizable-draggable-enhanced');
    enhancedElements.forEach(element => {
      element.classList.remove('resizable-draggable-enhanced');
      element.style.pointerEvents = 'auto';
    });
  }

  // 투명도 기능 설정
  setupTransparencyFeature() {
    this.addTransparencyCheckboxIfNeeded();
    this.setupTransparencyObserver();
  }

  // 채팅창 감지 및 투명도 체크박스 추가
  addTransparencyCheckboxIfNeeded() {
    // 채팅창 감지 (chatting_slider_bar css-ezaneu ea1elk92 클래스)
    const chattingSliderBar = document.querySelector('.chatting_slider_bar.css-ezaneu.ea1elk92');
    
    if (chattingSliderBar && !document.querySelector('#transparencyCheckbox')) {
      console.log('채팅창 감지됨. 투명도 체크박스 추가');
      this.createTransparencyCheckbox(chattingSliderBar);
    } else if (!chattingSliderBar) {
      console.log('채팅창이 감지되지 않음. 투명도 기능 비활성화');
    }
  }

  // 투명도 체크박스 생성
  createTransparencyCheckbox(targetElement) {
    // 슬라이더 바의 부모 요소를 relative로 설정
    const parentElement = targetElement.parentNode;
    if (parentElement) {
      parentElement.style.position = 'relative';
    }

    // 체크박스 컨테이너 생성
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'transparency-checkbox-container';

    // 체크박스 생성
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'transparencyCheckbox';

    // 라벨 생성
    const label = document.createElement('label');
    label.htmlFor = 'transparencyCheckbox';
    label.textContent = '투명하게';

    // 이벤트 리스너 추가
    checkbox.addEventListener('change', () => {
      this.isChatTransparent = checkbox.checked;
      this.applyTransparency();
      console.log('투명도 상태:', this.isChatTransparent);
    });

    // 요소 조립
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    // 부모 요소에 추가 (absolute 포지셔닝으로 겹치지 않게)
    parentElement.appendChild(checkboxContainer);
    
    this.transparencyCheckbox = checkbox;
  }

  // 투명도 적용
  applyTransparency() {
    const chatContainers = document.querySelectorAll('.css-1ad1slj');
    
    chatContainers.forEach(container => {
      if (this.isChatTransparent) {
        container.style.setProperty('background', 'transparent', 'important');
        container.style.setProperty('background-color', 'transparent', 'important');
      } else {
        container.style.removeProperty('background');
        container.style.removeProperty('background-color');
      }
    });
  }

  // 투명도 관련 DOM 변화 감지
  setupTransparencyObserver() {
    // 기존 MutationObserver에 추가할 로직은 setupObserver에서 처리
  }
}

// 확장 프로그램 시작
let chatExtension = null;

// DOM이 준비되면 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chatExtension = new ChatExtension();
  });
} else {
  chatExtension = new ChatExtension();
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (chatExtension) {
    chatExtension.destroy();
  }
});

// 팝업과의 통신을 위한 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    if (chatExtension) {
      sendResponse({
        success: true,
        avatarSrc: chatExtension.myAvatarSrc,
        isActive: true
      });
    } else {
      sendResponse({
        success: false,
        message: '확장 프로그램이 초기화되지 않았습니다'
      });
    }
  }
  
  return true; // 비동기 응답을 위해 true 반환
}); 