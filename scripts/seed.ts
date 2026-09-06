import { createSupabaseServiceClient } from '@/lib/supabase'
import { faker } from '@faker-js/faker'

// Run: npx ts-node scripts/seed.ts
async function seed() {
  const supabase = createSupabaseServiceClient()

  try {
    console.log('🌱 Starting database seed...')

    // Create test users
    console.log('📝 Creating test users...')
    const users = []
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email: faker.internet.email(),
            name: faker.person.fullName(),
            role: i === 0 ? 'ADMIN' : 'USER',
            avatar_url: faker.image.avatar(),
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('Error creating user:', error.message)
        continue
      }
      users.push(data[0])
    }
    console.log(`✅ Created ${users.length} users`)

    // Create test courses
    console.log('📚 Creating test courses...')
    const courses = []
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            title: faker.lorem.words(5),
            description: faker.lorem.paragraphs(2),
            instructor_id: users[0].id,
            price: Math.floor(Math.random() * 1000000) + 100000, // VND
            thumbnail_url: faker.image.url(),
            status: 'PUBLISHED',
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('Error creating course:', error.message)
        continue
      }
      courses.push(data[0])
    }
    console.log(`✅ Created ${courses.length} courses`)

    // Create test lessons
    console.log('📖 Creating test lessons...')
    const lessons = []
    for (const course of courses) {
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('lessons')
          .insert([
            {
              course_id: course.id,
              title: `Lesson ${i + 1}: ${faker.lorem.words(3)}`,
              description: faker.lorem.paragraphs(1),
              video_url: faker.internet.url(),
              order: i + 1,
              created_at: new Date().toISOString()
            }
          ])
          .select()

        if (error) {
          console.error('Error creating lesson:', error.message)
          continue
        }
        lessons.push(data[0])
      }
    }
    console.log(`✅ Created ${lessons.length} lessons`)

    // Create test orders
    console.log('💳 Creating test orders...')
    const orders = []
    for (let i = 1; i < users.length; i++) {
      const course = courses[Math.floor(Math.random() * courses.length)]
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: users[i].id,
            course_id: course.id,
            amount: course.price,
            status: 'COMPLETED',
            transaction_ref: faker.string.uuid(),
            created_at: new Date().toISOString()
          }
        ])
        .select()

      if (error) {
        console.error('Error creating order:', error.message)
        continue
      }
      orders.push(data[0])
    }
    console.log(`✅ Created ${orders.length} orders`)

    // Create test lesson progress
    console.log('⏳ Creating test lesson progress...')
    let progressCount = 0
    for (const order of orders) {
      const userLessons = lessons.filter(l => l.course_id === order.course_id)
      for (const lesson of userLessons) {
        const { error } = await supabase
          .from('lesson_progress')
          .insert([
            {
              user_id: order.user_id,
              lesson_id: lesson.id,
              watched_percentage: Math.floor(Math.random() * 100),
              completed: Math.random() > 0.5,
              created_at: new Date().toISOString()
            }
          ])

        if (!error) progressCount++
      }
    }
    console.log(`✅ Created ${progressCount} progress records`)

    console.log('🎉 Seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()
