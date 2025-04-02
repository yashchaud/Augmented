# Media Server

A versatile media server for handling WebGL projects, PDFs, videos, and audio files with RESTful APIs.

## Features

- Upload and manage WebGL projects
- Upload and view PDF files with page extraction
- Upload and stream video files
- Upload and stream audio recordings
- RESTful API for all operations

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **File Storage**: Local filesystem

## Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or bun

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/media-server.git
cd media-server
```

### 2. Install dependencies

```bash
# Install server dependencies
cd server
npm install
# or if using bun
bun install
```

### 3. Environment Configuration

Create a `.env` file in the server directory using the provided `.env.example` as a template:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Replace `your_mongodb_connection_string` with your MongoDB connection string.

### 4. Create upload directories

The server will automatically create the required upload directories when it starts, but you can manually create them:

```bash
mkdir -p server/uploads/videos
mkdir -p server/uploads/pdfs
mkdir -p server/uploads/audio
mkdir -p server/uploads/webgl
```

### 5. Start the server

```bash
npm run dev
# or
bun run dev
```

The server will run on `http://localhost:5000` by default.

## Setting Up a Client (Optional)

You can create a client application to interact with this API using any frontend technology:

1. Create a React/Vue/Angular app in the `/client` directory
2. Configure it to communicate with the API endpoints
3. Example fetch request to upload a PDF:

```javascript
const uploadPdf = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  const response = await fetch('http://localhost:5000/api/pdf', {
    method: 'POST',
    body: formData,
  });
  
  return await response.json();
};
```

4. Example fetch request to get all videos:

```javascript
const getVideos = async () => {
  const response = await fetch('http://localhost:5000/api/video');
  return await response.json();
};
```

## API Endpoints

### WebGL

- `POST /api/webgl` - Upload a WebGL project
- `GET /api/webgl` - Get all WebGL projects
- `GET /api/webgl/:id` - Get WebGL project by ID
- `GET /api/webgl/view/:id` - View WebGL project
- `DELETE /api/webgl/:id` - Delete WebGL project

### PDF

- `POST /api/pdf` - Upload a PDF
- `GET /api/pdf` - Get all PDFs
- `GET /api/pdf/:id` - Get PDF by ID
- `GET /api/pdf/view/:id` - View PDF
- `GET /api/pdf/extract/:id` - Extract PDF page
- `DELETE /api/pdf/:id` - Delete PDF

### Video

- `POST /api/video` - Upload a video
- `GET /api/video` - Get all videos
- `GET /api/video/:id` - Get video by ID
- `GET /api/video/stream/:id` - Stream video
- `DELETE /api/video/:id` - Delete video

### Audio

- `POST /api/audio` - Upload an audio recording
- `GET /api/audio` - Get all audio recordings
- `GET /api/audio/:id` - Get audio by ID
- `GET /api/audio/stream/:id` - Stream audio
- `PUT /api/audio/:id` - Update audio
- `DELETE /api/audio/:id` - Delete audio

## File Upload

For all media types, use form-data with the appropriate field name:

- WebGL projects: `webgl` (ZIP file)
- PDF files: `pdf`
- Video files: `video`
- Audio files: `audio`

## Project Structure

```
.
├── client/            # Optional frontend application
├── server/
│   ├── config/        # Database configuration
│   ├── controllers/   # Request handlers
│   ├── middleware/    # Middleware functions
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── uploads/       # Uploaded files storage
│   ├── .env           # Environment variables
│   ├── package.json   # Dependencies
│   └── server.js      # Entry point
├── .gitignore         # Git ignore file
└── README.md          # Project documentation
```

## Deployment

### Server Deployment

1. Set up a MongoDB Atlas cluster for production
2. Deploy the server to a hosting service (Heroku, DigitalOcean, AWS, etc.)
3. Set the environment variables on your hosting platform
4. Ensure file upload directories are configured correctly

### Handling File Storage in Production

For production deployments, consider using cloud storage solutions like:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

## License

MIT 