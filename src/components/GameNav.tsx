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
      <nav className="w-full max-w-md mx-auto arcade-panel p-3 mb-4">
        <div className="flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-pixel text-primary uppercase">{profile?.display_name}</span>
                <div className="flex items-center gap-1 text-xs font-pixel">
                  <Coins className="h-3 w-3 text-coin animate-pixel-blink" />
                  <span className="text-coin">{profile?.coin_balance?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setAuthModalOpen(true)} 
              className="arcade-button text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              SIGN IN
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              className="arcade-button text-xs px-2 py-2"
              onClick={() => setLeaderboardModalOpen(true)}
            >
              <Trophy className="h-3 w-3" />
            </button>

            {user && (
              <button
                className="arcade-button text-xs px-2 py-2"
                onClick={() => setStoreModalOpen(true)}
              >
                <ShoppingBag className="h-3 w-3" />
              </button>
            )}

            {user && (
              <button
                className="arcade-button text-xs px-2 py-2"
                onClick={signOut}
              >
                <LogOut className="h-3 w-3" />
              </button>
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