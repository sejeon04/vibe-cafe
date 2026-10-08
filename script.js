/**
 * ========================================================
 * 바이브 카페 주문서 자바스크립트 (script.js)
 * ========================================================
 */

// ----------------------------------------------------
// [Supabase 설정]
// 아래 URL과 KEY 값에 본인의 Supabase 프로젝트 정보를 넣어주세요.
// ----------------------------------------------------
const SUPABASE_URL = 'https://gvsvovxzjpiwspepmvmz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c3Zvdnh6anBpd3NwZXBtdm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU4NTUsImV4cCI6MjEwNjk3MTg1NX0.mwEbuI2Gn0ImPG2Mb87dWIGd-w1jP14yfXnUymtEbW0';

// Supabase 클라이언트 초기화 (CDN으로 로드된 supabase 전역 객체 사용)
const supabaseClient = (typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// HTML 문서가 모두 로드된 후 스크립트를 안전하게 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------
  // 1. HTML 주요 요소(DOM Element) 가져오기
  // ----------------------------------------------------
  const orderForm = document.getElementById('order-form');                       // 주문서 폼 전체
  const customerNameInput = document.getElementById('customer-name');            // 이름 입력칸
  const customerPhoneInput = document.getElementById('customer-phone');          // 전화번호 입력칸
  const drinkSelect = document.getElementById('drink-select');                  // 음료 선택 드롭다운
  const quantityInput = document.getElementById('quantity');                    // 수량 입력칸
  const requestsInput = document.getElementById('requests');                    // 요청사항 입력칸
  const totalPriceSpan = document.getElementById('total-price');                // 예상 금액 숫자 영역
  const submitBtn = document.getElementById('submit-btn');                      // 주문하기 버튼
  const resetBtn = document.getElementById('reset-btn');                        // 다시 작성 버튼
  const orderConfirmMessage = document.getElementById('order-confirm-message');  // 주문 확인 메시지 표시 영역

  // ----------------------------------------------------
  // 2. 금액 계산 함수 (calculateTotal)
  // - 음료가 선택되지 않았으면 0원을 반환합니다.
  // - (음료 기본가격 + 사이즈 추가금 + 선택한 옵션 총합) * 수량
  // ----------------------------------------------------
  function calculateTotal() {
    // 1) 선택된 음료 확인
    const selectedOption = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkValue = drinkSelect.value;

    // 음료를 아직 선택하지 않았다면 (기본 빈 값) 예상 금액은 0원
    if (!drinkValue) {
      totalPriceSpan.textContent = '0';
      return 0;
    }

    // 음료 기본 가격 (data-price 속성값 읽기)
    const drinkPrice = Number(selectedOption.dataset.price) || 0;

    // 2) 선택된 사이즈 추가 가격 읽기
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSizeRadio ? (Number(selectedSizeRadio.dataset.price) || 0) : 0;

    // 3) 체크된 추가 옵션들의 가격 합산
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    let optionsPrice = 0;
    checkedOptions.forEach(optionCheckbox => {
      optionsPrice += Number(optionCheckbox.dataset.price) || 0;
    });

    // 4) 수량 읽기 (최소 1, 최대 10, 기본값 1)
    let quantity = parseInt(quantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }

    // 5) 1잔당 단가 = 음료 기본가 + 사이즈 추가금 + 옵션 합산
    const singleDrinkPrice = drinkPrice + sizePrice + optionsPrice;

    // 6) 총 예상 금액 = 1잔당 단가 * 수량
    const total = singleDrinkPrice * quantity;

    // 천 단위 콤마(toLocaleString)를 적용하여 화면에 표시
    totalPriceSpan.textContent = total.toLocaleString('ko-KR');

    return total;
  }

  // ----------------------------------------------------
  // 3. 실시간 금액 갱신을 위한 이벤트 리스너 등록
  // - 'change'와 'input' 이벤트를 감지하여 입력이 바뀔 때마다 계산
  // ----------------------------------------------------

  // 음료 선택 드롭다운 변경 시
  drinkSelect.addEventListener('change', calculateTotal);

  // 사이즈 라디오 버튼 변경 시
  const sizeRadios = document.querySelectorAll('input[name="size"]');
  sizeRadios.forEach(radio => {
    radio.addEventListener('change', calculateTotal);
  });

  // 추가 옵션 체크박스 변경 시
  const optionCheckboxes = document.querySelectorAll('input[name="option"]');
  optionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', calculateTotal);
  });

  // 수량 변경 시 (직접 입력 및 위/아래 화살표 클릭 모두 감지)
  quantityInput.addEventListener('input', calculateTotal);
  quantityInput.addEventListener('change', calculateTotal);

  // ----------------------------------------------------
  // 4. 주문하기 버튼 클릭 (폼 제출: submit) 및 Supabase 저장 처리
  // ----------------------------------------------------
  orderForm.addEventListener('submit', async (event) => {
    // 폼의 기본 제출 동작(새로고침) 방지
    event.preventDefault();

    // 1) 이름 필수 입력 검증 (공백 제거 후 확인)
    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      customerNameInput.focus();
      return;
    }

    // 2) 음료 선택 여부 검증
    const drinkValue = drinkSelect.value;
    if (!drinkValue) {
      alert('음료를 선택해주세요');
      drinkSelect.focus();
      return;
    }

    // 3) 주문 데이터 추출 및 정리
    // 음료 기본 가격 (단품가)
    const selectedDrinkOption = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkPrice = Number(selectedDrinkOption.dataset.price) || 0;
    // 음료 한글명 추출 (예: "카페라떼 4,000원" -> "카페라떼")
    const drinkName = selectedDrinkOption.textContent.replace(/\s*[0-9,]+원$/, '').trim();

    // 온도 (HOT / ICE)
    const selectedTempRadio = document.querySelector('input[name="temperature"]:checked');
    const temperature = selectedTempRadio ? selectedTempRadio.value : 'HOT';

    // 사이즈 (S / M / L)
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizeName = selectedSizeRadio ? selectedSizeRadio.value : 'M';

    // 추가 옵션 목록 (배열)
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    const optionNames = [];
    checkedOptions.forEach(checkbox => {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        // 라벨에서 가격 표시 제외하고 텍스트만 추출 (예: "샷 추가 (+500원)" -> "샷 추가")
        const text = label.textContent.replace(/\s*\(\+?[0-9,]+원\)/, '').trim();
        optionNames.push(text);
      }
    });

    // 수량 및 총 금액
    const quantity = parseInt(quantityInput.value, 10) || 1;
    const finalTotal = calculateTotal();
    const formattedTotal = finalTotal.toLocaleString('ko-KR');

    // 전화번호 및 요청사항
    const phone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
    const request = requestsInput ? requestsInput.value.trim() : '';

    // 옵션 텍스트 (화면 표시용)
    const optionText = optionNames.length > 0 ? ` (${optionNames.join(', ')})` : '';

    // ----------------------------------------------------
    // 4-1. Supabase 'orders' 테이블에 저장할 데이터 객체 구성
    // - SQL 테이블 컬럼명: customer_name, customer_phone, drink, temperature, size, options, quantity, requests, total_price
    // ----------------------------------------------------
    const orderData = {
      customer_name: customerName,
      customer_phone: phone,       // SQL 컬럼명: customer_phone
      drink: drinkName,
      temperature: temperature,    // SQL 컬럼명: temperature
      size: sizeName,
      options: optionNames,        // SQL 컬럼명: options (배열)
      quantity: quantity,
      requests: request,           // SQL 컬럼명: requests
      total_price: finalTotal
    };

    // ----------------------------------------------------
    // 4-2. 중복 클릭 방지 (버튼 비활성화)
    // ----------------------------------------------------
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '주문 저장 중...';

    try {
      // Supabase 클라이언트가 초기화되어 있는지 확인
      if (!supabaseClient) {
        // 만약 URL과 KEY를 아직 설정하지 않았다면 안내 후 로컬에서만 확인 메시지 노출 가능하게 처리
        console.warn('Supabase URL 또는 KEY가 설정되지 않았습니다. script.js 상단 설정을 확인해주세요.');
        throw new Error('Supabase 클라이언트가 설정되지 않았습니다.');
      }

      // Supabase 'orders' 테이블에 데이터 INSERT 요청
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([orderData]);

      // 저장 중 에러가 발생한 경우
      if (error) {
        throw error;
      }

      // 4-3. 저장 성공 시: 기존 주문 확인 메시지 + 통통 튀는 배지 표시
      const orderSummaryText = `${customerName}님, ${drinkName} ${sizeName}사이즈${optionText} ${quantity}잔, 총 ${formattedTotal}원 주문이 접수되었습니다!`;
      
      orderConfirmMessage.innerHTML = `
        <div class="confirm-badge bounce-badge">✓ 접수 완료</div>
        <p>${orderSummaryText}</p>
      `;
      orderConfirmMessage.style.display = 'block';

      // 배지 애니메이션 리셋
      const badgeElement = orderConfirmMessage.querySelector('.confirm-badge');
      if (badgeElement) {
        badgeElement.classList.remove('bounce-badge');
        void badgeElement.offsetWidth;
        badgeElement.classList.add('bounce-badge');
      }

      // 확인 메시지 위치로 부드럽게 스크롤
      orderConfirmMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      // 4-4. 저장 실패 시: 알림창 띄우고 콘솔에 에러 상세 출력
      console.error('Supabase 주문 저장 상세 에러:', err);
      const errorMsg = err.message || JSON.stringify(err);
      alert(`주문 저장에 실패했어요:\n${errorMsg}`);
    } finally {
      // 4-5. 작업 완료 후 주문 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // ----------------------------------------------------
  // 5. 다시 작성 버튼 클릭 (reset) 처리
  // ----------------------------------------------------
  resetBtn.addEventListener('click', () => {
    setTimeout(() => {
      // 1) 기본 사이즈: M 선택
      const defaultSize = document.getElementById('size-m');
      if (defaultSize) {
        defaultSize.checked = true;
      }

      // 2) 기본 온도: HOT 선택
      const defaultTemp = document.getElementById('temp-hot');
      if (defaultTemp) {
        defaultTemp.checked = true;
      }

      // 3) 기본 수량: 1로 설정
      quantityInput.value = 1;

      // 4) 금액 0원으로 재계산
      calculateTotal();

      // 5) 주문 확인 메시지 영역 숨기기 및 비우기
      orderConfirmMessage.textContent = '';
      orderConfirmMessage.style.display = 'none';

      // 6) 이름 입력칸으로 포커스 이동
      customerNameInput.focus();
    }, 0);
  });

  // 초기 로딩 시 금액 0원으로 계산 실행
  calculateTotal();
});
