import Stripe from 'stripe';

const DISCOUNT_CODE = 'WEALTH11';
const FULL_PRICE = 29900; // $299.00 in cents
const DISCOUNT_PRICE = 1100; // $11.00 in cents

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe not configured on server.' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  const { discountCode } = req.body;
  const useDiscount = (discountCode || '').trim().toUpperCase() === DISCOUNT_CODE;
  const price = useDiscount ? DISCOUNT_PRICE : FULL_PRICE;
  const label = useDiscount ? 'Wealth 10.0 Credit Analysis (Discount Applied)' : 'Wealth 10.0 Credit Analysis';

  try {
    const origin = req.headers.origin || 'https://wealth-10.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: label,
            description: 'AI-powered credit report analysis — full 14-section funding intelligence report',
          },
          unit_amount: price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        discountApplied: useDiscount ? 'yes' : 'no',
      }
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
