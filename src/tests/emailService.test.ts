/**
 * Email Service Test
 * Run: npx ts-node src/tests/emailService.test.ts
 *
 * This script tests the email sending functions
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

import {
  sendVerificationOtp,
  sendContactMessage,
  sendPasswordResetToken,
} from '../helpers/emailService'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function runTests() {
  console.log('🧪 Starting Email Service Tests...\n')

  // Check if environment variables are set
  if (!process.env.EMAIL || !process.env.GOOGLE_APP_PASSWORD) {
    console.error('❌ Missing required environment variables:')
    console.error('   - EMAIL: ' + (process.env.EMAIL ? '✓' : '✗'))
    console.error(
      '   - GOOGLE_APP_PASSWORD: ' +
        (process.env.GOOGLE_APP_PASSWORD ? '✓' : '✗'),
    )
    process.exit(1)
  }

  console.log('✓ Environment variables loaded\n')

  try {
    // Test 1: Send Verification OTP
    console.log('📧 Test 1: Sending verification OTP...')
    await sendVerificationOtp('John Doe', 'umarjimoh0904@gmail.com', '123456')
    console.log('✓ Verification OTP email sent\n')

    await delay(2000)

    // Test 2: Send Contact Message
    console.log('📧 Test 2: Sending contact message...')
    await sendContactMessage(
      'umarjimoh0904@gmail.com',
      'Jane',
      'Smith',
      'This is a test message from the contact form',
    )
    console.log('✓ Contact message email sent\n')

    await delay(2000)

    // Test 3: Send Password Reset OTP
    // console.log('📧 Test 3: Sending password reset OTP...')
    // await sendPasswordResetOtp('John Doe', 'umarjimoh0904@gmail.com', '654321')
    // console.log('✓ Password reset OTP email sent\n')

    // await delay(2000)

    // Test 3: Send Password Reset Token
    console.log('📧 Test 3: Sending password reset token...')
    await sendPasswordResetToken(
      'John Doe',
      'umarjimoh0904@gmail.com',
      'test-token-123456',
    )
    console.log('✓ Password reset token email sent\n')

    console.log('✅ All tests completed successfully!')
    console.log('\n📝 Note: Check your email to verify delivery')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

runTests()
