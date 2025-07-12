import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import GameOverModal from './GameOverModal';

interface GameState {
  player: { x: number; y: number; stamina: number; speed: number };
  defenders: Array<{ x: number; y: number; speed: number; id: number }>;
  collectibles: Array<{ x: number; y: number; type: 'lightning' | 'coin'; id: number }>;
  score: number;
  coins: number;
  gameSpeed: number;
  fieldOffset: number;
  isGameOver: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  defenderIdCounter: number;
  collectibleIdCounter: number;
  lastMilestone: number;
}

interface TouchPos {
  x: number;
  y: number;
}

// Object pools for performance
const defenderPool: Array<{ x: number; y: number; speed: number; id: number; active: boolean }> = [];
const collectiblePool: Array<{ x: number; y: number; type: 'lightning' | 'coin'; id: number; active: boolean }> = [];

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const touchStartRef = useRef<TouchPos | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { submitScore } = useGame();
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    player: { x: 200, y: 500, stamina: 100, speed: 1.0 },
    defenders: [],
    collectibles: [],
    score: 0,
    coins: 0,
    gameSpeed: 2,
    fieldOffset: 0,
    isGameOver: false,
    isPaused: false,
    isPlaying: false,
    defenderIdCounter: 0,
    collectibleIdCounter: 0,
    lastMilestone: 0
  });

  const canvasWidth = 400;
  const canvasHeight = 600;

  // Initialize object pools
  const initializePools = useCallback(() => {
    // Initialize defender pool
    for (let i = 0; i < 10; i++) {
      defenderPool.push({
        x: 0, y: 0, speed: 0, id: i, active: false
      });
    }
    
    // Initialize collectible pool
    for (let i = 0; i < 20; i++) {
      collectiblePool.push({
        x: 0, y: 0, type: 'lightning', id: i, active: false
      });
    }
  }, []);

  // Get defender from pool
  const getDefenderFromPool = useCallback((x: number, y: number, speed: number) => {
    const defender = defenderPool.find(d => !d.active);
    if (defender) {
      defender.x = x;
      defender.y = y;
      defender.speed = speed;
      defender.active = true;
      return { ...defender };
    }
    return null;
  }, []);

  // Return defender to pool
  const returnDefenderToPool = useCallback((id: number) => {
    const defender = defenderPool.find(d => d.id === id);
    if (defender) {
      defender.active = false;
    }
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    setGameState({
      player: { x: canvasWidth / 2, y: canvasHeight - 100, stamina: 100, speed: 1.0 },
      defenders: [],
      collectibles: [],
      score: 0,
      coins: 0,
      gameSpeed: 2,
      fieldOffset: 0,
      isGameOver: false,
      isPaused: false,
      isPlaying: true,
      defenderIdCounter: 0,
      collectibleIdCounter: 0,
      lastMilestone: 0
    });
    
    // Reset pools
    defenderPool.forEach(d => d.active = false);
    collectiblePool.forEach(c => c.active = false);
  }, []);

  // Draw field with yard lines
  const drawField = (ctx: CanvasRenderingContext2D, offset: number) => {
    // Field background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'hsl(120, 45%, 25%)');
    gradient.addColorStop(1, 'hsl(120, 45%, 20%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Sidelines
    ctx.strokeStyle = 'hsl(0, 0%, 95%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, canvasHeight);
    ctx.moveTo(canvasWidth - 20, 0);
    ctx.lineTo(canvasWidth - 20, canvasHeight);
    ctx.stroke();

    // Yard lines (every 10 yards = 60px)
    ctx.strokeStyle = 'hsl(0, 0%, 90%)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      const y = (i * 60 + offset) % (canvasHeight + 60);
      if (y > -10) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(canvasWidth - 20, y);
        ctx.stroke();

        // Yard numbers
        if (i % 1 === 0) {
          ctx.fillStyle = 'hsl(0, 0%, 85%)';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          const yardNumber = ((gameState.score + (canvasHeight - y) / 6) / 10) | 0;
          if (yardNumber % 10 === 0 && yardNumber > 0) {
            ctx.fillText(yardNumber.toString(), canvasWidth / 2, y - 5);
          }
        }
      }
    }
  };

  // Draw player with improved visuals
  const drawPlayer = (ctx: CanvasRenderingContext2D, player: { x: number; y: number; stamina: number; speed: number }) => {
    const size = 20;
    
    // Speed effect - trail when moving fast
    if (player.speed > 0.8) {
      ctx.shadowColor = 'hsl(220, 85%, 55%)';
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowBlur = 10;
    }
    
    // Player body (affected by stamina)
    const staminaFactor = player.stamina / 100;
    const playerColor = staminaFactor > 0.5 ? 'hsl(220, 85%, 55%)' : 
                       staminaFactor > 0.25 ? 'hsl(30, 85%, 55%)' : 'hsl(0, 85%, 55%)';
    
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x - size/2, player.y - size/2, size, size);
    
    // Player helmet shine
    ctx.fillStyle = staminaFactor > 0.5 ? 'hsl(220, 85%, 70%)' : 'hsl(0, 0%, 70%)';
    ctx.fillRect(player.x - size/2 + 2, player.y - size/2 + 2, size/3, size/3);
    
    ctx.shadowBlur = 0;
  };

  // Draw defenders with improved AI visuals
  const drawDefenders = (ctx: CanvasRenderingContext2D, defenders: Array<{ x: number; y: number; speed: number; id: number }>) => {
    defenders.forEach(defender => {
      const size = 18;
      
      // Defender shadow with intensity based on speed
      ctx.shadowColor = 'hsl(15, 80%, 45%)';
      ctx.shadowBlur = Math.min(15, defender.speed * 3);
      
      // Defender body
      ctx.fillStyle = 'hsl(15, 80%, 45%)';
      ctx.fillRect(defender.x - size/2, defender.y - size/2, size, size);
      
      // Defender helmet
      ctx.fillStyle = 'hsl(15, 80%, 60%)';
      ctx.fillRect(defender.x - size/2 + 1, defender.y - size/2 + 1, size/4, size/4);
      
      // Speed indicator (small trail effect)
      if (defender.speed > 2) {
        ctx.fillStyle = 'hsla(15, 80%, 45%, 0.3)';
        ctx.fillRect(defender.x - size/2, defender.y + size/2, size, 5);
      }
      
      ctx.shadowBlur = 0;
    });
  };

  // Draw collectibles
  const drawCollectibles = (ctx: CanvasRenderingContext2D, collectibles: Array<{ x: number; y: number; type: string }>) => {
    collectibles.forEach(item => {
      const size = 12;
      
      if (item.type === 'lightning') {
        // Lightning bolt
        ctx.fillStyle = 'hsl(60, 100%, 70%)';
        ctx.shadowColor = 'hsl(60, 100%, 70%)';
        ctx.shadowBlur = 8;
        
        // Simple lightning shape
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - size);
        ctx.lineTo(item.x + size/2, item.y);
        ctx.lineTo(item.x - size/4, item.y);
        ctx.lineTo(item.x, item.y + size);
        ctx.lineTo(item.x - size/2, item.y);
        ctx.lineTo(item.x + size/4, item.y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Coin
        ctx.fillStyle = 'hsl(45, 100%, 60%)';
        ctx.shadowColor = 'hsl(45, 100%, 60%)';
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.arc(item.x, item.y, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin shine
        ctx.fillStyle = 'hsl(45, 100%, 80%)';
        ctx.beginPath();
        ctx.arc(item.x - 2, item.y - 2, size/4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.shadowBlur = 0;
    });
  };

  // Draw UI
  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Stamina bar
    const barWidth = 150;
    const barHeight = 8;
    const barX = 20;
    const barY = 20;
    
    // Background
    ctx.fillStyle = 'hsl(0, 0%, 20%)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Stamina fill
    const staminaWidth = (gameState.player.stamina / 100) * barWidth;
    const staminaColor = gameState.player.stamina > 50 ? 'hsl(120, 80%, 50%)' : 
                       gameState.player.stamina > 25 ? 'hsl(30, 95%, 60%)' : 'hsl(0, 85%, 55%)';
    ctx.fillStyle = staminaColor;
    ctx.fillRect(barX, barY, staminaWidth, barHeight);
    
    // Stamina border
    ctx.strokeStyle = 'hsl(0, 0%, 60%)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Score
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Yards: ${gameState.score}`, 20, 50);
    
    // Coins
    ctx.fillText(`Coins: ${gameState.coins}`, 20, 75);
  };

  // Optimized game update logic
  const updateGame = useCallback(() => {
    if (gameState.isGameOver || gameState.isPaused || !gameState.isPlaying) return;

    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Update field scroll (consistent downward movement)
      newState.fieldOffset += newState.gameSpeed;
      
      // Update score (1 point per frame ≈ yards)
      newState.score += Math.floor(newState.gameSpeed);
      
      // Stamina depletion (affected by speed)
      const staminaDrain = 0.08 + (newState.gameSpeed - 2) * 0.02;
      newState.player.stamina = Math.max(0, newState.player.stamina - staminaDrain);
      
      // Player speed affected by stamina
      newState.player.speed = Math.max(0.3, newState.player.stamina / 100);
      
      // Progressive difficulty
      if (newState.score > 0 && newState.score % 1000 === 0 && newState.score > newState.lastMilestone) {
        newState.gameSpeed += 0.3;
        newState.lastMilestone = newState.score;
      }
      
      // Enhanced AI: Defenders actively chase player
      newState.defenders = newState.defenders.map(defender => {
        const dx = newState.player.x - defender.x;
        const dy = newState.player.y - defender.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Improved chase algorithm with acceleration
        if (distance > 5) {
          const chaseSpeed = defender.speed * (1 + newState.score / 5000); // Increase with score
          const accelerationFactor = Math.min(2, distance / 100); // Faster when far away
          
          defender.x += (dx / distance) * chaseSpeed * accelerationFactor;
          defender.y += (dy / distance) * chaseSpeed * accelerationFactor;
        }
        
        // Move defenders down with field (maintaining relative position)
        defender.y += newState.gameSpeed;
        
        return defender;
      });
      
      // Efficient defender management using spatial partitioning
      const visibleDefenders = newState.defenders.filter(d => d.y < canvasHeight + 100 && d.y > -100);
      newState.defenders = visibleDefenders;
      
      // Spawn new defenders with better spacing
      if (Math.random() < 0.015 + (newState.score / 50000)) {
        const newDefender = getDefenderFromPool(
          Math.random() * (canvasWidth - 40) + 20,
          -30,
          1.5 + Math.random() * 2 + (newState.score / 2000)
        );
        if (newDefender) {
          newState.defenders.push(newDefender);
        }
      }
      
      // Update collectibles with better distribution
      newState.collectibles = newState.collectibles.map(item => ({
        ...item,
        y: item.y + newState.gameSpeed
      })).filter(item => item.y < canvasHeight + 50);
      
      // Spawn new collectibles with better logic
      const collectibleChance = 0.008 + (newState.player.stamina < 30 ? 0.012 : 0);
      if (Math.random() < collectibleChance) {
        const newCollectible = {
          x: Math.random() * (canvasWidth - 60) + 30,
          y: -20,
          type: (Math.random() > 0.7 || newState.player.stamina < 25) ? 'lightning' : 'coin' as 'lightning' | 'coin',
          id: newState.collectibleIdCounter++
        };
        newState.collectibles.push(newCollectible);
      }
      
      // Optimized collision detection for collectibles
      newState.collectibles = newState.collectibles.filter(item => {
        const dx = item.x - newState.player.x;
        const dy = item.y - newState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25) {
          if (item.type === 'lightning') {
            newState.player.stamina = Math.min(100, newState.player.stamina + 30);
          } else {
            newState.coins += 1;
          }
          return false;
        }
        return true;
      });
      
      // Improved collision detection for defenders
      const collision = newState.defenders.some(defender => {
        const dx = defender.x - newState.player.x;
        const dy = defender.y - newState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 20; // Slightly smaller for better feel
      });
      
      if (collision) {
        newState.isGameOver = true;
        newState.isPlaying = false;
        setTimeout(() => setGameOverModalOpen(true), 100);
      }
      
      // 100-yard milestones with celebration
      if (newState.score > 0 && Math.floor(newState.score / 1000) > Math.floor((newState.score - newState.gameSpeed) / 1000)) {
        newState.coins += 10;
        // Could add celebration effect here
      }
      
      return newState;
    });
  }, [gameState.isGameOver, gameState.isPaused, gameState.isPlaying, getDefenderFromPool, setGameOverModalOpen]);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw game elements
    drawField(ctx, gameState.fieldOffset);
    drawCollectibles(ctx, gameState.collectibles);
    drawDefenders(ctx, gameState.defenders);
    drawPlayer(ctx, gameState.player);
    drawUI(ctx);
    
    // Draw game over screen
    if (gameState.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.fillStyle = 'hsl(0, 0%, 95%)';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TACKLED!', canvasWidth / 2, canvasHeight / 2 - 40);
      
      ctx.font = '18px Arial';
      ctx.fillText(`Final Score: ${gameState.score} yards`, canvasWidth / 2, canvasHeight / 2);
      ctx.fillText(`Coins: ${gameState.coins}`, canvasWidth / 2, canvasHeight / 2 + 25);
      ctx.fillText('Tap to restart', canvasWidth / 2, canvasHeight / 2 + 60);
    }
    
    updateGame();
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updateGame]);

  // Improved touch handlers for responsive controls
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.isGameOver) {
      setGameOverModalOpen(true);
      return;
    }
    
    if (!gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (touch.clientX - rect.left) * (canvasWidth / rect.width);
    const y = (touch.clientY - rect.top) * (canvasHeight / rect.height);
    
    touchStartRef.current = { x, y };
    
    // Immediate player position update for responsiveness
    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        x: Math.max(25, Math.min(canvasWidth - 25, x)),
        y: Math.max(25, Math.min(canvasHeight - 25, y))
      }
    }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.isGameOver || !gameState.isPlaying) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (touch.clientX - rect.left) * (canvasWidth / rect.width);
    const y = (touch.clientY - rect.top) * (canvasHeight / rect.height);
    
    // Immediate position update with smooth constraints
    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        x: Math.max(25, Math.min(canvasWidth - 25, x)),
        y: Math.max(25, Math.min(canvasHeight - 25, y))
      }
    }));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartRef.current = null;
  };

  // Initialize pools and game on mount
  useEffect(() => {
    initializePools();
    initializeGame();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializePools, initializeGame]);

  // Optimized game loop with better performance
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isGameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState.isPlaying, gameState.isGameOver]);

  return (
    <div className="flex flex-col items-center justify-center bg-background min-h-screen p-4">
      {!gameState.isPlaying ? (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Football Dash
            </h1>
            <p className="text-xl text-foreground/80 mb-2">
              Endless running adventure
            </p>
            <p className="text-foreground/60">
              Drag to move • Avoid defenders • Collect power-ups
            </p>
          </div>
          
          <div className="relative mb-6">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="border-2 border-field-lines rounded-lg shadow-lg touch-none bg-field-green opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <button
                onClick={() => setGameState(prev => ({ ...prev, isPlaying: true }))}
                className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                START GAME
              </button>
            </div>
          </div>
          
          {profile && (
            <div className="text-center space-y-2">
              <p className="text-foreground/60 text-sm">
                High Score: {profile.high_score.toLocaleString()} yards
              </p>
              <p className="text-foreground/60 text-sm">
                Coins: {profile.coin_balance.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="border-2 border-field-lines rounded-lg shadow-lg touch-none bg-field-green"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-foreground/70 text-sm">
              Drag to move • Collect ⚡ for stamina • Avoid defenders
            </p>
            <p className="text-foreground/50 text-xs mt-1">
              +10 coins every 1000 yards
            </p>
            {profile && (
              <p className="text-foreground/60 text-xs mt-2">
                High Score: {profile.high_score.toLocaleString()} yards
              </p>
            )}
          </div>
        </>
      )}

      <GameOverModal
        open={gameOverModalOpen}
        onOpenChange={setGameOverModalOpen}
        score={gameState.score}
        coins={gameState.coins}
        onRestart={initializeGame}
      />
    </div>
  );
};

export default GameCanvas;