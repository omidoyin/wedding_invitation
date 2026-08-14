import prisma from '../config/prismaClient.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const isPaystackConfigured = !!PAYSTACK_SECRET;

export async function initializePayment(req, res) {
  const { amount, email, donorName, anonymous, message } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid gift amount is required.' });
  }

  const emailToUse = email || 'guest@aalovestory2026.com';
  const nameToUse = anonymous ? 'Anonymous Donor' : (donorName || 'Generous Guest');
  
  // Paystack expects amount in kobo (kobo = Naira * 100)
  const amountInKobo = Math.round(amount * 100);

  if (isPaystackConfigured) {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailToUse,
          amount: amountInKobo,
          // Store donorName & message in metadata for verification
          metadata: {
            donorName: nameToUse,
            email: emailToUse,
            message: message || '',
            amountInNaira: amount
          }
        })
      });

      const data = await response.json();

      if (data.status) {
        return res.json({
          authorization_url: data.data.authorization_url,
          reference: data.data.reference
        });
      } else {
        return res.status(400).json({ error: data.message || 'Paystack initialization failed.' });
      }
    } catch (error) {
      console.error('Paystack initialize payment error:', error);
      // Fall through to mock in case of failure or network issue
    }
  }

  // MOCK FLOW: When Paystack is not configured, simulate local payment reference
  const mockReference = `GIFT-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    res.json({
      reference: mockReference,
      isMock: true
    });
  } catch (error) {
    console.error('Mock payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyPayment(req, res) {
  const { reference, mockAmount, mockDonor, email: bodyEmail, message: bodyMessage, donorName: bodyDonorName, amount: bodyAmount } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required.' });
  }

  try {
    // Check if donation record already exists
    const existing = await prisma.donation.findUnique({
      where: { reference }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Gift verified successfully!',
        donation: existing
      });
    }

    // If it's a mock reference or Paystack is not configured
    if (reference.startsWith('GIFT-PAY-') || reference.startsWith('TEST_') || reference.startsWith('AAL-PAY-') || !isPaystackConfigured) {
      const amount = bodyAmount ? parseFloat(bodyAmount) : (mockAmount ? parseFloat(mockAmount) : 5000.0);
      const donorName = bodyDonorName || (mockDonor ? decodeURIComponent(mockDonor) : 'Generous Guest');
      const email = bodyEmail || 'guest@aalovestory2026.com';
      const message = bodyMessage || '';

      const donation = await prisma.donation.create({
        data: {
          donorName,
          email,
          message,
          amount,
          reference,
          status: 'SUCCESS'
        }
      });

      return res.json({
        success: true,
        message: 'Gift verified successfully!',
        donation
      });
    }

    // Real Paystack Verification via REST API
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status && data.data?.status === 'success') {
      const metadata = data.data.metadata || {};
      const amountInNaira = data.data.amount / 100;
      const donorName = bodyDonorName || metadata.donorName || 'Generous Guest';
      const email = bodyEmail || data.data.customer?.email || metadata.email || 'guest@aalovestory2026.com';
      const message = bodyMessage || metadata.message || '';

      const donation = await prisma.donation.create({
        data: {
          donorName,
          email,
          message,
          amount: amountInNaira,
          reference,
          status: 'SUCCESS'
        }
      });

      return res.json({
        success: true,
        message: 'Gift verified successfully!',
        donation
      });
    } else {
      return res.status(400).json({ error: data.message || 'Payment verification failed with Paystack.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getDonations(req, res) {
  try {
    const donations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
