const mongoose = require('mongoose');

const slaRuleSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'SLA category is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      required: [true, 'SLA priority is required']
    },
    resolutionHours: {
      type: Number,
      required: [true, 'Resolution hours is required'],
      min: [0.1, 'Resolution hours must be greater than 0']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Required index: { category: 1 }
slaRuleSchema.index({ category: 1 });
// Compound index to ensure uniqueness for category + priority combination
slaRuleSchema.index({ category: 1, priority: 1 }, { unique: true });

const SlaRule = mongoose.model('SlaRule', slaRuleSchema);

module.exports = SlaRule;
