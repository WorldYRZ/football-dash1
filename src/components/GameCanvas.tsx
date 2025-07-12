import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GameState {
  player: { x: number; y: number; stamina: number };
  defenders: Array<{ x: number; y: number; speed: number }>;
  collectibles: Array<{ x: number; y: number; type: 'lightning' | 'coin' }>;
  score: number;
  coins: number;
  gameSpeed: number;
  fieldOffset: number;
  isGameOver: boolean;
  isPaused: boolean;
}

interface TouchPos {
  x: number;
  y: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const touchStartRef = useRef<TouchPos | null>(null);
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>({
    player: { x: 200, y: 500, stamina: 100 },
    defenders: [],
    collectibles: [],
    score: 0,
    coins: 0,
    gameSpeed: 2,
    fieldOffset: 0,
    isGameOver: false,
    isPaused: false
  });

  const canvasWidth = 400;
  const canvasHeight = 600;

  // Initialize game
  const initializeGame = useCallback(() => {
    const initialDefenders = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * (canvasWidth - 40) + 20,
      y: Math.random() * 200 + 100,
      speed: 1 + Math.random() * 2
    }));

    const initialCollectibles = Array.from({ length: 2 }, (_, i) => ({
      x: Math.random() * (canvasWidth - 30) + 15,
      y: Math.random() * 300 + 50,
      type: Math.random() > 0.7 ? 'coin' : 'lightning' as 'lightning' | 'coin'
    }));

    setGameState({
      player: { x: canvasWidth / 2, y: canvasHeight - 100, stamina: 100 },
      defenders: initialDefenders,
      collectibles: initialCollectibles,
      score: 0,
      coins: 0,
      gameSpeed: 2,
      fieldOffset: 0,
      isGameOver: false,
      isPaused: false
    });
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

  // Draw player
  const drawPlayer = (ctx: CanvasRenderingContext2D, player: { x: number; y: number; stamina: number }) => {
    const size = 20;
    
    // Player glow effect
    ctx.shadowColor = 'hsl(220, 85%, 55%)';
    ctx.shadowBlur = 15;
    
    // Player body
    ctx.fillStyle = 'hsl(220, 85%, 55%)';
    ctx.fillRect(player.x - size/2, player.y - size/2, size, size);
    
    // Player helmet shine
    ctx.fillStyle = 'hsl(220, 85%, 70%)';
    ctx.fillRect(player.x - size/2 + 2, player.y - size/2 + 2, size/3, size/3);
    
    ctx.shadowBlur = 0;
  };

  // Draw defenders
  const drawDefenders = (ctx: CanvasRenderingContext2D, defenders: Array<{ x: number; y: number; speed: number }>) => {
    defenders.forEach(defender => {
      const size = 18;
      
      // Defender shadow
      ctx.shadowColor = 'hsl(15, 80%, 45%)';
      ctx.shadowBlur = 10;
      
      // Defender body
      ctx.fillStyle = 'hsl(15, 80%, 45%)';
      ctx.fillRect(defender.x - size/2, defender.y - size/2, size, size);
      
      // Defender helmet
      ctx.fillStyle = 'hsl(15, 80%, 60%)';
      ctx.fillRect(defender.x - size/2 + 1, defender.y - size/2 + 1, size/4, size/4);
      
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

  // Update game logic
  const updateGame = useCallback(() => {
    if (gameState.isGameOver || gameState.isPaused) return;

    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Update field scroll
      newState.fieldOffset += newState.gameSpeed;
      
      // Update score (1 point per game loop ≈ 1 yard)
      newState.score += 1;
      
      // Stamina depletion
      newState.player.stamina = Math.max(0, newState.player.stamina - 0.1);
      
      // Progressive difficulty
      if (newState.score % 500 === 0) {
        newState.gameSpeed += 0.2;
      }
      
      // Update defenders (AI chase player)
      newState.defenders = newState.defenders.map(defender => {
        const dx = newState.player.x - defender.x;
        const dy = newState.player.y - defender.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          defender.x += (dx / distance) * defender.speed;
          defender.y += (dy / distance) * defender.speed;
        }
        
        // Move defenders down with field
        defender.y += newState.gameSpeed;
        
        return defender;
      });
      
      // Remove off-screen defenders and add new ones
      newState.defenders = newState.defenders.filter(d => d.y < canvasHeight + 50);
      
      if (Math.random() < 0.02) {
        newState.defenders.push({
          x: Math.random() * (canvasWidth - 40) + 20,
          y: -20,
          speed: 1 + Math.random() * 2 + (newState.score / 1000)
        });
      }
      
      // Update collectibles
      newState.collectibles = newState.collectibles.map(item => ({
        ...item,
        y: item.y + newState.gameSpeed
      })).filter(item => item.y < canvasHeight + 30);
      
      // Add new collectibles
      if (Math.random() < 0.015) {
        newState.collectibles.push({
          x: Math.random() * (canvasWidth - 30) + 15,
          y: -15,
          type: Math.random() > 0.7 ? 'coin' : 'lightning'
        });
      }
      
      // Check collisions with collectibles
      newState.collectibles = newState.collectibles.filter(item => {
        const dx = item.x - newState.player.x;
        const dy = item.y - newState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) {
          if (item.type === 'lightning') {
            newState.player.stamina = Math.min(100, newState.player.stamina + 25);
          } else {
            newState.coins += 1;
          }
          return false;
        }
        return true;
      });
      
      // Check collisions with defenders
      const collision = newState.defenders.some(defender => {
        const dx = defender.x - newState.player.x;
        const dy = defender.y - newState.player.y;
        return Math.sqrt(dx * dx + dy * dy) < 25;
      });
      
      if (collision) {
        newState.isGameOver = true;
      }
      
      // 100-yard celebration
      if (newState.score > 0 && newState.score % 1000 === 0) {
        newState.coins += 10;
      }
      
      return newState;
    });
  }, [gameState.isGameOver, gameState.isPaused]);

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

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (gameState.isGameOver) {
      initializeGame();
      return;
    }
    
    touchStartRef.current = { x, y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current || gameState.isGameOver) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        x: Math.max(30, Math.min(canvasWidth - 30, x)),
        y: Math.max(30, Math.min(canvasHeight - 30, y))
      }
    }));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartRef.current = null;
  };

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeGame]);

  // Start game loop
  useEffect(() => {
    if (!gameState.isGameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState.isGameOver]);

  return (
    <div className="flex flex-col items-center justify-center bg-background min-h-screen p-4">
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
          +10 coins every 100 yards
        </p>
      </div>
    </div>
  );
};

export default GameCanvas;