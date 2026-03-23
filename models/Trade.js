import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  polymarketId: {
    type: String,
    required: true
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  market: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    required: true
  },
  outcomeId: {
    type: String,
    required: true
  },
  outcomeName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  shares: {
    type: Number,
    required: true
  },
  direction: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'open', 'won', 'lost', 'cancelled'],
    default: 'open'
  },
  profit: {
    type: Number,
    default: 0
  },
  transactionHash: {
    type: String,
    sparse: true
  },
  blockNumber: {
    type: Number
  },
  copiedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  },
  copiedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  }],
  notes: {
    type: String
  },
  copiedTradesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  }
});

// Index for faster queries
tradeSchema.index({ trader: 1, createdAt: -1 });
tradeSchema.index({ market: 1, createdAt: -1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ polymarketId: 1 });

// Calculate shares based on amount and price
tradeSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('price')) {
    this.shares = this.amount / this.price;
  }
  next();
});

export default mongoose.model('Trade', tradeSchema);
