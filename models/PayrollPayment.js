const mongoose = require('mongoose');

const PayrollPaymentSchema = new mongoose.Schema({
  paymentDetails: [Object], // Array of beneficiaries (simplified, adjust as needed)
  virtualAccountId: String,
  initiatedBy: String, // manager's user ID or name
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  },
  approvedBy: String,
  approvedAt: Date,
  rejectedBy: String,
  rejectedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PayrollPayment', PayrollPaymentSchema);