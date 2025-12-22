// Firebase Storage service for file uploads
import {
    ref,
    uploadBytes,
    uploadBytesResumable, // Added for progress tracking
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadResult {
    downloadUrl: string;
    storagePath: string;
}

/**
 * Upload a file to Firebase Storage with progress tracking
 * @param file - The file to upload
 * @param onProgress - Callback for upload progress (0-100)
 * @returns Promise resolving to UploadResult
 */
export const uploadFileWithProgress = (
    file: File,
    onProgress?: (progress: number) => void
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        // Create a unique path for the file
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `files/${timestamp}_${safeName}`;

        // Create a reference to the file location
        const storageRef = ref(storage, storagePath);

        // Upload the file with resumable method
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => {
                reject(error);
            },
            async () => {
                // Handle successful uploads on complete
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        downloadUrl,
                        storagePath
                    });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

export interface UploadResult {
    downloadUrl: string;
    storagePath: string;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @returns Object containing download URL and storage path
 */
export const uploadFile = async (file: File): Promise<UploadResult> => {
    // Create a unique path for the file
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `files/${timestamp}_${safeName}`;

    // Create a reference to the file location
    const storageRef = ref(storage, storagePath);

    // Upload the file
    await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadUrl = await getDownloadURL(storageRef);

    return {
        downloadUrl,
        storagePath
    };
};

/**
 * Delete a file from Firebase Storage
 * @param storagePath - The path of the file in storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
};

/**
 * Get download URL for a file
 * @param storagePath - The path of the file in storage
 * @returns The download URL
 */
export const getFileUrl = async (storagePath: string): Promise<string> => {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
};
