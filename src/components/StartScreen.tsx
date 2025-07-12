import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Trophy, ShoppingBag, Target, Zap } from 'lucide-react'

interface StartScreenProps {
  onStartGame: () => void
  onOpenStore: () => void
  onOpenLeaderboard: () => void
  highScore: number
  coinBalance: number
}

const StartScreen: React.FC<StartScreenProps> = ({ 
  onStartGame, 
  onOpenStore, 
  onOpenLeaderboard, 
  highScore, 
  coinBalance 
}) => {
  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="arcade-panel p-6 relative scanlines">
        <div className="space-y-6">
          {/* Game Title */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-pixel text-primary neon-text uppercase tracking-wider animate-neon-pulse">
              Football Dash
            </h1>
            <div className="bg-muted/50 border-2 border-accent p-2">
              <p className="text-xs font-pixel text-accent uppercase">
                8-bit Football Arcade
              </p>
            </div>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center arcade-panel p-3">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Trophy className="h-3 w-3 text-primary animate-pixel-blink" />
                <span className="text-xs font-pixel text-primary uppercase">Best</span>
              </div>
              <div className="text-lg font-pixel text-foreground">
                {highScore.toLocaleString()}
              </div>
            </div>
            
            <div className="text-center arcade-panel p-3">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Zap className="h-3 w-3 text-coin animate-lightning-flash" />
                <span className="text-xs font-pixel text-coin uppercase">Coins</span>
              </div>
              <div className="text-lg font-pixel text-foreground">
                {coinBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="space-y-2 bg-background/80 border-2 border-muted p-3">
            <div className="flex items-center gap-2 text-xs font-pixel">
              <Target className="h-3 w-3 text-secondary" />
              <span className="text-secondary uppercase">Dodge defenders</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-pixel">
              <Zap className="h-3 w-3 text-lightning" />
              <span className="text-lightning uppercase">Collect power-ups</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-pixel">
              <div className="h-3 w-3 bg-coin border border-foreground" />
              <span className="text-coin uppercase">Earn coins</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onStartGame}
              variant="arcade"
              size="lg" 
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Game
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={onOpenStore}
                size="sm"
              >
                <ShoppingBag className="h-3 w-3" />
                Store
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onOpenLeaderboard}
                size="sm"
              >
                <Trophy className="h-3 w-3" />
                Board
              </Button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="text-center bg-muted border-2 border-primary/50 p-3">
            <p className="font-pixel text-xs text-primary mb-2 uppercase">Tips</p>
            <div className="space-y-1 text-xs font-pixel text-muted-foreground">
              <p>• Drag to move fast</p>
              <p>• Low stamina = slow</p>
              <p>• AI learns from you</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartScreen