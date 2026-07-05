import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function generateReferralCode(email, productId) {
  const str = email + productId + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'ref_' + Math.abs(hash).toString(36);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, productId, referrer } = req.body;

  if (!email || !productId) {
    return res.status(400).json({ error: 'Email and productId required' });
  }

  const { data: existing } = await supabase
    .from('subscribers')
    .select('email')
    .eq('email', email)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'This email is already on the list!' });
  }

  const referralCode = generateReferralCode(email, productId);

  const { error } = await supabase
    .from('subscribers')
    .insert({
      email,
      product_id: productId,
      referral_code: referralCode,
      referrer_email: referrer || null
    });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json({ referralCode, message: 'Subscribed!' });
}