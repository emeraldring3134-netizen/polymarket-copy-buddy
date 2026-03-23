import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  polymarketId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['politics', 'sports', 'crypto', 'economics', 'entertainment', 'science', 'other'],
    default: 'other'
  },
  outcomes: [{
    id: String,
    name: String,
    price: Number
  }],
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'resolved'],
    default: 'open'
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  liquidity: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String
  },
  slug: {
    type: String
  },
  tags: [{
    type: String
  }],
  question: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
marketSchema.index({ category: 1, status: 1 });
marketSchema.index({ endDate: 1 });
marketSchema.index({ polymarketId: 1 });

export default mongoose.model('Market', marketSchema);
