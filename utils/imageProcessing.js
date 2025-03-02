// utils/imageProcessing.js - Utility for processing and analyzing food images
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const { analyzeTextForCalories } = require("./nutritionAnalysis");
const dotenv = require("dotenv");

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "your_cloudinary_cloud_name",
  api_key: process.env.CLOUDINARY_API_KEY || "your_cloudinary_api_key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "your_cloudinary_api_secret",
});

/**
 * Process and upload a food image
 * @param {Object} imageFile - The image file from the request
 * @returns {Object} - Image data including URL and nutrition info if available
 */
exports.processAndUploadImage = async (imageFile) => {
  try {
    // Check if we have Cloudinary credentials
    if (!process.env.CLOUDINARY_API_KEY) {
      // Handle local storage for development
      return handleLocalStorage(imageFile);
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(imageFile);

    // Check if we have access to an image recognition API
    if (process.env.FOOD_RECOGNITION_API_KEY) {
      const nutritionData = await analyzeFoodImage(uploadResult.url);
      return {
        ...uploadResult,
        nutritionData,
      };
    }

    // If no image recognition API, return just the image data
    return uploadResult;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};

/**
 * Upload image to Cloudinary
 * @param {Object} imageFile - The image file
 * @returns {Object} - Upload result with URL and public ID
 */
const uploadToCloudinary = async (imageFile) => {
  // For Express-fileupload
  if (imageFile.tempFilePath) {
    const result = await cloudinary.uploader.upload(imageFile.tempFilePath, {
      folder: "tally/meals",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  // For Multer (file path is in imageFile.path)
  if (imageFile.path) {
    const result = await cloudinary.uploader.upload(imageFile.path, {
      folder: "tally/meals",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  throw new Error("Unsupported file upload format");
};

/**
 * Handle local storage for development without Cloudinary
 * @param {Object} imageFile - The image file
 * @returns {Object} - Image data with local path
 */
const handleLocalStorage = async (imageFile) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "..", "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${imageFile.name}`;
    const filepath = path.join(uploadsDir, filename);

    // For Express-fileupload
    if (imageFile.mv) {
      await imageFile.mv(filepath);
    }
    // For Multer (file is already moved to imageFile.path)
    else if (imageFile.path) {
      // File is already saved, just return the path
      return {
        url: `/uploads/${path.basename(imageFile.path)}`,
        publicId: path.basename(imageFile.path),
      };
    }

    return {
      url: `/uploads/${filename}`,
      publicId: filename,
    };
  } catch (error) {
    console.error("Error handling local storage:", error);
    throw error;
  }
};

/**
 * Analyze a food image to identify food and estimate nutrition
 * This is a placeholder for integration with a real food recognition API
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Object} - Nutrition data
 */
const analyzeFoodImage = async (imageUrl) => {
  try {
    // This would be replaced with a real API call
    // Example with a hypothetical Food Recognition API:
    /*
    const response = await axios.post('https://api.foodrecognition.com/analyze', {
      imageUrl: imageUrl,
      apiKey: process.env.FOOD_RECOGNITION_API_KEY
    });
    
    return {
      calories: response.data.calories,
      protein: response.data.protein,
      carbs: response.data.carbs,
      fat: response.data.fat,
      description: response.data.foodName
    };
    */

    // For now, just return a placeholder result
    // In production, this should call a real food recognition API
    const placeholder = {
      calories: 350,
      protein: 15,
      carbs: 35,
      fat: 12,
      description: "Food from image",
    };

    return placeholder;
  } catch (error) {
    console.error("Error analyzing food image:", error);
    // Return a generic estimate
    return {
      calories: 350,
      protein: 15,
      carbs: 35,
      fat: 12,
      description: "Food from image (estimate)",
    };
  }
};
