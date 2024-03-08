const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multerMiddleware');
const cloudinary = require('../config/cloudinaryConfig');

// Upload route
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    const { files } = req;

    // Check if files are present
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    // Upload files to Cloudinary
    const uploadPromises = files.map((file) => {
      return cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
        if (error) {
          throw error;
        }
        return result;
      }).end(file.buffer);
    });

    const uploadedResults = await Promise.all(uploadPromises);

    // Extract URLs from Cloudinary response
    const urls = uploadedResults.map((result) => result.secure_url);

    res.status(200).json({ urls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
