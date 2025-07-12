import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Coins, Zap, RotateCcw, Share2 } from 'lucide-react'

interface GameOverModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  score: number
  coins: number
  onRestart: () => void
}

const GameOverModal: React.FC<GameOverModalProps> = ({ 
  open, 
  onOpenChange, 
  score, 
  coins, 
  onRestart 
}) => {
  const { profile } = useAuth()
  const { submitScore, doubleCoinsWithAd, submittingScore } = useGame()
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [hasDoubledCoins, setHasDoubledCoins] = useState(false)

  const handleSubmitScore = async () => {
    if (hasSubmitted) return
    
    const success = await submitScore(score, coins)
    if (success) {
      setHasSubmitted(true)
    }
  }

  const handleDoubleCoins = async () => {
    if (hasDoubledCoins) return
    
    const success = await doubleCoinsWithAd(coins)
    if (success) {
      setHasDoubledCoins(true)
    }
  }

  const handleRestart = () => {
    setHasSubmitted(false)
    setHasDoubledCoins(false)
    onRestart()
    onOpenChange(false)
  }

  const isNewHighScore = profile && score > profile.high_score

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isNewHighScore ? (
              <div className="flex items-center justify-center gap-2 text-yellow-500">
                <Trophy className="h-6 w-6" />
                New High Score!
              </div>
            ) : (
              'Game Over'
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Score Display */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">
                {score.toLocaleString()}
              </div>
              <div className="text-lg text-muted-foreground">Yards</div>
            </div>
            
            <div className="flex justify-center items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-semibold">{coins} Coins</span>
              {!hasDoubledCoins && coins > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDoubleCoins}
                  className="ml-2"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  2x
                </Button>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">
                {profile?.high_score?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Best</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">
                {profile?.coin_balance?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Coins</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {profile && !hasSubmitted && (
              <Button 
                onClick={handleSubmitScore}
                disabled={submittingScore}
                className="w-full"
              >
                {submittingScore ? 'Saving...' : 'Save Score'}
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleRestart}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // In a real app, this would open share dialog
                  navigator.share?.({
                    title: 'Football Dash',
                    text: `I just scored ${score} yards in Football Dash!`,
                    url: window.location.href
                  }).catch(() => {
                    // Fallback for browsers without native sharing
                    navigator.clipboard?.writeText(
                      `I just scored ${score} yards in Football Dash! ${window.location.href}`
                    )
                  })
                }}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Achievements notification area */}
          {isNewHighScore && (
            <div className="text-center">
              <Badge variant="default" className="bg-yellow-500 text-black">
                🏆 New Personal Best!
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GameOverModal