import crypto from 'crypto'
import { promises as fs } from 'fs'
import multer from 'multer'
import path from 'path'

import { PickupPhoto } from '../../entities/businessSchedule'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'

export const MAX_PICKUP_PHOTOS = 5
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/
const CLOUDINARY_FOLDER = 'business-pickups'

// Local fallback for development, served at /uploads (see index.ts)
export const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'uploads')
const LOCAL_DIR = path.join(LOCAL_UPLOAD_ROOT, CLOUDINARY_FOLDER)

export const pickupPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PICKUP_PHOTOS },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.test(file.mimetype)) return cb(null, true)
    cb(new Error('Photos must be JPG, PNG, WebP or HEIC images'))
  },
}).array('photos', MAX_PICKUP_PHOTOS)

const isCloudinaryConfigured = () =>
  [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every((v) => v && v !== 'placeholder')

const useLocalStorage = () =>
  !isCloudinaryConfigured() && process.env.NODE_ENV !== 'production'

export async function storePickupPhoto(
  file: Express.Multer.File,
): Promise<PickupPhoto> {
  if (useLocalStorage()) {
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg')
    const name = `${crypto.randomUUID()}.${ext}`
    await fs.mkdir(LOCAL_DIR, { recursive: true })
    await fs.writeFile(path.join(LOCAL_DIR, name), file.buffer)
    const base = process.env.BACKEND_URL || process.env.BASE_URL || ''
    return {
      url: `${base}/uploads/${CLOUDINARY_FOLDER}/${name}`,
      key: `local:${name}`,
    }
  }
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured; cannot store photos')
  }
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString(
    'base64',
  )}`
  const result = await uploadToCloudinary(dataUri, CLOUDINARY_FOLDER)
  return { url: result.secure_url, key: result.public_id }
}

// Best effort: a photo that fails to delete only wastes storage
export async function removePickupPhoto(photo: PickupPhoto) {
  try {
    if (photo.key.startsWith('local:')) {
      await fs.unlink(path.join(LOCAL_DIR, photo.key.slice('local:'.length)))
    } else {
      await deleteFromCloudinary(photo.key)
    }
  } catch (err) {
    console.error('Could not delete pickup photo', photo.key, err)
  }
}
