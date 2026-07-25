const mongoose = require('mongoose');

/**
 * RewardTransaction Collection
 *
 * Architecture prepared. NOT active for public users.
 * The rewardsEnabled flag in app logic (currently false) gates all earning logic.
 * When enabled in future, no rewrite needed — just flip the flag.
 */
const RewardTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ['order_reward', 'manual_credit', 'manual_debit', 'referral'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RewardTransaction', RewardTransactionSchema);
