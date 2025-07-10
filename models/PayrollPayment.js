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
  },

  feeDetails: {
    amount: { type: Number, default: 0 },
    reason: { type: String },
    threshold: { type: Number } // 10 or 11
  },
  totals: {
    subtotal: Number,  // Sum of salaries
    fee: Number,       // Calculated charge
    grandTotal: Number // subtotal + fee
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PayrollPayment', PayrollPaymentSchema);