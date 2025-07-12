import { supabase } from './supabase'

export const initializeSampleData = async () => {
  try {
    // Check if sample data already exists
    const { data: existingItems } = await supabase
      .from('store_items')
      .select('id')
      .limit(1)

    if (existingItems && existingItems.length > 0) {
      return // Sample data already exists
    }

    // Sample store items
    const storeItems = [
      // Skins
      {
        name: 'Lightning Runner',
        category: 'skin',
        price: 100,
        description: 'Electric speed with glowing trails',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Shadow Dash',
        category: 'skin', 
        price: 150,
        description: 'Dark and mysterious appearance',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Golden Champion',
        category: 'skin',
        price: 500,
        description: 'Legendary golden appearance',
        is_premium: true,
        is_limited_time: false
      },
      
      // Jerseys
      {
        name: 'Home Team Jersey',
        category: 'jersey',
        price: 50,
        description: 'Classic home team colors',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Away Team Jersey',
        category: 'jersey',
        price: 50,
        description: 'Sharp away team design',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Pro Bowl Jersey',
        category: 'jersey',
        price: 200,
        description: 'Elite pro bowl uniform',
        is_premium: true,
        is_limited_time: true,
        limited_until: '2024-12-31'
      },
      
      // Helmets
      {
        name: 'Standard Helmet',
        category: 'helmet',
        price: 25,
        description: 'Basic protective gear',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Chrome Helmet',
        category: 'helmet',
        price: 100,
        description: 'Shiny chrome finish',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Diamond Helmet',
        category: 'helmet',
        price: 300,
        description: 'Sparkling diamond-studded helmet',
        is_premium: true,
        is_limited_time: false
      },
      
      // Cleats
      {
        name: 'Speed Cleats',
        category: 'cleats',
        price: 75,
        description: 'Enhanced speed and agility',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Grip Masters',
        category: 'cleats',
        price: 125,
        description: 'Superior field traction',
        is_premium: false,
        is_limited_time: false
      },
      
      // Gloves
      {
        name: 'Sticky Gloves',
        category: 'gloves',
        price: 40,
        description: 'Better ball handling',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Pro Grip Gloves',
        category: 'gloves',
        price: 80,
        description: 'Professional grade grip',
        is_premium: false,
        is_limited_time: false
      },
      
      // Animations
      {
        name: 'Victory Dance',
        category: 'animation',
        price: 150,
        description: 'Special touchdown celebration',
        is_premium: false,
        is_limited_time: false
      },
      {
        name: 'Lightning Strike',
        category: 'animation',
        price: 250,
        description: 'Epic lightning celebration',
        is_premium: true,
        is_limited_time: false
      }
    ]

    // Insert store items
    const { error: storeError } = await supabase
      .from('store_items')
      .insert(storeItems)

    if (storeError) throw storeError

    // Sample achievements
    const achievements = [
      {
        name: 'First Steps',
        description: 'Run your first 100 yards',
        condition_type: 'yards_run',
        condition_value: 100,
        reward_coins: 10,
        icon: '🏃'
      },
      {
        name: 'Distance Runner',
        description: 'Run 1,000 yards total',
        condition_type: 'yards_run',
        condition_value: 1000,
        reward_coins: 50,
        icon: '🏃‍♂️'
      },
      {
        name: 'Marathon Master',
        description: 'Run 10,000 yards total',
        condition_type: 'yards_run',
        condition_value: 10000,
        reward_coins: 200,
        icon: '🏆'
      },
      {
        name: 'Coin Collector',
        description: 'Collect 100 coins',
        condition_type: 'coins_collected',
        condition_value: 100,
        reward_coins: 25,
        icon: '💰'
      },
      {
        name: 'Treasure Hunter',
        description: 'Collect 500 coins',
        condition_type: 'coins_collected',
        condition_value: 500,
        reward_coins: 100,
        icon: '💎'
      },
      {
        name: 'Shopping Spree',
        description: 'Purchase 5 items from the store',
        condition_type: 'items_purchased',
        condition_value: 5,
        reward_coins: 75,
        icon: '🛍️'
      }
    ]

    // Insert achievements
    const { error: achievementsError } = await supabase
      .from('achievements')
      .insert(achievements)

    if (achievementsError) throw achievementsError

    // Sample daily challenges for today
    const today = new Date().toISOString().split('T')[0]
    const dailyChallenges = [
      {
        name: 'Morning Sprint',
        description: 'Run 500 yards in a single game',
        challenge_type: 'run_yards',
        target_value: 500,
        reward_coins: 20,
        date: today
      },
      {
        name: 'Coin Rush',
        description: 'Collect 15 coins in one run',
        challenge_type: 'collect_coins',
        target_value: 15,
        reward_coins: 25,
        date: today
      },
      {
        name: 'Endurance Test',
        description: 'Run 1,000 yards total today',
        challenge_type: 'run_yards',
        target_value: 1000,
        reward_coins: 40,
        date: today
      }
    ]

    // Insert daily challenges
    const { error: challengesError } = await supabase
      .from('daily_challenges')
      .insert(dailyChallenges)

    if (challengesError) throw challengesError

    console.log('Sample data initialized successfully!')
  } catch (error) {
    console.error('Error initializing sample data:', error)
  }
}