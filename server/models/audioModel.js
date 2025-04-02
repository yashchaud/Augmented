const mongoose = require('mongoose');

const audioSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileId: {
      type: String,
    },
    contentType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
    },
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Audio = mongoose.model('Audio', audioSchema);

module.exports = Audio; 