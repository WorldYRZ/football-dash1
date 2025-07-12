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
    <div className="w-full max-w-md mx-auto">
      <Card className="p-8 bg-gradient-to-br from-field-green/10 to-primary/5 border-2 border-primary/20">
        <CardContent className="space-y-6">
          {/* Game Title */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary tracking-tight">
              Football Dash
            </h1>
            <p className="text-foreground/70 text-lg">
              Endless Running Adventure
            </p>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Best</span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {highScore.toLocaleString()}
              </div>
            </div>
            
            <div className="text-center p-3 bg-background/50 rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Coins</span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {coinBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Game Features */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Target className="h-4 w-4 text-primary" />
              <span>Dodge defenders and run for yards</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Collect lightning bolts for stamina</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Badge variant="outline" className="h-4 w-4 rounded-full p-0 bg-yellow-500" />
              <span>Earn coins to unlock customizations</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onStartGame}
              size="lg" 
              className="w-full text-lg font-semibold hover:scale-105 transition-transform"
            >
              <Play className="h-5 w-5 mr-2" />
              START GAME
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={onOpenStore}
                className="flex items-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                Store
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onOpenLeaderboard}
                className="flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="text-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Pro Tips</p>
            <p>• Drag anywhere to move instantly</p>
            <p>• Low stamina = slower movement</p>
            <p>• AI gets smarter as you progress</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StartScreen