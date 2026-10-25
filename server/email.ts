import { MailService } from '@sendgrid/mail';
import type { Order, User } from '../shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

// 발신자 이메일 주소 (SendGrid에서 인증된 도메인/이메일)
const FROM_EMAIL = 'noreply@arvijix.com'; // 실제 SendGrid에서 인증된 이메일로 변경하세요

interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  deliveryAddress: string;
  phoneNumber: string;
}

/**
 * 회원가입 환영 이메일 발송
 */
export async function sendWelcomeEmail(userData: WelcomeEmailData): Promise<boolean> {
  try {
    const msg = {
      to: userData.userEmail,
      from: FROM_EMAIL,
      templateId: 'd-welcome-template-id', // SendGrid에서 생성한 실제 템플릿 ID로 변경하세요
      dynamicTemplateData: {
        userName: userData.userName,
        companyName: 'Арвижих махны дэлгүүр',
        loginUrl: 'https://gerinmah.replit.app/auth',
        supportEmail: 'support@arvijix.com'
      }
    };

    await mailService.send(msg);
    console.log(`Welcome email sent to ${userData.userEmail}`);
    return true;
  } catch (error) {
    console.error('Welcome email sending failed:', error);
    return false;
  }
}

/**
 * 주문 확인 이메일 발송
 */
export async function sendOrderConfirmationEmail(orderData: OrderConfirmationData): Promise<boolean> {
  try {
    const msg = {
      to: orderData.customerEmail,
      from: FROM_EMAIL,
      templateId: 'd-order-confirmation-template-id', // SendGrid에서 생성한 실제 템플릿 ID로 변경하세요
      dynamicTemplateData: {
        customerName: orderData.customerName,
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        deliveryAddress: orderData.deliveryAddress,
        phoneNumber: orderData.phoneNumber,
        companyName: 'Арвижих махны дэлгүүр',
        companyPhone: '+976 8888 8888',
        companyAddress: '울란바토르 시',
        trackingUrl: `https://gerinmah.replit.app/profile?order=${orderData.orderNumber}`,
        supportEmail: 'support@arvijix.com'
      }
    };

    await mailService.send(msg);
    console.log(`Order confirmation email sent to ${orderData.customerEmail}`);
    return true;
  } catch (error) {
    console.error('Order confirmation email sending failed:', error);
    return false;
  }
}

/**
 * 관리자에게 새 주문 알림 이메일 발송
 */
export async function sendNewOrderNotificationEmail(orderData: OrderConfirmationData): Promise<boolean> {
  try {
    const msg = {
      to: 'admin@arvijix.com', // 관리자 이메일
      from: FROM_EMAIL,
      templateId: 'd-new-order-notification-template-id', // SendGrid에서 생성한 실제 템플릿 ID로 변경하세요
      dynamicTemplateData: {
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        deliveryAddress: orderData.deliveryAddress,
        phoneNumber: orderData.phoneNumber,
        adminDashboardUrl: 'https://gerinmah.replit.app/admin'
      }
    };

    await mailService.send(msg);
    console.log(`New order notification email sent to admin`);
    return true;
  } catch (error) {
    console.error('New order notification email sending failed:', error);
    return false;
  }
}

/**
 * 이메일 템플릿 테스트 함수
 */
export async function testEmailTemplate(templateId: string, testEmail: string): Promise<boolean> {
  try {
    const msg = {
      to: testEmail,
      from: FROM_EMAIL,
      templateId: templateId,
      dynamicTemplateData: {
        userName: '테스트 사용자',
        customerName: '테스트 고객',
        orderNumber: 'TEST-001',
        orderDate: new Date().toLocaleDateString('ko-KR'),
        totalAmount: '50,000원',
        items: [
          { name: '테스트 상품', quantity: 1, price: '25,000원' },
          { name: '테스트 상품 2', quantity: 2, price: '25,000원' }
        ],
        deliveryAddress: '테스트 주소',
        phoneNumber: '010-1234-5678',
        companyName: 'Арвижих махны дэлгүүр'
      }
    };

    await mailService.send(msg);
    console.log(`Test email sent to ${testEmail}`);
    return true;
  } catch (error) {
    console.error('Test email sending failed:', error);
    return false;
  }
}