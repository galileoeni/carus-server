import sgMail from '@sendgrid/mail'
import path from 'path'
import pug from 'pug'

sgMail.setApiKey(String(process.env.SENDGRID_API_KEY))

const emailPath = path.join(__dirname, '../../views/')

// Helper to render Pug templates
const renderTemplate = (templateName: string, data: any) => {
  return pug.renderFile(path.join(emailPath, templateName), data)
}

// Send a verification OTP email
export const sendVerificationOtp = async (
  first_name: string,
  email: string,
  otp: string,
) => {
  try {
    const html = renderTemplate('verifyEmail.pug', {
      first_name,
      subject: 'Welcome to Carus Recycling',
      otp,
    })

    const msg = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      to: email,
      subject: 'Verify your email',
      html,
    }

    const info = await sgMail.send(msg)
    return info
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}

// Send a contact message to your internal email
export const sendContactMessage = async (
  user_email: string,
  first_name: string,
  last_name: string,
  message: string,
) => {
  try {
    const msg = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      to: process.env.CONTACT_EMAIL_RECEPIENT,
      subject: `${first_name} ${last_name}: <${user_email}>`,
      text: message,
    }

    const info = await sgMail.send(msg)
    return info
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}

// Send a password reset email
export const sendPasswordResetToken = async (
  first_name: string,
  email: string,
  token: string,
) => {
  try {
    const html = renderTemplate('resetPassword.pug', {
      first_name,
      subject: 'Use this link to reset your password',
      link: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    })

    const msg = {
      from: `CARUS RECYCLING <${process.env.FROM_MAIL}>`,
      to: email,
      subject: 'Password reset',
      html,
    }

    const info = await sgMail.send(msg)
    return info
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}
