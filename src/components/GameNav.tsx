import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from './AuthModal'
import StoreModal from './StoreModal'
import LeaderboardModal from './LeaderboardModal'
import { User, ShoppingBag, Trophy, Coins, LogOut } from 'lucide-react'

const GameNav: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [storeModalOpen, setStoreModalOpen] = useState(false)
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false)

  return (
    <>
      <nav className="w-full max-w-md mx-auto p-4 bg-background/80 backdrop-blur-sm rounded-lg border mb-4">
        <div className="flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{profile?.display_name}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-3 w-3 text-yellow-500" />
                  {profile?.coin_balance?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={() => setAuthModalOpen(true)} size="sm">
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLeaderboardModalOpen(true)}
            >
              <Trophy className="h-4 w-4" />
            </Button>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStoreModalOpen(true)}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            )}

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <StoreModal open={storeModalOpen} onOpenChange={setStoreModalOpen} />
      <LeaderboardModal open={leaderboardModalOpen} onOpenChange={setLeaderboardModalOpen} />
    </>
  )
}

export default GameNav