import { User as MyUser } from '../entities/user'

export {}

declare global {
  namespace Express {
    interface Request {
      user: MyUser
      // Unparsed JSON body, needed to check Paystack webhook signatures
      rawBody?: Buffer
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File
      files?:
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] | Express.Multer.File }
    }
  }
}
