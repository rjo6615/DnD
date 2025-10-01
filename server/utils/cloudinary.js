let cloudinary;
let isConfigured = false;

const resolveCloudinary = () => {
  if (!cloudinary) {
    try {
      ({ v2: cloudinary } = require('cloudinary'));
    } catch (error) {
      const missingSdkError = new Error('Cloudinary SDK is not available');
      missingSdkError.cause = error;
      throw missingSdkError;
    }
  }
  return cloudinary;
};

const configure = () => {
  if (isConfigured) {
    return;
  }

  const {
    CLOUDINARY_CLOUD_NAME: cloud_name,
    CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret,
  } = process.env;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Cloudinary environment variables are not configured');
  }

  const sdk = resolveCloudinary();
  sdk.config({ cloud_name, api_key, api_secret });
  isConfigured = true;
};

const getMapFolder = () => process.env.CLOUDINARY_MAP_FOLDER || 'Realm Tracker Maps';

const uploadMapImage = async (image, options = {}) => {
  configure();
  const sdk = resolveCloudinary();
  return sdk.uploader.upload(image, {
    folder: getMapFolder(),
    resource_type: 'image',
    ...options,
  });
};

const deleteMapImage = async (publicId, options = {}) => {
  if (!publicId || typeof publicId !== 'string') {
    throw new Error('A Cloudinary public ID is required to delete an image');
  }

  configure();
  const sdk = resolveCloudinary();
  return sdk.uploader.destroy(publicId, {
    resource_type: 'image',
    ...options,
  });
};

module.exports = {
  uploadMapImage,
  deleteMapImage,
  getMapFolder,
};
