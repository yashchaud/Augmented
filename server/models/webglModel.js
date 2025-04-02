const mongoose = require('mongoose');

const webglSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    folderPath: {
      type: String,
      required: true,
    },
    indexPath: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    size: {
      type: Number,
    },
    isUnityProject: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const WebGL = mongoose.model('WebGL', webglSchema);

module.exports = WebGL; 