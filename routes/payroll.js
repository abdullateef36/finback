const express = require('express');
const router = express.Router();
const PayrollPayment = require('../models/PayrollPayment');

// 1. Manager initiates payment
router.post('/initiate', async (req, res) => {
  console.log('Received body:', req.body);
  const { paymentDetails, virtualAccountId, initiatedBy } = req.body;
  const payment = new PayrollPayment({
    paymentDetails,
    virtualAccountId,
    initiatedBy
  });
  await payment.save();
  res.json({ success: true, payment });

});

// 2. Get all pending payments (admin)
router.get('/pending-approvals', async (req, res) => {
  const pending = await PayrollPayment.find({ status: 'pending_approval' });
  res.json({ payments: pending });
});

// 3. Approve payment
router.post('/approve', async (req, res) => {
  const { paymentId, approvedBy } = req.body;
  const payment = await PayrollPayment.findById(paymentId);
  if (!payment) return res.status(404).json({ success: false, error: 'Not found' });
  if (payment.status !== 'pending_approval') return res.status(400).json({ success: false, error: 'Already processed' });
  payment.status = 'approved';
  payment.approvedBy = approvedBy;
  payment.approvedAt = new Date();
  await payment.save();
  // TODO: Add code to actually send payment to bank here
  res.json({ success: true });
});

// 4. Reject payment
router.post('/reject', async (req, res) => {
  const { paymentId, rejectedBy } = req.body;
  const payment = await PayrollPayment.findById(paymentId);
  if (!payment) return res.status(404).json({ success: false, error: 'Not found' });
  if (payment.status !== 'pending_approval') return res.status(400).json({ success: false, error: 'Already processed' });
  payment.status = 'rejected';
  payment.rejectedBy = rejectedBy;
  payment.rejectedAt = new Date();
  await payment.save();
  res.json({ success: true });
});

module.exports = router;