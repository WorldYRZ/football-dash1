import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Medal, Award, Coins } from 'lucide-react'

interface LeaderboardEntry {
  id: string
  score: number
  coins_collected: number
  game_date: string
  user_profiles: {
    display_name: string
  }
}

interface LeaderboardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      fetchLeaderboard()
    }
  }, [open])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Get top scores with user profiles
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          id,
          score,
          coins_collected,
          game_date,
          user_id,
          user_profiles!inner (
            display_name
          )
        `)
        .order('score', { ascending: false })
        .limit(100)

      if (error) throw error

      // Transform the data to match our interface
      const transformedData = (data || []).map((entry: any) => ({
        id: entry.id,
        score: entry.score,
        coins_collected: entry.coins_collected,
        game_date: entry.game_date,
        user_profiles: {
          display_name: entry.user_profiles.display_name
        }
      }))

      setEntries(transformedData)

      // Find user's rank
      if (user && data) {
        const userEntries = data.filter((entry: any) => entry.user_id === user.id)
        if (userEntries.length > 0) {
          const bestUserScore = Math.max(...userEntries.map((entry: any) => entry.score))
          const rank = data.findIndex((entry: any) => entry.score <= bestUserScore) + 1
          setUserRank(rank)
        }
      }

    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-muted-foreground font-bold">{rank}</span>
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge variant="default" className="bg-yellow-500">1st</Badge>
      case 2:
        return <Badge variant="secondary">2nd</Badge>
      case 3:
        return <Badge variant="outline">3rd</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Global Leaderboard
            {userRank && (
              <div className="ml-auto text-sm text-muted-foreground">
                Your rank: #{userRank}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] w-full">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-muted-foreground">No scores yet. Be the first!</div>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {entries.map((entry, index) => {
                const rank = index + 1
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      rank <= 3 ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(rank)}
                      </div>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {entry.user_profiles.display_name}
                          </span>
                          {getRankBadge(rank)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(entry.game_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {entry.score.toLocaleString()} yards
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Coins className="h-3 w-3 text-yellow-500" />
                        {entry.coins_collected}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default LeaderboardModal