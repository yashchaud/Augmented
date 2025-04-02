const fs = require('fs');
const path = require('path');
const Audio = require('../models/audioModel');

// Helper function to create directory if it doesn't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Upload an audio recording
const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title } = req.body;
    const { filename, mimetype, size, path: filePath } = req.file;

    // Ensure audio directory exists
    createDir(path.join(__dirname, '..', 'uploads', 'audio'));

    const audio = new Audio({
      title: title || filename,
      filename,
      filePath,
      contentType: mimetype,
      size,
    });

    const savedAudio = await audio.save();
    res.status(201).json(savedAudio);
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ message: 'Server error during audio upload' });
  }
};

// Get all audio recordings
const getAudios = async (req, res) => {
  try {
    const audios = await Audio.find({}).sort({ createdAt: -1 });
    res.status(200).json(audios);
  } catch (error) {
    console.error('Error fetching audios:', error);
    res.status(500).json({ message: 'Server error while fetching audios' });
  }
};

// Get a single audio by ID
const getAudioById = async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    res.status(200).json(audio);
  } catch (error) {
    console.error('Error fetching audio:', error);
    res.status(500).json({ message: 'Server error while fetching audio' });
  }
};

// Stream audio
const streamAudio = async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    const audioPath = audio.filePath;
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }
    
    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(audioPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': audio.contentType,
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': audio.contentType,
      };
      
      res.writeHead(200, head);
      fs.createReadStream(audioPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ message: 'Server error during audio streaming' });
  }
};

// Update audio recording (rename)
const updateAudio = async (req, res) => {
  try {
    const { title } = req.body;
    const audio = await Audio.findById(req.params.id);
    
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    audio.title = title || audio.title;
    
    const updatedAudio = await audio.save();
    res.status(200).json(updatedAudio);
  } catch (error) {
    console.error('Error updating audio:', error);
    res.status(500).json({ message: 'Server error while updating audio' });
  }
};

// Delete an audio recording
const deleteAudio = async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    
    if (!audio) {
      return res.status(404).json({ message: 'Audio not found' });
    }
    
    // Remove the file from the filesystem
    if (fs.existsSync(audio.filePath)) {
      fs.unlinkSync(audio.filePath);
    }
    
    // Remove from database
    await audio.deleteOne();
    
    res.status(200).json({ message: 'Audio removed' });
  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ message: 'Server error while deleting audio' });
  }
};

module.exports = {
  uploadAudio,
  getAudios,
  getAudioById,
  streamAudio,
  updateAudio,
  deleteAudio,
}; 