import * as FileSystem from 'expo-file-system';

// Simple local storage for images to avoid "image not found" errors
export const saveImageLocally = async (imageUri, studentId) => {
  try {
    // Create a unique filename
    const filename = `student_${studentId}_${Date.now()}.jpg`;
    const localUri = `${FileSystem.documentDirectory}${filename}`;
    
    // Copy the image to local storage
    await FileSystem.copyAsync({
      from: imageUri,
      to: localUri,
    });
    
    return localUri;
  } catch (error) {
    console.error('Error saving image locally:', error);
    return imageUri; // Return original URI if saving fails
  }
};

export const getImageUri = (imageUri) => {
  // Check if it's a local file or remote URL
  if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('http'))) {
    return imageUri;
  }
  return null;
};

export const deleteLocalImage = async (imageUri) => {
  try {
    if (imageUri && imageUri.startsWith('file://')) {
      await FileSystem.deleteAsync(imageUri, { idempotent: true });
    }
  } catch (error) {
    console.error('Error deleting local image:', error);
  }
};
