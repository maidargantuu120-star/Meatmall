import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 지원 언어 타입
export type Language = "mn" | "ru" | "en";

// 언어 정보 인터페이스
export interface LanguageInfo {
  code: Language;
  name: string;
  flag: string;
}

// 지원하는 언어 목록
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

// 번역 타입
export interface Translations {
  // 공통
  home: string;
  products: string;
  contact: string;
  cart: string;
  profile: string;
  logout: string;
  menu: string;
  siteTitle: string;

  // 홈페이지
  heroTitle: string;
  heroSubtitle: string;
  featuredProducts: string;
  featuredProductsDesc: string;
  categories: {
    all: string;
    beef: string;
    lamb: string;
    chicken: string;
    pork: string;
    other: string;
    swipeHint: string;
  };

  // 배송
  delivery: {
    scrolling: string;
  };

  // 상품
  addToCart: string;
  buyNow: string;

  // 홈 화면에 추가 (PWA install banner)
  install: {
    line1: string;
    line2: string;
    open: string;
    close: string;
    title: string;
    iosShare: string;
    iosAdd: string;
    iosConfirm: string;
    androidMenu: string;
    androidAdd: string;
    inApp: string;
    copyLink: string;
    copied: string;
    gotIt: string;
  };
  price: string;
  stock: string;
  outOfStock: string;
  selectQuantity: string;
  quantity: string;
  packageUnit: string;
  minOrderQuantity: string;
  currentOrderTotal: string;
  quantityModalDesc: string;

  // 장바구니
  cartEmpty: string;
  cartEmptyDesc: string;
  viewProducts: string;
  cartItems: string;
  orderInfo: string;
  productTypes: string;
  totalQuantity: string;
  pieces: string;
  shippingFee: string;
  totalAmount: string;
  placeOrder: string;
  continueShopping: string;
  checkout: string;

  // 체크아웃 페이지
  bankTransfer: string;
  bankTransferDesc: string;
  selectBank: string;
  defaultAccount: string;
  copyAccountNumber: string;
  bankInfoNotFound: string;
  transferSenderName: string;
  transferSenderNamePlaceholder: string;
  transferSenderNameDesc: string;
  processingPayment: string;

  // 장바구니 아이템
  total: string;
  remove: string;
  decrease: string;
  increase: string;

  // 푸터
  adminLogin: string;
  copyright: string;
  visitPage: string;

  // 마이페이지
  myPage: string;
  userInfo: string;
  userInfoDesc: string;
  orderHistory: string;
  orderHistoryDesc: string;
  name: string;
  phone: string;
  email: string;
  noOrders: string;
  noOrdersDesc: string;
  orderedProducts: string;
  deliveryInfo: string;
  paymentInfo: string;
  recipient: string;
  address: string;
  paymentStatus: string;
  orderNumber: string;
  totalItems: string;
  orderDate: string;
  showMore: string;
  showDetails: string;
  collapse: string;

  // 주문 상태
  orderStatus: {
    pending: string;
    processing: string;
    completed: string;
    cancelled: string;
  };
  // Web Push (My Page notification card)
  push: {
    title: string;
    desc: string;
    on: string;
    turnOn: string;
    turnOff: string;
    test: string;
    testSent: string;
    needsInstall: string;
    denied: string;
    unsupported: string;
    error: string;
  };
  // My Page delivery tracker (title / sub / chip per status, then stops)
  orderTracker: {
    pending: { title: string; sub: string; chip: string };
    processing: { title: string; sub: string; chip: string };
    completed: { title: string; sub: string; chip: string };
    cancelled: { title: string; sub: string; chip: string; note: string };
    stops: [string, string, string];
    eta: string;
  };
  bank: string;
  accountHolder: string;
  accountNumber: string;
  loadingBankInfo: string;
  loadingOrderHistory: string;
  retry: string;

  // 인증
  usernameOrEmail: string;
  password: string;
  confirmPassword: string;
  username: string;
  signup: string;
  signUp: string;
  signIn: string;
  login: string;
  register: string;
  loggingIn: string;
  signingIn: string;
  signingUp: string;
  alreadyHaveAccount: string;
  noAccount: string;
  phoneFormat: string;
  phoneHint: string;
  authHeroTitle: string;
  authHeroDesc: string;
  directDelivery: string;
  viewOrderHistory: string;
  fastPayment: string;
  or: string;
  orContinueWith: string;
  continueWithGoogle: string;

  // 기타
  loading: string;
  error: string;
  success: string;

  // 토스트 메시지
  toast: {
    success: string;
    error: string;
    cartAdded: string;
    cartAddedDesc: string;
    loginRequired: string;
    loginRequiredDesc: string;
    addToCartError: string;
    addToCartErrorDesc: string;
    loginSuccess: string;
    loginSuccessDesc: string;
    loginSuccessWelcome: string;
    loginFailed: string;
    loginFailedDesc: string;
    registerSuccess: string;
    registerSuccessDesc: string;
    registerFailed: string;
    registerFailedDesc: string;
    logoutSuccess: string;
    logoutSuccessDesc: string;
    logoutFailed: string;
    logoutFailedDesc: string;
  };

  // 폼 검증 메시지
  formErrors: {
    required: string;
    invalidEmail: string;
    passwordMismatch: string;
    minLength: string;
    maxLength: string;
    invalidPhone: string;
    usernameExists: string;
    emailExists: string;
  };

  // 모바일 네비게이션
  mobileNav: {
    home: string;
    cart: string;
    profile: string;
  };
}

// 번역 데이터
const translations: Record<Language, Translations> = {
  mn: {
    // 공통
    home: "Нүүр",
    products: "Бүтээгдэхүүн",
    contact: "Холбоо барих",
    cart: "Сагс",
    profile: "Миний мэдээлэл",
    logout: "Гарах",
    menu: "Цэс",
    siteTitle: "Meat Mall",

    // 홈페이지
    heroTitle: "Meat Mall",
    heroSubtitle: "Хамгийн чанартайг хэрэглэгч та бүхэндээ хүргэж байна.",
    featuredProducts: "Манай бүтээгдэхүүнүүд",
    featuredProductsDesc: "Хамгийн амтлаг чанартайг та бүхэндээ",
    categories: {
      all: "Бүгд",
      beef: "Үхрийн мах",
      lamb: "Хонины мах",
      chicken: "Тахианы мах",
      pork: "Гахайн мах",
      other: "Бусад",
      swipeHint: "Хажуу тийш гүйлгэж харна уу",
    },

    // 배송
    delivery: {
      scrolling:
        "Бүх хот руу хүргэлт үйлчилгээтэй ● Бүх хот руу хүргэлт үйлчилгээтэй ● Бүх хот руу хүргэлт үйлчилгээтэй ● Бүх хот руу хүргэлт үйлчилгээтэй",
    },

    // 상품
    addToCart: "Сагсанд нэмэх",
    buyNow: "Шууд захиалах",
    install: {
      line1: "Нүүр дэлгэцэнд нэмбэл",
      line2: "Апп шиг нээгдэнэ",
      open: "Апп шиг нээх",
      close: "Хаах",
      title: "Нүүр дэлгэцэнд нэмэх",
      iosShare: "Safari-ийн доод хэсэгт байрлах «Хуваалцах» товчийг дарна",
      iosAdd: "«Нүүр дэлгэцэнд нэмэх» (Add to Home Screen)-ийг сонгоно",
      iosConfirm: "Баруун дээд буланд «Нэмэх» (Add)-ийг дарна",
      androidMenu: "Хөтчийн цэс (⋮ эсвэл ≡)-ийг дарна",
      androidAdd: "«Нүүр дэлгэцэнд нэмэх» эсвэл «Апп суулгах»-ыг сонгоно",
      inApp:
        "Энэ апп доторх хөтчөөс нүүр дэлгэцэнд нэмэх боломжгүй. Холбоосыг хуулаад Safari эсвэл Chrome-оор нээнэ үү.",
      copyLink: "Холбоос хуулах",
      copied: "Хуулагдлаа",
      gotIt: "Ойлголоо",
    },
    price: "Үнэ",
    stock: "Нөөц",
    outOfStock: "Дууссан",
    selectQuantity: "Тоо ширхэг сонгох",
    quantity: "Тоо ширхэг",
    packageUnit: "4кг-ын багцаар",
    minOrderQuantity: "Хамгийн багадаа {min}кг",
    currentOrderTotal: "Та одоогоор нийт {total} ₩-ийн захиалга хийсэн байна.",
    quantityModalDesc: "Бүтээгдэхүүний тоо ширхэг сонгох цонх",

    // 장바구니
    cartEmpty: "Таны сагс хоосон байна",
    cartEmptyDesc: 'Бүтээгдэхүүн сонгоод "Сагсанд нэмэх" товчийг дарна уу.',
    viewProducts: "Бүтээгдэхүүн харах",
    cartItems: "Сагсны бүтээгдэхүүн",
    orderInfo: "Захиалгын мэдээлэл",
    productTypes: "төрөл",
    totalQuantity: "Нийт тоо",
    pieces: "ширхэг",
    shippingFee: "Хүргэлтийн төлбөр",
    totalAmount: "Нийт дүн",
    placeOrder: "Захиалга хийх",
    continueShopping: "Үргэлжлүүлэн худалдан авах",
    checkout: "Захиалга өгөх",

    // 체크아웃 페이지
    bankTransfer: "Банк шилжүүлэг",
    bankTransferDesc: "Төлбөр тооцооны дараах дансанд хийнэ:",
    selectBank: "Банк сонгоно уу",
    defaultAccount: "Үндсэн данс",
    copyAccountNumber: "Дансны дугаар хуулах",
    bankInfoNotFound:
      "Банкны мэдээлэл олдсонгүй. Имэйлээс дансны мэдээллийг шалгана уу.",
    transferSenderName: "Шилжүүлсэн хүний нэр",
    transferSenderNamePlaceholder: "Нэрээ бичнэ үү",
    transferSenderNameDesc: "Банкны шилжүүлэг хийж буй хүний нэрийг оруулна уу",
    processingPayment: "Төлбөр баталгаажуулж байна...",

    // 장바구니 아이템
    total: "Нийт",
    remove: "Устгах",
    decrease: "Хасах",
    increase: "Нэмэх",

    // 푸터
    adminLogin: "Админ нэвтрэх",
    copyright: "© 2025 Meat Mall. Бүх эрх хуулиар хамгаалагдсан.",
    visitPage: "Хаяг руу очих",

    // 마이페이지
    myPage: "Миний хуудас",
    userInfo: "Хэрэглэгчийн мэдээлэл",
    userInfoDesc: "Хэрэглэгчийн болон захиалгын мэдээлэл",
    orderHistory: "Захиалгын түүх",
    orderHistoryDesc: "Таны захиалгын түүх",
    name: "Нэр",
    phone: "Утас",
    email: "Имэйл",
    noOrders: "Захиалгын түүх байхгүй байна",
    noOrdersDesc:
      "Бүтээгдэхүүн худалдаж авахын тулд нүүр хуудас руу шилжинэ үү.",
    orderedProducts: "Захиалсан бүтээгдэхүүн",
    deliveryInfo: "Хүргэлтийн мэдээлэл",
    paymentInfo: "Төлбөрийн мэдээлэл",
    recipient: "Хүлээн авагч",
    address: "Хаяг",
    paymentStatus: "Төлбөрийн төлөв",
    orderNumber: "Захиалгын дугаар",
    totalItems: "Нийт",
    orderDate: "Огноо",
    showMore: "илүү үзэх...",
    showDetails: "Дэлгэрэнгүй",
    collapse: "Хураангуйлах",

    // 주문 상태
    orderStatus: {
      pending: "Төлбөр төлөлт хүлээгдэж байна",
      processing: "Төлбөр төлөгдсөн",
      completed: "Хүргэгдсэн",
      cancelled: "Цуцлагдсан",
    },
    push: {
      title: "Захиалгын мэдэгдэл",
      desc: "Төлбөр баталгаажих, хүргэгдэх үед утсанд тань мэдэгдэл ирнэ.",
      on: "Асаалттай",
      turnOn: "Мэдэгдэл асаах",
      turnOff: "Унтраах",
      test: "Туршиж үзэх",
      testSent: "Туршилтын мэдэгдэл илгээлээ",
      needsInstall: "iPhone дээр мэдэгдэл авахын тулд эхлээд Meat Mall-ийг нүүр дэлгэц рүү нэмээд, тэндээс нээнэ үү.",
      denied: "Мэдэгдэл хаагдсан байна. Утасны тохиргооноос Meat Mall-д мэдэгдэл зөвшөөрнө үү.",
      unsupported: "Энэ хөтөч мэдэгдэл дэмжихгүй байна. Chrome эсвэл Samsung Internet ашиглана уу.",
      error: "Мэдэгдэл асаахад алдаа гарлаа. Дахин оролдоно уу.",
    },
    orderTracker: {
      pending: {
        title: "Төлбөр хүлээгдэж байна",
        sub: "Дансаар шилжүүлсний дараа захиалга баталгаажна",
        chip: "Хүлээгдэж",
      },
      processing: {
        title: "Захиалгыг тань бэлтгэж байна",
        sub: "Төлбөр баталгаажлаа. Шинэхэн махыг тань савлаж хүргэнэ.",
        chip: "Хүргэлтэд",
      },
      completed: {
        title: "Хүргэгдлээ!",
        sub: "Шинэхэн махаа хөргөгчиндөө хадгалаарай. Дахин захиалаарай!",
        chip: "Хүргэгдсэн",
      },
      cancelled: {
        title: "Захиалга цуцлагдсан",
        sub: "Асуух зүйл байвал бидэнтэй холбогдоорой.",
        chip: "Цуцлагдсан",
        note: "Энэ захиалга цуцлагдсан тул хүргэлт хийгдэхгүй.",
      },
      stops: ["Захиалга", "Төлбөр", "Хүргэгдсэн"],
      eta: "Хүргэгдэх өдөр",
    },
    bank: "Банк",
    accountHolder: "Эзэмшигч",
    accountNumber: "Дансны дугаар",
    loadingBankInfo: "Банкны данс мэдээлэл ачааллаж байна...",
    loadingOrderHistory: "Захиалгын түүхийг ачааллаж байна...",
    retry: "Дахин оролдох",

    // 인증
    usernameOrEmail: "Хэрэглэгчийн нэр эсвэл И-мэйл",
    password: "Нууц үг",
    confirmPassword: "Нууц үг баталгаажуулах",
    username: "Хэрэглэгчийн нэр",
    signup: "Бүртгүүлэх",
    signUp: "Бүртгүүлэх",
    signIn: "Нэвтрэх",
    login: "Нэвтрэх",
    register: "Бүртгүүлэх",
    loggingIn: "Нэвтэрч байна...",
    signingIn: "Нэвтэрч байна...",
    signingUp: "Бүртгэж байна...",
    alreadyHaveAccount: "Хэдийн бүртгэлтэй юу?",
    noAccount: "Бүртгэлгүй юу?",
    phoneFormat: "Солонгос утасны дугаар хэлбэр: 010-0000-0000",
    phoneHint: "Солонгос утасны дугаар хэлбэр: 010-0000-0000",
    authHeroTitle: "Meat Mall",
    authHeroDesc: "Хэрэглэгчийн бүртгэл үүсгээд захиалгынхаа түүхийг хянаарай",
    directDelivery: "Үсэхсэн зах руу шууд хүргэлт",
    viewOrderHistory: "Захиалгын түүхээ харах",
    fastPayment: "Хурдан, найдвартай төлбөр тооцоо",
    or: "Эсвэл",
    orContinueWith: "Эсвэл",
    continueWithGoogle: "Google-ээр нэвтрэх",

    // 기타
    loading: "Ачааллаж байна...",
    error: "Алдаа гарлаа",
    success: "Амжилттай",

    // 토스트 메시지
    toast: {
      success: "Амжилттай",
      error: "Алдаа",
      cartAdded: "🛒 Сагсанд нэмлээ",
      cartAddedDesc: "сагсанд нэмэгдлээ",
      loginRequired: "Нэвтрэх шаардлагатай",
      loginRequiredDesc:
        "Бүтээгдэхүүнийг сагсанд нэмэхийн тулд нэвтрэх эсвэл бүртгүүлэх шаардлагатай.",
      addToCartError: "Алдаа гарлаа",
      addToCartErrorDesc: "Бүтээгдэхүүнийг сагсанд нэмэх үед алдаа гарлаа.",
      loginSuccess: "Амжилттай нэвтэрлээ",
      loginSuccessDesc: "Амжилттай нэвтэрлээ",
      loginSuccessWelcome: "Сайн байна уу",
      loginFailed: "Нэвтрэх боломжгүй",
      loginFailedDesc: "Хэрэглэгчийн нэр эсвэл нууц үг буруу байна",
      registerSuccess: "Бүртгэл амжилттай",
      registerSuccessDesc: "Таны бүртгэл амжилттай үүслээ.",
      registerFailed: "Бүртгэхэд алдаа гарлаа",
      registerFailedDesc: "Бүртгэл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
      logoutSuccess: "Амжилттай гарлаа",
      logoutSuccessDesc: "Та системээс гарлаа.",
      logoutFailed: "Гарахад алдаа гарлаа",
      logoutFailedDesc: "Системээс гарахад алдаа гарлаа",
    },

    // 폼 검증 메시지
    formErrors: {
      required: "Заавал бөглөх шаардлагатай",
      invalidEmail: "И-мэйл хаяг буруу байна",
      passwordMismatch: "Нууц үг таарахгүй байна",
      minLength: "Хэт богино байна",
      maxLength: "Хэт урт байна",
      invalidPhone: "Утасны дугаар буруу байна",
      usernameExists: "Хэрэглэгчийн нэр аль хэдийн бүртгэлтэй байна",
      emailExists: "И-мэйл хаяг аль хэдийн бүртгэлтэй байна",
    },

    // 모바일 네비게이션
    mobileNav: {
      home: "Нүүр",
      cart: "Сагс",
      profile: "Миний мэдээлэл",
    },
  },

  ru: {
    // 공통
    home: "Главная",
    products: "Продукты",
    contact: "Контакты",
    cart: "Корзина",
    profile: "Мой профиль",
    logout: "Выйти",
    menu: "Меню",
    siteTitle: "Meat Mall",

    // 홈페이지
    heroTitle: "Meat Mall",
    heroSubtitle: "Не откладывай мясо, которое можно съесть сегодня, на завтра",
    featuredProducts: "Рекомендуемые товары",
    featuredProductsDesc:
      "Лучшие мясные продукты высокого качества в нашем магазине",
    categories: {
      all: "Все",
      beef: "Говядина",
      lamb: "Баранина",
      chicken: "Курица",
      pork: "Свинина",
      other: "Другое",
      swipeHint: "Проведите пальцем для просмотра",
    },

    // 배송
    delivery: {
      scrolling:
        "Доставка по всем городам ● Доставка по всем городам ● Доставка по всем городам ● Доставка по всем городам",
    },

    // 상품
    addToCart: "В корзину",
    buyNow: "Купить сейчас",
    install: {
      line1: "Добавьте на главный экран",
      line2: "Как приложение",
      open: "Добавить",
      close: "Закрыть",
      title: "Добавить на главный экран",
      iosShare: "Нажмите кнопку «Поделиться» внизу Safari",
      iosAdd: "Выберите «На экран „Домой“»",
      iosConfirm: "Нажмите «Добавить» в правом верхнем углу",
      androidMenu: "Откройте меню браузера (⋮ или ≡)",
      androidAdd: "Выберите «Добавить на главный экран» или «Установить приложение»",
      inApp:
        "Из встроенного браузера этого приложения добавить нельзя. Скопируйте ссылку и откройте её в Safari или Chrome.",
      copyLink: "Скопировать ссылку",
      copied: "Скопировано",
      gotIt: "Понятно",
    },
    price: "Цена",
    stock: "В наличии",
    outOfStock: "Нет в наличии",
    selectQuantity: "Выбрать количество",
    quantity: "Количество",
    packageUnit: "Упаковкой по 4кг",
    minOrderQuantity: "Минимум {min}кг",
    currentOrderTotal: "Вы заказали на общую сумму {total} ₩.",
    quantityModalDesc: "Окно выбора количества товара",

    // 장바구니
    cartEmpty: "Ваша корзина пуста",
    cartEmptyDesc: 'Выберите товары и нажмите кнопку "Добавить в корзину".',
    viewProducts: "Посмотреть товары",
    cartItems: "Товары в корзине",
    orderInfo: "Информация о заказе",
    productTypes: "видов",
    totalQuantity: "Общее количество",
    pieces: "шт.",
    shippingFee: "Стоимость доставки",
    totalAmount: "Итого",
    placeOrder: "Оформить заказ",
    continueShopping: "Продолжить покупки",
    checkout: "Оформить заказ",

    // 체크아웃 페이지
    bankTransfer: "Банковский перевод",
    bankTransferDesc: "Оплата будет произведена на следующий счет:",
    selectBank: "Выберите банк",
    defaultAccount: "Основной счет",
    copyAccountNumber: "Скопировать номер счета",
    bankInfoNotFound:
      "Информация о банке не найдена. Проверьте данные счета в email.",
    transferSenderName: "Имя отправителя",
    transferSenderNamePlaceholder: "Введите ваше имя",
    transferSenderNameDesc:
      "Введите имя лица, осуществляющего банковский перевод",
    processingPayment: "Подтверждение оплаты...",

    // 장바구니 아이템
    total: "Итого",
    remove: "Удалить",
    decrease: "Уменьшить",
    increase: "Увеличить",

    // 푸터
    adminLogin: "Войти как админ",
    copyright: "© 2025 Meat Mall. Все права защищены.",
    visitPage: "Перейти на страницу",

    // 마이페이지
    myPage: "Моя страница",
    userInfo: "Информация о пользователе",
    userInfoDesc: "Информация о пользователе и заказах",
    orderHistory: "История заказов",
    orderHistoryDesc: "Ваша история заказов",
    name: "Имя",
    phone: "Телефон",
    email: "Email",
    noOrders: "История заказов отсутствует",
    noOrdersDesc: "Перейдите на главную страницу, чтобы купить товары.",
    orderedProducts: "Заказанные товары",
    deliveryInfo: "Информация о доставке",
    paymentInfo: "Информация об оплате",
    recipient: "Получатель",
    address: "Адрес",
    paymentStatus: "Статус оплаты",
    orderNumber: "Номер заказа",
    totalItems: "Всего",
    orderDate: "Дата",
    showMore: "больше...",
    showDetails: "Подробнее",
    collapse: "Свернуть",

    // 주문 상태
    orderStatus: {
      pending: "Ожидание оплаты",
      processing: "Оплачено",
      completed: "Доставлено",
      cancelled: "Отменено",
    },
    push: {
      title: "Уведомления о заказе",
      desc: "Сообщим на телефон, когда оплата подтверждена и заказ доставлен.",
      on: "Включены",
      turnOn: "Включить уведомления",
      turnOff: "Выключить",
      test: "Проверить",
      testSent: "Тестовое уведомление отправлено",
      needsInstall: "На iPhone сначала добавьте Meat Mall на экран «Домой» и откройте его оттуда.",
      denied: "Уведомления заблокированы. Разрешите их для Meat Mall в настройках телефона.",
      unsupported: "Этот браузер не поддерживает уведомления. Используйте Chrome или Samsung Internet.",
      error: "Не удалось включить уведомления. Попробуйте ещё раз.",
    },
    orderTracker: {
      pending: {
        title: "Ожидаем оплату",
        sub: "Заказ подтвердится после банковского перевода",
        chip: "Ожидание",
      },
      processing: {
        title: "Готовим ваш заказ",
        sub: "Оплата получена. Упакуем свежее мясо и доставим.",
        chip: "Доставка",
      },
      completed: {
        title: "Доставлено!",
        sub: "Уберите свежее мясо в холодильник. Ждём вас снова!",
        chip: "Доставлено",
      },
      cancelled: {
        title: "Заказ отменён",
        sub: "Если есть вопросы, свяжитесь с нами.",
        chip: "Отменён",
        note: "Этот заказ отменён, доставки не будет.",
      },
      stops: ["Заказ", "Оплата", "Доставлено"],
      eta: "Дата доставки",
    },
    bank: "Банк",
    accountHolder: "Владелец",
    accountNumber: "Номер счета",
    loadingBankInfo: "Загрузка информации о банке...",
    loadingOrderHistory: "Загрузка истории заказов...",
    retry: "Повторить",

    // 인증
    usernameOrEmail: "Имя пользователя или Email",
    password: "Пароль",
    confirmPassword: "Подтвердить пароль",
    username: "Имя пользователя",
    signup: "Регистрация",
    signUp: "Регистрация",
    signIn: "Войти",
    login: "Войти",
    register: "Регистрация",
    loggingIn: "Вход...",
    signingIn: "Вход...",
    signingUp: "Регистрация...",
    alreadyHaveAccount: "Уже есть аккаунт?",
    noAccount: "Нет аккаунта?",
    phoneFormat: "Формат корейского номера: 010-0000-0000",
    phoneHint: "Формат корейского номера: 010-0000-0000",
    authHeroTitle: "НҮҮДЭЛЧИН ХҮНС",
    authHeroDesc: "Создайте учетную запись и отслеживайте историю заказов",
    directDelivery: "Прямая доставка на рынок",
    viewOrderHistory: "Просмотр истории заказов",
    fastPayment: "Быстрая и надежная оплата",
    or: "Или",
    orContinueWith: "Или",
    continueWithGoogle: "Войти через Google",

    // 기타
    loading: "Загрузка...",
    error: "Произошла ошибка",
    success: "Успешно",

    // 토스트 메시지
    toast: {
      success: "Успешно",
      error: "Ошибка",
      cartAdded: "🛒 Добавлено в корзину",
      cartAddedDesc: "добавлено в корзину",
      loginRequired: "Требуется вход",
      loginRequiredDesc:
        "Для добавления товаров в корзину необходимо войти в систему или зарегистрироваться.",
      addToCartError: "Произошла ошибка",
      addToCartErrorDesc: "Ошибка при добавлении товара в корзину.",
      loginSuccess: "Успешный вход",
      loginSuccessDesc: "Успешный вход в систему",
      loginSuccessWelcome: "Здравствуйте",
      loginFailed: "Ошибка входа",
      loginFailedDesc: "Неправильное имя пользователя или пароль",
      registerSuccess: "Регистрация успешна",
      registerSuccessDesc: "Ваша учетная запись успешно создана.",
      registerFailed: "Ошибка регистрации",
      registerFailedDesc:
        "Ошибка при создании учетной записи. Попробуйте еще раз.",
      logoutSuccess: "Успешный выход",
      logoutSuccessDesc: "Вы вышли из системы.",
      logoutFailed: "Ошибка выхода",
      logoutFailedDesc: "Ошибка при выходе из системы",
    },

    // 폼 검증 메시지
    formErrors: {
      required: "Поле обязательно для заполнения",
      invalidEmail: "Неверный адрес электронной почты",
      passwordMismatch: "Пароли не совпадают",
      minLength: "Слишком короткое",
      maxLength: "Слишком длинное",
      invalidPhone: "Неверный номер телефона",
      usernameExists: "Имя пользователя уже зарегистрировано",
      emailExists: "Электронная почта уже зарегистрирована",
    },

    // 모바일 네비게이션
    mobileNav: {
      home: "Главная",
      cart: "Корзина",
      profile: "Мой профиль",
    },
  },

  en: {
    // 공통
    home: "Home",
    products: "Products",
    contact: "Contact",
    cart: "Cart",
    profile: "My Profile",
    logout: "Logout",
    menu: "Menu",
    siteTitle: "Meat Mall",

    // 홈페이지
    heroTitle: "Meat Mall",
    heroSubtitle:
      "Don't put off eating the meat you can enjoy today until tomorrow",
    featuredProducts: "Featured Products",
    featuredProductsDesc: "The finest quality meat products from our store",
    categories: {
      all: "All",
      beef: "Beef",
      lamb: "Lamb",
      chicken: "Chicken",
      pork: "Pork",
      other: "Other",
      swipeHint: "Swipe to browse categories",
    },

    // 배송
    delivery: {
      scrolling:
        "Delivery to all cities ● Delivery to all cities ● Delivery to all cities ● Delivery to all cities",
    },

    // 상품
    addToCart: "Add to Cart",
    buyNow: "Buy now",
    install: {
      line1: "Add it to your home screen",
      line2: "Opens like an app",
      open: "Add to Home",
      close: "Close",
      title: "Add to Home Screen",
      iosShare: "Tap the Share button at the bottom of Safari",
      iosAdd: "Choose “Add to Home Screen”",
      iosConfirm: "Tap “Add” in the top-right corner",
      androidMenu: "Open the browser menu (⋮ or ≡)",
      androidAdd: "Choose “Add to Home screen” or “Install app”",
      inApp:
        "This in-app browser can't add to the home screen. Copy the link and open it in Safari or Chrome.",
      copyLink: "Copy link",
      copied: "Copied",
      gotIt: "Got it",
    },
    price: "Price",
    stock: "Stock",
    outOfStock: "Out of Stock",
    selectQuantity: "Select Quantity",
    quantity: "Quantity",
    packageUnit: "4kg package only",
    minOrderQuantity: "Minimum {min}kg",
    currentOrderTotal: "Your current order total is {total} ₩.",
    quantityModalDesc: "Product quantity selection dialog",

    // 장바구니
    cartEmpty: "Your cart is empty",
    cartEmptyDesc: 'Select products and click "Add to Cart" button.',
    viewProducts: "View Products",
    cartItems: "Cart Items",
    orderInfo: "Order Information",
    productTypes: "types",
    totalQuantity: "Total Quantity",
    pieces: "pcs",
    shippingFee: "Shipping Fee",
    totalAmount: "Total Amount",
    placeOrder: "Place Order",
    continueShopping: "Continue Shopping",
    checkout: "Checkout",

    // 체크아웃 페이지
    bankTransfer: "Bank Transfer",
    bankTransferDesc: "Payment will be made to the following account:",
    selectBank: "Select Bank",
    defaultAccount: "Default Account",
    copyAccountNumber: "Copy Account Number",
    bankInfoNotFound:
      "Bank information not found. Please check account details in email.",
    transferSenderName: "Sender Name",
    transferSenderNamePlaceholder: "Enter your name",
    transferSenderNameDesc:
      "Please enter the name of the person making the bank transfer",
    processingPayment: "Processing payment...",

    // 장바구니 아이템
    total: "Total",
    remove: "Remove",
    decrease: "Decrease",
    increase: "Increase",

    // 푸터
    adminLogin: "Admin Login",
    copyright: "© 2025 Meat Mall. All rights reserved.",
    visitPage: "Visit Page",

    // 마이페이지
    myPage: "My Page",
    userInfo: "User Information",
    userInfoDesc: "User and order information",
    orderHistory: "Order History",
    orderHistoryDesc: "Your order history",
    name: "Name",
    phone: "Phone",
    email: "Email",
    noOrders: "No order history",
    noOrdersDesc: "Go to home page to purchase products.",
    orderedProducts: "Ordered Products",
    deliveryInfo: "Delivery Information",
    paymentInfo: "Payment Information",
    recipient: "Recipient",
    address: "Address",
    paymentStatus: "Payment Status",
    orderNumber: "Order Number",
    totalItems: "Total",
    orderDate: "Date",
    showMore: "more...",
    showDetails: "Details",
    collapse: "Collapse",

    // 주문 상태
    orderStatus: {
      pending: "Payment Pending",
      processing: "Payment Received",
      completed: "Delivered",
      cancelled: "Cancelled",
    },
    push: {
      title: "Order notifications",
      desc: "Get a notification when your payment is confirmed and your order is delivered.",
      on: "On",
      turnOn: "Turn on notifications",
      turnOff: "Turn off",
      test: "Send test",
      testSent: "Test notification sent",
      needsInstall: "On iPhone, first add Meat Mall to your Home Screen and open it from there.",
      denied: "Notifications are blocked. Allow them for Meat Mall in your phone settings.",
      unsupported: "This browser doesn't support notifications. Please use Chrome or Samsung Internet.",
      error: "Couldn't turn on notifications. Please try again.",
    },
    orderTracker: {
      pending: {
        title: "Waiting for payment",
        sub: "Your order is confirmed after the bank transfer",
        chip: "Waiting",
      },
      processing: {
        title: "Preparing your order",
        sub: "Payment received. We're packing your fresh meat.",
        chip: "On the way",
      },
      completed: {
        title: "Delivered!",
        sub: "Please keep your fresh meat refrigerated. See you again!",
        chip: "Delivered",
      },
      cancelled: {
        title: "Order cancelled",
        sub: "Contact us if you have any questions.",
        chip: "Cancelled",
        note: "This order was cancelled and won't be delivered.",
      },
      stops: ["Ordered", "Paid", "Delivered"],
      eta: "Delivery date",
    },
    bank: "Bank",
    accountHolder: "Account Holder",
    accountNumber: "Account Number",
    loadingBankInfo: "Loading bank information...",
    loadingOrderHistory: "Loading order history...",
    retry: "Retry",

    // 인증
    usernameOrEmail: "Username or Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    username: "Username",
    signup: "Register",
    signUp: "Register",
    signIn: "Sign In",
    login: "Login",
    register: "Register",
    loggingIn: "Logging in...",
    signingIn: "Signing in...",
    signingUp: "Signing up...",
    alreadyHaveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    phoneFormat: "Korean phone format: 010-0000-0000",
    phoneHint: "Korean phone format: 010-0000-0000",
    authHeroTitle: "НҮҮДЭЛЧИН ХҮНС",
    authHeroDesc: "Create an account and track your order history",
    directDelivery: "Direct delivery to market",
    viewOrderHistory: "View order history",
    fastPayment: "Fast and reliable payment",
    or: "Or",
    orContinueWith: "Or",
    continueWithGoogle: "Continue with Google",

    // 기타
    loading: "Loading...",
    error: "An error occurred",
    success: "Success",

    // 토스트 메시지
    toast: {
      success: "Success",
      error: "Error",
      cartAdded: "🛒 Added to Cart",
      cartAddedDesc: "added to cart",
      loginRequired: "Login Required",
      loginRequiredDesc: "Please login or register to add items to cart.",
      addToCartError: "Error Occurred",
      addToCartErrorDesc: "Error adding item to cart.",
      loginSuccess: "Login Successful",
      loginSuccessDesc: "Successfully logged in",
      loginSuccessWelcome: "Hello",
      loginFailed: "Login Failed",
      loginFailedDesc: "Incorrect username or password",
      registerSuccess: "Registration Successful",
      registerSuccessDesc: "Your account has been successfully created.",
      registerFailed: "Registration Failed",
      registerFailedDesc: "Error creating account. Please try again.",
      logoutSuccess: "Logout Successful",
      logoutSuccessDesc: "You have been logged out.",
      logoutFailed: "Logout Failed",
      logoutFailedDesc: "Error logging out of the system",
    },

    // 폼 검증 메시지
    formErrors: {
      required: "This field is required",
      invalidEmail: "Invalid email address",
      passwordMismatch: "Passwords do not match",
      minLength: "Too short",
      maxLength: "Too long",
      invalidPhone: "Invalid phone number",
      usernameExists: "Username already registered",
      emailExists: "Email already registered",
    },

    // 모바일 네비게이션
    mobileNav: {
      home: "Home",
      cart: "Cart",
      profile: "My Profile",
    },
  },
};

// 언어 컨텍스트 타입
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

// 언어 컨텍스트 생성
const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

// 언어 프로바이더 컴포넌트
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setCurrentLanguage] = useState<Language>("mn");

  // Force language to 'mn' regardless of previous settings
  useEffect(() => {
    localStorage.removeItem("preferred-language");
  }, []);

  // 언어 변경 함수
  const setLanguage = (lang: Language) => {
    setCurrentLanguage("mn");
    localStorage.setItem("preferred-language", "mn");
  };

  // 현재 언어의 번역 데이터
  const t = translations[language];

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// 언어 컨텍스트 사용 훅
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// 다국어 상품 이름 가져오기 유틸리티 함수
export function getLocalizedProductName(
  product: any,
  language: Language,
): string {
  switch (language) {
    case "ru":
      return product.nameRu || product.name;
    case "en":
      return product.nameEn || product.name;
    default:
      return product.name;
  }
}

// 다국어 상품 설명 가져오기 유틸리티 함수
export function getLocalizedProductDescription(
  product: any,
  language: Language,
): string {
  switch (language) {
    case "ru":
      return product.descriptionRu || product.description;
    case "en":
      return product.descriptionEn || product.description;
    default:
      return product.description;
  }
}
