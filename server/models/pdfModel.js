const mongoose = require('mongoose');

const pdfSchema = mongoose.Schema(
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
    pageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const PDF = mongoose.model('PDF', pdfSchema);

module.exports = PDF; 