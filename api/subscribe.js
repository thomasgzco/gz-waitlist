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
  // Enable CORS for testing (optional)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, productId, referrer } = req.body;

  if (!email || !productId) {
    return res.status(400).json({ error: 'Email and productId required' });
  }

  try {
    // Check if already subscribed
    const { data: existing, error: checkError } = await supabase
      .from('subscribers')
      .select('email')
      .eq('email', email)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
      return res.status(500).json({ error: 'Database check error: ' + checkError.message });
    }

    if (existing) {
      return res.status(400).json({ error: 'This email is already on the list!' });
    }

    const referralCode = generateReferralCode(email, productId);

    const { error: insertError } = await supabase
      .from('subscribers')
      .insert({
        email,
        product_id: productId,
        referral_code: referralCode,
        referrer_email: referrer || null
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Insert error: ' + insertError.message });
    }

    return res.status(200).json({ referralCode, message: 'Subscribed!' });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error: ' + err.message });
  }
}
