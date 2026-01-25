import nodemailer, { SendMailOptions } from 'nodemailer'
import { Options } from 'nodemailer/lib/smtp-transport'

import path from 'path'
import pug from 'pug'

const config: Options = {
  host: 'smtp.sendgrid.net',
  port: 465,
  secure: true,
  logger: true,
  debug: true,
  auth: {
    user: 'apikey', 
    pass: process.env.SENDGRID_API_KEY,
  },
  // connectionTimeout: 10000,
  // greetingTimeout: 10000,
  // socketTimeout: 10000,
}
const createTransporter = async () => {
  return nodemailer.createTransport({ ...config })
}

// const emailPath = path.join(process.cwd(), 'views')
const emailPath = path.join(__dirname, '../../views/')

const transporter = nodemailer.createTransport(config);

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.error('Email service SMTP connection failed:', error);
  } else {
    console.log('Email service is ready to send messages');
  }
});

export const sendVerificationOtp = async (
  first_name: string,
  email: string,
  otp: string,
) => {
  const transporterInstance = await createTransporter();
  try {
    const html = pug.renderFile(path.join(emailPath, 'verifyEmail.pug'), {
      first_name,
      subject: 'Welcome to Carus Recycling',
      otp,
    })
    const mailOptions: SendMailOptions = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      subject: 'Verify your email',
      to: email,
      html,
    }
    // console.log('send verification code reached');
    const info = await new Promise((resolve, reject) => {
      transporterInstance.sendMail(mailOptions, (err, info) => {
        if (err) {
          // console.error('SMTP Error:', err)
          reject(err)
        } else {
          // console.log('Email sent successfully:', info.messageId)
          resolve(info)
        }
      })
    })
    // const info = await (await transporter).sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}

export const sendContactMessage = async (
  user_email: string,
  first_name: string,
  last_name: string,
  message: string,
) => {
  const transporterInstance = await createTransporter();
  try {
   
    const mailOptions: SendMailOptions = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      subject: `${first_name} ${last_name}: <${user_email}>`,
      to: process.env.CONTACT_EMAIL_RECEPIENT,
      text: message,
    }
    // const info = await (await transporter).sendMail(mailOptions);
    const info = await new Promise((resolve, reject) => {
      transporterInstance.sendMail(mailOptions, (err, info) => {
        if (err) {
          // console.error('SMTP Error:', err)
          reject(err)
        } else {
          // console.log('Email sent successfully:', info.messageId)
          resolve(info)
        }
      })
    })
    return info;
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error;
  }
}

export const sendPasswordResetToken = async (
  first_name: string,
  email: string,
  token: string,
) => {
  const transporterInstance = await createTransporter()
  try {
    const html = pug.renderFile(path.join(emailPath, 'resetPassword.pug'), {
      first_name,
      subject: 'Use this link to reset your password',
      link: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    })
    const mailOptions: SendMailOptions = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      subject: 'Password reset',
      to: email,
      html,
    }
    // const info = await (await transporter).sendMail(mailOptions);
    const info = await new Promise((resolve, reject) => {
      transporterInstance.sendMail(mailOptions, (err, info) => {
        if (err) {
          // console.error('SMTP Error:', err)
          reject(err)
        } else {
          // console.log('Email sent successfully:', info.messageId)
          resolve(info)
        }
      })
    });
    return info;
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error;
  }
}
