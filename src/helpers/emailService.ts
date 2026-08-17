import path from 'path'
import pug from 'pug'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const emailPath = path.join(__dirname, '../../views/')

// Helper to render Pug templates
const renderTemplate = (templateName: string, data: any) => {
  return pug.renderFile(path.join(emailPath, templateName), data)
}

const getRequiredEnv = (key: 'FROM_MAIL' | 'CONTACT_EMAIL_RECEPIENT') => {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
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
      from: `CARUS RECYCLING <${getRequiredEnv('FROM_MAIL')}>`,
      to: email,
      subject: 'Verify your email',
      html,
    }

    const info = await resend.emails.send(msg)
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
    const fromEmail = getRequiredEnv('FROM_MAIL')
    console.log('From Email:', fromEmail)
    const contactRecipient = getRequiredEnv('CONTACT_EMAIL_RECEPIENT')

    const msg = {
      from: `CARUS RECYCLING <${fromEmail}>`,
      to: contactRecipient,
      subject: `${first_name} ${last_name}: <${user_email}>`,
      text: message,
    }

    const info = await resend.emails.send(msg)
    return info
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}

// Send a booking confirmation email when a schedule is created
export const sendScheduleBookedEmail = async (
  first_name: string,
  email: string,
  category: string,
  material: string,
  date: string,
) => {
  try {
    const html = renderTemplate('scheduleBooked.pug', {
      first_name,
      subject: 'Your Carus booking is confirmed',
      category,
      material,
      date,
    })

    const info = await resend.emails.send({
      from: `CARUS RECYCLING <${getRequiredEnv('FROM_MAIL')}>`,
      to: email,
      subject: 'Your Carus booking is confirmed',
      html,
    })
    return info
  } catch (error) {
    console.error('Email Service Error (scheduleBooked):', error)
  }
}

// Send an acceptance notification email when admin accepts a schedule
export const sendScheduleAcceptedEmail = async (
  first_name: string,
  email: string,
  category: string,
  material: string,
  date: string,
) => {
  try {
    const html = renderTemplate('scheduleAccepted.pug', {
      first_name,
      subject: 'Your Carus schedule has been accepted',
      category,
      material,
      date,
    })

    const info = await resend.emails.send({
      from: `CARUS RECYCLING <${getRequiredEnv('FROM_MAIL')}>`,
      to: email,
      subject: 'Your Carus schedule has been accepted',
      html,
    })
    return info
  } catch (error) {
    console.error('Email Service Error (scheduleAccepted):', error)
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
      from: `CARUS RECYCLING <${getRequiredEnv('FROM_MAIL')}>`,
      to: email,
      subject: 'Password reset',
      html,
    }

    const info = await resend.emails.send(msg)
    return info
  } catch (error) {
    console.error('Email Service Error:', error)
    throw error
  }
}
