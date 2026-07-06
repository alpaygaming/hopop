require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
// const Iyzipay = require('iyzipay'); // Gelecekte eklenecek

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Iyzico ile ödeme başlatma endpointi (Şimdilik mock)
app.post('/api/payment/start', async (req, res) => {
  const { amount, userId } = req.body;
  if (!amount || !userId) {
    return res.status(400).json({ error: 'amount and userId are required' });
  }

  // Burada Iyzico API'sine istek atılıp Checkout Form Initialize edilecek.
  // Başarılı olduğunda ödeme sayfasının linki döndürülecek.
  res.json({ 
    paymentPageUrl: 'https://sandbox-api.iyzipay.com/mock-payment-page-url',
    token: 'mock-token-123'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
