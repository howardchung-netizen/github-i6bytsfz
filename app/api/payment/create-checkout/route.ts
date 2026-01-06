import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 初始化 Stripe（使用服務器端的 Secret Key）
// 注意：如果未設置 STRIPE_SECRET_KEY，stripe 將為 null，需要在函數中檢查
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

export async function POST(request: Request) {
  try {
    // 檢查 Stripe 是否已配置
    if (!stripe) {
      return NextResponse.json(
        { 
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
          message: '支付服務尚未配置，請聯繫管理員或稍後再試。'
        },
        { status: 503 }
      );
    }

    const { plan, userId, userEmail } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: plan and userId' },
        { status: 400 }
      );
    }

    // 定義計劃價格（單位：分，HKD）
    const prices = {
      monthly: {
        amount: 9900, // HKD 99.00 = 9900 分
        name: '訂閱版（月付）',
        description: 'AI Math Tutor 月付訂閱',
      },
      yearly: {
        amount: 89900, // HKD 899.00 = 89900 分
        name: '訂閱版（年付）',
        description: 'AI Math Tutor 年付訂閱（節省 24%）',
      },
    };

    const selectedPrice = prices[plan as keyof typeof prices];
    
    if (!selectedPrice) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // 創建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'hkd',
            product_data: {
              name: selectedPrice.name,
              description: selectedPrice.description,
              images: [], // 可以添加產品圖片 URL
            },
            unit_amount: selectedPrice.amount,
            recurring: plan === 'monthly' 
              ? { interval: 'month' }
              : { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      mode: plan === 'monthly' ? 'subscription' : 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/subscription`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        plan: plan,
      },
      // 允許客戶在支付後更新訂閱
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
