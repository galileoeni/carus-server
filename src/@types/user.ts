export interface UserRow {
  id: string
  email: string
  password: string | null
  username: string
  role: string
  avatar: string
  status: string
  first_name: string
  last_name: string
  address: string
  phone: string
  gender: GenderEnum
  otp: string
  country_code: string
}

export enum UserRoleEnum {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

interface GoogleUserEmails {
  value: string
  verified: boolean
}
interface GoogleUserPhotos {
  values: string
}

export interface GoogleUser {
  id: string
  displayName: string
  name: {
    familyName: string
    givenName: string
  }
  emails: GoogleUserEmails[]
  photos: GoogleUserPhotos[]
  provider: string
}

export enum RegionEnum {
  LAGOS = 'Lagos',
}

export enum GenderEnum {
  MALE = 'Male',
  FEMALE = 'Female',
}

export enum CityEnum {
  SURULERE_ADENIRAN = 'Surulere (Adeniran Ogunsanya)',
  SURULERE_AGUDA = 'Surulere (Aguda)',
  SURULERE_BODE = 'Surulere (Bode Thomas)',
  SURULERE_IDI = 'Surulere (Idi Araba)',
  SURULERE_IPONRI = 'Surulere (Iponri)',
  SURULERE_ITIRE = 'Surulere (Itire)',
  SURULERE_IJESHA = 'Surulere (Ijesha)',
  SURULERE_LAWANSON = 'Surulere (Lawanson)',
  SURULERE_MASHA = 'Surulere (Masha)',
  SURULERE_OGUNLANA_DRIVE = 'Surulere (Ogunlana Drive)',
  SURULERE_OJUELEGBA = 'Surulere (Ojuelegba)',
}
