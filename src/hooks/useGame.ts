import { useState, useCallback } from 'react'
import { supabase, CoinTransaction, Leaderboard, UserAchievement, UserDailyProgress } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useToast } from '@/hooks/use-toast'

export const useGame = () => {
  const { user, profile, updateProfile } = useAuth()
  const { toast } = useToast()
  const [submittingScore, setSubmittingScore] = useState(false)

  const addCoins = useCallback(async (amount: number, description: string) => {
    if (!user || !profile) return false

    try {
      // Add transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount,
          transaction_type: 'earned',
          description
        })

      if (transactionError) throw transactionError

      // Update user's coin balance
      const newBalance = profile.coin_balance + amount
      await updateProfile({ coin_balance: newBalance })

      return true
    } catch (error) {
      console.error('Error adding coins:', error)
      return false
    }
  }, [user, profile, updateProfile])

  const spendCoins = useCallback(async (amount: number, description: string) => {
    if (!user || !profile || profile.coin_balance < amount) return false

    try {
      // Add transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          transaction_type: 'spent',
          description
        })

      if (transactionError) throw transactionError

      // Update user's coin balance
      const newBalance = profile.coin_balance - amount
      await updateProfile({ coin_balance: newBalance })

      return true
    } catch (error) {
      console.error('Error spending coins:', error)
      return false
    }
  }, [user, profile, updateProfile])

  const submitScore = useCallback(async (score: number, coinsCollected: number) => {
    if (!user || !profile || submittingScore) return false

    setSubmittingScore(true)

    try {
      // Add to leaderboard
      const { error: leaderboardError } = await supabase
        .from('leaderboard')
        .insert({
          user_id: user.id,
          score,
          coins_collected: coinsCollected,
          game_date: new Date().toISOString().split('T')[0]
        })

      if (leaderboardError) throw leaderboardError

      // Update high score if necessary
      if (score > profile.high_score) {
        await updateProfile({ high_score: score })
        toast({
          title: "New High Score!",
          description: `You scored ${score} yards!`,
        })
      }

      // Add coins to balance
      if (coinsCollected > 0) {
        await addCoins(coinsCollected, `Collected in game run (${score} yards)`)
      }

      // Check achievements
      await checkAchievements(score, coinsCollected)

      // Update daily challenge progress
      await updateDailyChallengeProgress(score, coinsCollected)

      return true
    } catch (error) {
      console.error('Error submitting score:', error)
      toast({
        title: "Error saving game",
        description: "Failed to save your score. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setSubmittingScore(false)
    }
  }, [user, profile, submittingScore, addCoins, updateProfile, toast])

  const checkAchievements = useCallback(async (score: number, coinsCollected: number) => {
    if (!user) return

    try {
      // Get all achievements
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')

      if (!achievements) return

      // Get user's current achievement progress
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)

      const progressMap = new Map(
        userAchievements?.map(ua => [ua.achievement_id, ua]) || []
      )

      for (const achievement of achievements) {
        const currentProgress = progressMap.get(achievement.id)
        let newProgress = currentProgress?.progress || 0

        // Calculate new progress based on achievement type
        switch (achievement.condition_type) {
          case 'yards_run':
            newProgress += score
            break
          case 'coins_collected':
            newProgress += coinsCollected
            break
        }

        // Check if achievement is completed
        const isCompleted = newProgress >= achievement.condition_value

        if (currentProgress) {
          // Update existing progress
          if (newProgress > currentProgress.progress) {
            await supabase
              .from('user_achievements')
              .update({
                progress: newProgress,
                completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
              })
              .eq('id', currentProgress.id)

            if (isCompleted && !currentProgress.completed) {
              // Award achievement
              await addCoins(achievement.reward_coins, `Achievement: ${achievement.name}`)
              toast({
                title: "Achievement Unlocked!",
                description: `${achievement.name} - +${achievement.reward_coins} coins`,
              })
            }
          }
        } else {
          // Create new progress record
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
              progress: newProgress,
              completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null
            })

          if (isCompleted) {
            await addCoins(achievement.reward_coins, `Achievement: ${achievement.name}`)
            toast({
              title: "Achievement Unlocked!",
              description: `${achievement.name} - +${achievement.reward_coins} coins`,
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }, [user, addCoins, toast])

  const updateDailyChallengeProgress = useCallback(async (score: number, coinsCollected: number) => {
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    try {
      // Get today's challenges
      const { data: challenges } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('date', today)

      if (!challenges) return

      // Get user's progress for today
      const { data: userProgress } = await supabase
        .from('user_daily_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)

      const progressMap = new Map(
        userProgress?.map(up => [up.challenge_id, up]) || []
      )

      for (const challenge of challenges) {
        const currentProgress = progressMap.get(challenge.id)
        let newProgress = currentProgress?.progress || 0

        // Calculate new progress based on challenge type
        switch (challenge.challenge_type) {
          case 'run_yards':
            newProgress += score
            break
          case 'collect_coins':
            newProgress += coinsCollected
            break
        }

        const isCompleted = newProgress >= challenge.target_value

        if (currentProgress) {
          // Update existing progress
          if (newProgress > currentProgress.progress && !currentProgress.completed) {
            await supabase
              .from('user_daily_progress')
              .update({
                progress: Math.min(newProgress, challenge.target_value),
                completed: isCompleted
              })
              .eq('id', currentProgress.id)

            if (isCompleted) {
              await addCoins(challenge.reward_coins, `Daily Challenge: ${challenge.name}`)
              toast({
                title: "Daily Challenge Complete!",
                description: `${challenge.name} - +${challenge.reward_coins} coins`,
              })
            }
          }
        } else {
          // Create new progress record
          await supabase
            .from('user_daily_progress')
            .insert({
              user_id: user.id,
              challenge_id: challenge.id,
              progress: Math.min(newProgress, challenge.target_value),
              completed: isCompleted,
              date: today
            })

          if (isCompleted) {
            await addCoins(challenge.reward_coins, `Daily Challenge: ${challenge.name}`)
            toast({
              title: "Daily Challenge Complete!",
              description: `${challenge.name} - +${challenge.reward_coins} coins`,
            })
          }
        }
      }
    } catch (error) {
      console.error('Error updating daily challenge progress:', error)
    }
  }, [user, addCoins, toast])

  const doubleCoinsWithAd = useCallback(async (baseCoins: number) => {
    // In a real app, you'd show an ad here
    // For now, we'll simulate it
    const doubledCoins = baseCoins
    await addCoins(doubledCoins, `Ad reward - doubled coins`)
    
    toast({
      title: "Coins Doubled!",
      description: `You earned an extra ${doubledCoins} coins!`,
    })

    return true
  }, [addCoins, toast])

  return {
    addCoins,
    spendCoins,
    submitScore,
    doubleCoinsWithAd,
    submittingScore
  }
}