import {
  Redemption,
  RedemptionStatus,
  RedemptionType,
} from '../entities/redemption'
import bcrypt from 'bcryptjs'

import { UserRoleEnum } from '../@types/user'
import { CategoryEnum, MaterialEnum } from '../@types/schedule'
import { Configurations } from '../entities/configurations'
import { Contribution } from '../entities/contribution'
import { Donation } from '../entities/donation'
import { Schedule } from '../entities/schedule'
import { Transaction } from '../entities/transactions'
import { User } from '../entities/user'
import { Wallet } from '../entities/wallet'
import { AppDataSource } from '../data-source'

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...')

    // Initialize data source
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      console.log('✅ Database connected')
    }

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await AppDataSource.dropDatabase()
    await AppDataSource.synchronize()

    const userRepository = AppDataSource.getRepository(User)
    const walletRepository = AppDataSource.getRepository(Wallet)
    const donationRepository = AppDataSource.getRepository(Donation)
    const contributionRepository = AppDataSource.getRepository(Contribution)
    const redemptionRepository = AppDataSource.getRepository(Redemption)
    const transactionRepository = AppDataSource.getRepository(Transaction)
    const scheduleRepository = AppDataSource.getRepository(Schedule)
    const configurationRepository = AppDataSource.getRepository(Configurations)

    // Seed configurations
    console.log('📝 Seeding configurations...')
    const configurations = [
      { type: 'point_to_naira', value: '10' },
      { type: 'min_redemption', value: '100' },
      { type: 'max_redemption', value: '10000' },
      { type: 'donation_platform_fee', value: '10' },
    ]

    for (const config of configurations) {
      const newConfig = configurationRepository.create(config)
      await configurationRepository.save(newConfig)
    }
    console.log('✅ Configurations seeded')

    // Seed users
    console.log('👥 Seeding users...')
    const adminUser = userRepository.create({
      email: 'carusadmin@mailinator.com',
      password: await bcrypt.hash('Password@101', 10),
      username: 'admin',
      first_name: 'Admin',
      last_name: 'Rahmlad',
      role: UserRoleEnum.ADMIN,
      status: 'ACTIVE',
      avatar:
        'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768740636/avatars/ahitxk0wszv2c8miqsgg.jpg',
      phone: '+2349023600083',
      address: '123 Admin Street',
      city: 'Abuja',
      region: 'Abuja',
      gender: 'Male',
      dob: new Date('1990-01-15'),
    })
    await userRepository.save(adminUser)

    const superadminUser = userRepository.create({
      email: 'carussuperadmin@mailinator.com',
      password: await bcrypt.hash('Password@101', 10),
      username: 'superadmin',
      first_name: 'SuperAdmin',
      last_name: 'Rahmlad',
      role: UserRoleEnum.SUPERADMIN,
      status: 'ACTIVE',
      avatar: 'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768740636/avatars/ahitxk0wszv2c8miqsgg.jpg',
      phone: '+2348109672784',
      address: '456 Admin Street',
      city: 'Lagos',
      region: 'Lagos',
      gender: 'Female',
      dob: new Date('1992-05-20'),
    })
    await userRepository.save(superadminUser)

    const regularUsers = []
    const randomNumber = Math.floor(Math.random() * (4 - 1 + 1)) + 1
    for (let i = 1; i <= 10; i++) {
      const avatar = `https://robohash.org/user${i}?set=${randomNumber}&size=200x200`
      const user = userRepository.create({
        email: `user${i}@example.com`,
        password: await bcrypt.hash('Password@123', 10),
        username: `user${i}`,
        first_name: `User`,
        last_name: `#${i}`,
        role: UserRoleEnum.USER,
        status: 'ACTIVE',
        avatar: avatar,
        phone: `+234801234567${i}`,
        address: `${i} Main Street`,
        city: 'Lagos',
        region: 'Lagos',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dob: new Date(
          1995 - (i % 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
      })
      regularUsers.push(await userRepository.save(user))
    }
    console.log('✅ Users seeded (1 admin + 1 superadmin + 10 regular users)')

    // Seed wallets
    console.log('💰 Seeding wallets...')
    const allUsers = [adminUser, ...regularUsers]
    const wallets = []

    for (const user of allUsers) {
      const wallet = walletRepository.create({
        user: user,
        points: Math.floor(Math.random() * 5000) + 500, // 500-5500 points
      })
      wallets.push(await walletRepository.save(wallet))
    }
    console.log('✅ Wallets seeded')

    // Seed donations (campaigns)
    console.log('🎁 Seeding donations (campaigns)...')
    const donations = []
    const campaignTitles = [
      'Clean Ocean Initiative',
      'Plastic Recycling Program',
      'Environmental Conservation',
      'Community Cleanup Drive',
      'Sustainable Living Project',
    ]
    const campaignDescriptions = [
      'Help us clean and protect our oceans from plastic waste',
      'Support our efforts to recycle and reduce plastic pollution',
      'Join us in protecting the environment for future generations',
      'Participate in our community cleanup activities',
      'Promote sustainable living practices in your community',
    ]
    const campaignImages = [
      'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768728785/group-happy-african-volunteers-with-garbage-bags-cleaning-area-park-africa-volunteering-charity-people-ecology-concept_1_uiv5js.jpg',
      'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768728784/portrait-man-doing-household-chores-participating-cleaning-home_1_fdxfsy.jpg',
      'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768728784/happy-volunteers-giving-high-five-each-other-after-completing-tasks-african-american-girl-european-boy_1_ufmpyu.jpg',
      'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768728785/group-happy-african-volunteers-with-garbage-bags-cleaning-area-park-africa-volunteering-charity-people-ecology-concept_1_uiv5js.jpg',
      'https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768728784/portrait-man-doing-household-chores-participating-cleaning-home_1_fdxfsy.jpg',
    ]

    for (let i = 0; i < campaignTitles.length; i++) {
      const donation = donationRepository.create({
        title: campaignTitles[i],
        description: campaignDescriptions[i],
        target: Math.floor(Math.random() * 5000) + 1000, // 1000-60000 target
        duration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        image: campaignImages[i],
      })
      donations.push(await donationRepository.save(donation))
    }
    console.log('✅ Donations (campaigns) seeded')

    // Seed contributions
    console.log('🤝 Seeding contributions...')
    for (let i = 0; i < regularUsers.length; i++) {
      const user = regularUsers[i]
      const wallet = wallets[i + 1] // +1 to skip admin wallet
      const numContributions = Math.floor(Math.random() * 3) + 1

      for (let j = 0; j < numContributions; j++) {
        const donation = donations[Math.floor(Math.random() * donations.length)]
        const amount = Math.floor(Math.random() * 500) + 50 // 50-550 points

        const contribution = contributionRepository.create({
          amount: amount,
          user: user,
          wallet: wallet,
          donation: donation,
        })
        await contributionRepository.save(contribution)

        // Create transaction for contribution
        const transaction = transactionRepository.create({
          type: 'donation',
          amount: amount,
          charges: 0,
          date: new Date(),
          status: 'fulfilled',
          description: `You donated ${amount.toFixed(2)} of your points to ${
            donation.title
          } campaign.`,
          user: user,
          wallet: wallet,
        })
        await transactionRepository.save(transaction)
      }
    }
    console.log('✅ Contributions seeded')

    // Seed redemptions
    console.log('💳 Seeding redemptions...')
    const airtimeNetworks = ['MTN', 'Airtel', 'Glo', '9mobile']
    const statuses = [
      RedemptionStatus.PENDING,
      RedemptionStatus.PAID,
      RedemptionStatus.DECLINED,
    ]

    for (let i = 0; i < regularUsers.length; i++) {
      const user = regularUsers[i]
      const wallet = wallets[i + 1]
      const numRedemptions = Math.floor(Math.random() * 2) + 1

      for (let j = 0; j < numRedemptions; j++) {
        const type =
          Math.random() > 0.5 ? RedemptionType.AIRTIME : RedemptionType.CASH
        const points = Math.floor(Math.random() * 500) + 100 // 100-600 points
        const status = statuses[Math.floor(Math.random() * statuses.length)]

        const redemption = redemptionRepository.create({
          type: type,
          points: points,
          status: status,
          user: user,
          network:
            type === RedemptionType.AIRTIME
              ? airtimeNetworks[
                  Math.floor(Math.random() * airtimeNetworks.length)
                ]
              : undefined,
          phoneNumber:
            type === RedemptionType.AIRTIME
              ? `080${Math.floor(Math.random() * 100000000)}`
              : undefined,
          accountNumber:
            type === RedemptionType.CASH
              ? `${Math.floor(Math.random() * 9000000000) + 1000000000}`
              : undefined,
          bankName:
            type === RedemptionType.CASH
              ? ['GT Bank', 'Access Bank','UBA','Sterling Bank', 'Zenith Bank'][
                  Math.floor(Math.random() * 4)
                ]
              : undefined,
          accountName:
            type === RedemptionType.CASH
              ? user.first_name + ' ' + user.last_name
              : undefined,
        })
        await redemptionRepository.save(redemption)

        // Create transaction for redemption request
        const transaction = transactionRepository.create({
          type: 'redemption',
          amount: points * 10, // Using 10 as conversion rate
          charges: 0,
          date: new Date(),
          status:
            status === RedemptionStatus.PAID
              ? 'fulfilled'
              : status === RedemptionStatus.DECLINED
              ? 'cancelled'
              : 'pending',
          description:
            status === RedemptionStatus.PENDING
              ? `You requested to convert ${points.toFixed(
                  2,
                )} points to ${type}.`
              : status === RedemptionStatus.PAID
              ? `Your request to convert ${points.toFixed(
                  2,
                )} points to ${type} was approved and you've been credited.`
              : `Your request to convert ${points.toFixed(
                  2,
                )} points to ${type} was declined. Points have been refunded to your wallet.`,
          user: user,
          wallet: wallet,
        })
        await transactionRepository.save(transaction)
      }
    }
    console.log('✅ Redemptions seeded')

    // Seed schedules
    console.log('📅 Seeding schedules...')
    const materials = Object.values(MaterialEnum)
    const categories = Object.values(CategoryEnum)

    for (let i = 0; i < regularUsers.length; i++) {
      const user = regularUsers[i]
      const numSchedules = Math.floor(Math.random() * 3) + 1

      for (let j = 0; j < numSchedules; j++) {
        const category =
          categories[Math.floor(Math.random() * categories.length)]
        const material = materials[Math.floor(Math.random() * materials.length)]
        const amount = Math.floor(Math.random() * 50) + 10

        const schedule = scheduleRepository.create({
          user: user,
          category: category,
          material: material,
          amount: amount,
          material_amount: Math.floor(Math.random() * 100) + 10,
          container_amount: Math.floor(Math.random() * 5) + 1,
          address: `${Math.floor(Math.random() * 1000)} Main Street, Lagos`,
          date: new Date(),
          status: ['pending', 'completed', 'cancelled'][
            Math.floor(Math.random() * 3)
          ],
          schedule_date: new Date(
            Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
          ),
          image: `https://res.cloudinary.com/dxvpnxbbl/image/upload/v1768727984/00e7226a03657fd1303c789116c7a27f_ssij9t.jpg`,
        })
        await scheduleRepository.save(schedule)

        // Create transaction for schedule
        const transaction = transactionRepository.create({
          type: category,
          amount: amount,
          charges: 0,
          date: new Date(),
          status: 'fulfilled',
          description: `Recycling ${category}: ${amount} units of ${material}`,
          user: user,
          wallet: wallets[i + 1],
          schedule: schedule,
        })
        await transactionRepository.save(transaction)
      }
    }
    console.log('✅ Schedules seeded')

    console.log('\n✨ Database seeding completed successfully!')
    console.log('\n📊 Seeded Data Summary:')
    console.log(`   - 1 Admin User + 1 SuperAdmin User + 10 Regular Users`)
    console.log(`   - 12 Wallets with random points (500-5500)`)
    console.log(`   - 5 Donation Campaigns`)
    console.log(`   - Multiple Contributions from users`)
    console.log(
      `   - Multiple Redemptions (Airtime & Cash) with various statuses`,
    )
    console.log(`   - Multiple Schedules for recycling activities`)
    console.log(`   - Transaction history for all activities`)
    console.log('\n🔐 Admin Credentials:')
    console.log(`   Email: carus@mailinator.com`)
    console.log(`   Password: Password@101`)
    console.log('\n🔐 SuperAdmin Credentials:')
    console.log(`   Email: superadmin@carus.com`)
    console.log(`   Password: SuperAdmin@123`)
    console.log('\n👤 Sample User Credentials:')
    console.log(`   Email: user1@example.com`)
    console.log(`   Password: Password@123`)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
    }
    process.exit(0)
  }
}

// Run seeder
seedDatabase()
