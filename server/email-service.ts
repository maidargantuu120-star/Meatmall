import sgMail from '@sendgrid/mail';

// SendGrid API 키 설정
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailData {
  to: string;
  templateId: string;
  dynamicTemplateData: Record<string, any>;
  from?: string;
}

// 기본 발신자 이메일 (SendGrid에서 인증된 이메일 사용)
const DEFAULT_FROM_EMAIL = 'noreply@gerinmah.com'; // 실제 인증된 이메일로 변경 필요

/**
 * SendGrid 동적 템플릿을 사용하여 이메일 전송
 */
export async function sendTemplateEmail({
  to,
  templateId,
  dynamicTemplateData,
  from = DEFAULT_FROM_EMAIL
}: EmailData): Promise<boolean> {
  try {
    const msg = {
      to,
      from,
      templateId,
      dynamicTemplateData,
    };

    await sgMail.send(msg);
    console.log(`이메일 전송 성공: ${to} (템플릿: ${templateId})`);
    return true;
  } catch (error) {
    console.error('SendGrid 이메일 전송 실패:', error);
    return false;
  }
}

/**
 * 회원가입 환영 이메일 전송
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  templateId: string = 'welcome-template-id' // 실제 템플릿 ID로 변경
): Promise<boolean> {
  return await sendTemplateEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      userName,
      websiteName: 'Арвижих махны дэлгүүр',
      loginUrl: `${process.env.BASE_URL}/auth`,
    },
  });
}

/**
 * 주문 확인 이메일 전송
 */
export async function sendOrderConfirmationEmail(
  userEmail: string,
  orderData: {
    customerName: string;
    orderNumber: string;
    totalAmount: string;
    items: Array<{
      name: string;
      quantity: number;
      price: string;
    }>;
    deliveryAddress: string;
    phone: string;
  },
  templateId: string = 'order-confirmation-template-id' // 실제 템플릿 ID로 변경
): Promise<boolean> {
  return await sendTemplateEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...orderData,
      websiteName: 'Арвижих махны дэлгүүр',
      orderDate: new Date().toLocaleDateString('ko-KR'),
      supportEmail: 'support@gerinmah.com',
    },
  });
}

/**
 * 주문 상태 변경 알림 이메일 전송
 */
export async function sendOrderStatusUpdateEmail(
  userEmail: string,
  orderData: {
    customerName: string;
    orderNumber: string;
    newStatus: string;
    statusMessage: string;
  },
  templateId: string = 'order-status-update-template-id' // 실제 템플릿 ID로 변경
): Promise<boolean> {
  return await sendTemplateEmail({
    to: userEmail,
    templateId,
    dynamicTemplateData: {
      ...orderData,
      websiteName: 'Арвижих махны дэлгүүр',
      updateDate: new Date().toLocaleDateString('ko-KR'),
    },
  });
}