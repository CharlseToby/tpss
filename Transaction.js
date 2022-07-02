const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Transaction = new Schema({
  ID: {
    type: Number,
    required: true,
  },
  Amount: {
    type: Number,
    required: true,
  },
  Currency: {
    type: String,
    required: true,
  },
  CustomerEmail: {
    type: String,
    required: true,
  },
  SplitInfo: {
    type: Array,
    items: {
      type: Object,
      properties: {
        SplitType: {
          type: String,
          required: true,
        },
        SplitValue: {
          type: Number,
          required: true,
        },
        SplitEntityId: {
          type: String,
          required: true,
        },
      },
    },
    minItems: 1,
    maxItems: 20,
  },
});

module.exports = mongoose.model("Transaction", Transaction);
