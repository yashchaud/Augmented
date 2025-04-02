const mongoose = require('mongoose');

const videoSchema = mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model('Video', videoSchema);

module.exports = Video; 