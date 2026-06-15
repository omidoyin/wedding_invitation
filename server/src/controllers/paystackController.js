import prisma from '../config/prismaClient.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const isPaystackConfigured = !!PAYSTACK_SECRET;

export async function initializePayment(req, res) {
  const { amount, email, donorName, anonymous } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required.' });
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
          // Store donorName in metadata so we can read it on verification
          metadata: {
            donorName: nameToUse,
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

  // MOCK FLOW: When Paystack is not configured, simulate local payment
  const mockReference = `AAL-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const mockPaymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/support/verify?reference=${mockReference}&amount=${amount}&donor=${encodeURIComponent(nameToUse)}`;

  try {
    // Return mock payment URL redirecting directly back to frontend for validation
    res.json({
      authorization_url: mockPaymentUrl,
      reference: mockReference,
      isMock: true
    });
  } catch (error) {
    console.error('Mock payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyPayment(req, res) {
  const { reference, mockAmount, mockDonor } = req.body;

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
        message: 'Payment verified successfully!',
        donation: existing
      });
    }

    // If it's a mock reference or Paystack is not configured
    if (reference.startsWith('AAL-PAY-') || !isPaystackConfigured) {
      const amount = mockAmount ? parseFloat(mockAmount) : 5000.0;
      const donorName = mockDonor ? decodeURIComponent(mockDonor) : 'Generous Guest';

      const donation = await prisma.donation.create({
        data: {
          donorName,
          amount,
          reference,
          status: 'SUCCESS'
        }
      });

      return res.json({
        message: 'Mock payment verified successfully!',
        donation
      });
    }

    // Real Paystack Verification
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`
      }
    });

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      const metadata = data.data.metadata || {};
      const amountInNaira = data.data.amount / 100;
      const donorName = metadata.donorName || 'Generous Guest';

      const donation = await prisma.donation.create({
        data: {
          donorName,
          amount: amountInNaira,
          reference,
          status: 'SUCCESS'
        }
      });

      res.json({
        message: 'Payment verified successfully!',
        donation
      });
    } else {
      res.status(400).json({ error: 'Payment verification failed.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
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
