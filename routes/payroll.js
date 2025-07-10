const express = require('express');
const router = express.Router();
const PayrollPayment = require('../models/PayrollPayment');

// Utility function for charge calculation
const calculateCharges = (beneficiaries) => {
  const count = beneficiaries.length;
  if (count > 10) return { amount: 2000, reason: "More than 10 beneficiaries" };
  if (count === 10) return { amount: 1000, reason: "Exactly 10 beneficiaries" };
  return { amount: 0, reason: null };
};

// 1. Manager initiates payment (with charges)
router.post('/initiate', async (req, res) => {
  try {
    const { paymentDetails, virtualAccountId, initiatedBy } = req.body;
    
    // Calculate charges
    const { amount: fee, reason } = calculateCharges(paymentDetails);
    const subtotal = paymentDetails.reduce((sum, b) => sum + parseFloat(b.salary), 0);

    const payment = new PayrollPayment({
      paymentDetails,
      virtualAccountId,
      initiatedBy,
      status: 'pending_approval',
      feeDetails: {
        amount: fee,
        reason,
        threshold: paymentDetails.length
      },
      totals: {
        subtotal,
        fee,
        grandTotal: subtotal + fee
      }
    });

    await payment.save();
    res.json({ 
      success: true, 
      payment,
      message: fee > 0 
        ? `Payment submitted with additional charges (₦${fee.toLocaleString()})`
        : 'Payment submitted'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get pending payments with charge details
router.get('/pending-approvals', async (req, res) => {
  try {
    const pending = await PayrollPayment.find({ status: 'pending_approval' })
      .select('paymentDetails initiatedBy createdAt feeDetails totals');
    
    res.json({ 
      success: true,
      payments: pending.map(p => ({
        ...p._doc,
        beneficiaryCount: p.paymentDetails.length
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Approve payment (with charge processing)
router.post('/approve', async (req, res) => {
  try {
    const { paymentId, approvedBy } = req.body;
    
    // Validate payment exists
    const payment = await PayrollPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Check status
    if (payment.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment already processed' 
      });
    }

    // Revalidate charges (prevent tampering)
    const { amount: recalculatedFee } = calculateCharges(payment.paymentDetails);
    if (recalculatedFee !== payment.feeDetails.amount) {
      return res.status(400).json({
        success: false,
        error: `Charge validation failed. Expected ₦${payment.feeDetails.amount}, got ₦${recalculatedFee}`
      });
    }

    // Check account balance
    const account = await Account.findById(payment.virtualAccountId);
    if (account.balance < payment.totals.grandTotal) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance (Need ₦${payment.totals.grandTotal.toLocaleString()})`
      });
    }

    // Process payment
    account.balance -= payment.totals.grandTotal;
    await account.save();

    // Update payment status
    payment.status = 'approved';
    payment.approvedBy = approvedBy;
    payment.approvedAt = new Date();
    await payment.save();

    // TODO: Integrate with bank API here

    res.json({ 
      success: true,
      amountDeducted: payment.totals.grandTotal,
      breakdown: {
        salaries: payment.totals.subtotal,
        fees: payment.feeDetails
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Reject payment (unchanged but added error handling)
router.post('/reject', async (req, res) => {
  try {
    const { paymentId, rejectedBy } = req.body;
    const payment = await PayrollPayment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    if (payment.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment already processed' 
      });
    }

    payment.status = 'rejected';
    payment.rejectedBy = rejectedBy;
    payment.rejectedAt = new Date();
    await payment.save();

    res.json({ 
      success: true,
      message: `Payment rejected. ${payment.feeDetails.amount > 0 
        ? `(₦${payment.feeDetails.amount} fee was not charged)` 
        : ''}`
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;