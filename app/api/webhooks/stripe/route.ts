import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 初始化 Stripe（如果未配置則為 null）
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// 重要：禁用 Next.js 的 body parsing，因為我們需要原始 body 來驗證 webhook 簽名
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 檢查 Stripe 是否已配置
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      // 驗證 webhook 簽名
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // 處理不同的事件類型
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (userId) {
          // 更新資料庫中的用戶訂閱狀態
          // 注意：需要動態導入以避免在構建時出錯
          const { DB_SERVICE } = await import('../../../lib/db-service');
          await DB_SERVICE.updateUserSubscription(userId, true, session.subscription as string);
          console.log(`User ${userId} subscription activated`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const { DB_SERVICE } = await import('../../../lib/db-service');
          await DB_SERVICE.updateUserSubscription(userId, true, subscription.id);
          console.log(`User ${userId} subscription ${event.type}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const { DB_SERVICE } = await import('../../../lib/db-service');
          await DB_SERVICE.updateUserSubscription(userId, false);
          console.log(`User ${userId} subscription cancelled`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice ${invoice.id} payment succeeded`);
        // TODO: 處理續費成功
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice ${invoice.id} payment failed`);
        // TODO: 處理續費失敗，可能需要發送通知
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
