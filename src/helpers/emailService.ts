import nodemailer from 'nodemailer'
import SMTPTransport, { Options } from 'nodemailer/lib/smtp-transport'
import path from 'path'
import pug from 'pug'

const createTransporter = async () => {
  const config: Options = {
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
  }

  return nodemailer.createTransport({ ...config })
}

const emailPath = path.join(__dirname, '../../views/')

export const sendVerificationOtp = async (
  first_name: string,
  email: string,
  otp: string,
) => {
  const transporter: Promise<
    nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  > = createTransporter()
  try {
    const html = pug.renderFile(path.join(emailPath, 'verifyEmail.pug'), {
      first_name,
      subject: 'Welcome to Carus Recycling',
      otp,
    })
    const mailOptions = {
      from: `CARUS RECYCLING <${process.env.EMAIL}>`,
      subject: 'Verify your email',
      to: email,
      html,
    };
    // console.log('send verification code reached');
    (await transporter).sendMail(mailOptions)
  } catch (error) {
    console.error(error)
  }
}

export const sendContactMessage = async (
  user_email: string,
  first_name: string,
  last_name: string,
  message: string,
) => {
  const transporter: Promise<
    nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  > = createTransporter()
  try {
    // const html = pug.renderFile(
    //     path.join(emailPath, 'verifyEmail.pug'),
    //     {
    //         first_name,
    //         subject:'Welcome to Carus recycling',
    //         otp,
    //     }
    // );
    const mailOptions = {
      from: 'Web User Contact',
      subject: `${first_name} ${last_name}: <${user_email}>`,
      to: process.env.CONTACT_EMAIL_RECEPIENT,
      text: message,
    };
    (await transporter).sendMail(mailOptions)
  } catch (error) {
    console.error(error)
  }
}

// export const sendPasswordResetOtp = async (
//   first_name: string,
//   email: string,
//   otp: string,
// ) => {
//   const transporter: Promise<
//     nodemailer.Transporter<SMTPTransport.SentMessageInfo>
//   > = createTransporter()
//   try {
//     const html = pug.renderFile(path.join(emailPath, 'resetPassword.pug'), {
//       first_name,
//       subject: 'Use this code to reset your password',
//       otp,
//     })
//     const mailOptions = {
//       from: `CARUS RECYCLING <${process.env.EMAIL}>`,
//       subject: 'Password reset',
//       to: email,
//       html,
//     };
//     (await transporter).sendMail(mailOptions)
//   } catch (error) {
//     console.error(error)
//   }
// }

export const sendPasswordResetToken = async (
  first_name: string,
  email: string,
  token: string,
) => {
  const transporter: Promise<
    nodemailer.Transporter<SMTPTransport.SentMessageInfo>
  > = createTransporter()
  try {
    const html = pug.renderFile(path.join(emailPath, 'resetPassword.pug'), {
      first_name,
      subject: 'Use this link to reset your password',
      link: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    })
    const mailOptions = {
      from: `CARUS RECYCLING <${process.env.EMAIL}>`,
      subject: 'Password reset',
      to: email,
      html,
    };
    (await transporter).sendMail(mailOptions)
  } catch (error) {
    console.error(error)
  }
}
