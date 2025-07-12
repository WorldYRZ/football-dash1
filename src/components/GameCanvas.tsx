import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import GameOverModal from './GameOverModal';

interface GameState {
  player: { x: number; y: number; stamina: number; speed: number; targetX: number; targetY: number };
  defenders: Array<{ x: number; y: number; speed: number; stamina: number; id: number; pattern: string; patternTimer: number; targetX: number; targetY: number }>;
  collectibles: Array<{ x: number; y: number; type: 'lightning' | 'coin'; id: number; targetX: number; targetY: number }>;
  score: number;
  coins: number;
  gameSpeed: number;
  targetGameSpeed: number;
  baseGameSpeed: number;
  fieldOffset: number;
  isGameOver: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  defenderIdCounter: number;
  collectibleIdCounter: number;
  lastMilestone: number;
  achievements: Array<{ id: string; message: string; coins: number; timestamp: number }>;
  showAchievement: boolean;
  currentAchievement: { message: string; coins: number; timestamp: number } | null;
  gameStartTime: number;
  gameElapsedTime: number;
  difficultyLevel: number;
  maxDefenders: number;
  lastDifficultyIncrease: number;
  activeDefenderCount: number;
  lastFrameTime: number;
  deltaTime: number;
}

interface TouchPos {
  x: number;
  y: number;
}

// Object pools for performance
const defenderPool: Array<{ x: number; y: number; speed: number; stamina: number; id: number; pattern: string; patternTimer: number; targetX: number; targetY: number; active: boolean }> = [];
const collectiblePool: Array<{ x: number; y: number; type: 'lightning' | 'coin'; id: number; active: boolean }> = [];

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const touchStartRef = useRef<TouchPos | null>(null);
  const mouseDownRef = useRef<boolean>(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { submitScore } = useGame();
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    player: { x: 200, y: 500, stamina: 100, speed: 1.0, targetX: 200, targetY: 500 },
    defenders: [],
    collectibles: [],
    score: 0,
    coins: 0,
    gameSpeed: 1.2, // Start even slower for better initial experience
    targetGameSpeed: 1.2,
    baseGameSpeed: 1.2,
    fieldOffset: 0,
    isGameOver: false,
    isPaused: false,
    isPlaying: false,
    defenderIdCounter: 0,
    collectibleIdCounter: 0,
    lastMilestone: 0,
    achievements: [],
    showAchievement: false,
    currentAchievement: null,
    gameStartTime: 0,
    gameElapsedTime: 0,
    difficultyLevel: 1,
    maxDefenders: 1, // Start with only 1 defender
    lastDifficultyIncrease: 0,
    activeDefenderCount: 0,
    lastFrameTime: 0,
    deltaTime: 0
  });

  const canvasWidth = 400;
  const canvasHeight = 600;

  // Initialize object pools
  const initializePools = useCallback(() => {
    // Initialize defender pool
    for (let i = 0; i < 15; i++) {
      defenderPool.push({
        x: 0, y: 0, speed: 0, stamina: 100, id: i, pattern: 'straight', patternTimer: 0, 
        targetX: 0, targetY: 0, active: false
      });
    }
    
    // Initialize collectible pool
    for (let i = 0; i < 20; i++) {
      collectiblePool.push({
        x: 0, y: 0, type: 'lightning', id: i, active: false
      });
    }
  }, []);

  // Get defender from pool with smooth movement targets
  const getDefenderFromPool = useCallback((x: number, y: number, speed: number) => {
    const defender = defenderPool.find(d => !d.active);
    if (defender) {
      defender.x = x;
      defender.y = y;
      defender.targetX = x;
      defender.targetY = y;
      defender.speed = speed;
      defender.stamina = 60 + Math.random() * 40;
      defender.pattern = ['straight', 'zigzag', 'curved', 'aggressive'][Math.floor(Math.random() * 4)];
      defender.patternTimer = 0;
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
  // Performance-optimized game initialization
  const initializeGame = useCallback(() => {
    const startTime = Date.now();
    setGameState({
      player: { x: canvasWidth / 2, y: canvasHeight - 100, stamina: 100, speed: 1.0, targetX: canvasWidth / 2, targetY: canvasHeight - 100 },
      defenders: [],
      collectibles: [],
      score: 0,
      coins: 0,
      gameSpeed: 1.2,
      targetGameSpeed: 1.2,
      baseGameSpeed: 1.2,
      fieldOffset: 0,
      isGameOver: false,
      isPaused: false,
      isPlaying: true,
      defenderIdCounter: 0,
      collectibleIdCounter: 0,
      lastMilestone: 0,
      achievements: [],
      showAchievement: false,
      currentAchievement: null,
      gameStartTime: startTime,
      gameElapsedTime: 0,
      difficultyLevel: 1,
      maxDefenders: 1,
      lastDifficultyIncrease: 0,
      activeDefenderCount: 0,
      lastFrameTime: startTime,
      deltaTime: 0
    });
    
    // Reset pools
    defenderPool.forEach(d => d.active = false);
    collectiblePool.forEach(c => c.active = false);
  }, []);

  // Independent continuous field scrolling with synchronized yard markers
  const drawField = (ctx: CanvasRenderingContext2D, offset: number, currentYards: number) => {
    // Field background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'hsl(120, 45%, 25%)');
    gradient.addColorStop(1, 'hsl(120, 45%, 20%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // FIXED SIDELINES - These stay in place (endless runner style)
    ctx.strokeStyle = 'hsl(0, 0%, 95%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, canvasHeight);
    ctx.moveTo(canvasWidth - 20, 0);
    ctx.lineTo(canvasWidth - 20, canvasHeight);
    ctx.stroke();

    // SCROLLING YARD LINES - Only the field content moves
    ctx.strokeStyle = 'hsl(0, 0%, 90%)';
    ctx.lineWidth = 2;
    
    const pixelsPerYard = 12; // 12 pixels = 1 yard (consistent throughout)
    const yardsPerLine = 10; // Yard line every 10 yards
    const pixelsPerYardLine = pixelsPerYard * yardsPerLine; // 120 pixels per yard line
    
    // Player's fixed position on screen (endless runner style)
    const playerScreenY = canvasHeight - 100;
    
    // Calculate yard lines to display based on current progress
    const startYard = Math.floor((currentYards - 10) / yardsPerLine) * yardsPerLine;
    const endYard = startYard + 20 * yardsPerLine; // Show 20 yard lines worth
    
    for (let yard = startYard; yard <= endYard; yard += yardsPerLine) {
      if (yard < 0) continue; // Don't show negative yards
      
      // Calculate screen position for this yard line
      const yardDifference = yard - currentYards;
      const screenY = playerScreenY - (yardDifference * pixelsPerYard);
      
      // Only draw if visible on screen (with buffer for smooth transitions)
      if (screenY >= -60 && screenY <= canvasHeight + 60) {
        // Draw scrolling yard line (between the FIXED sidelines)
        ctx.beginPath();
        ctx.moveTo(20, screenY);
        ctx.lineTo(canvasWidth - 20, screenY);
        ctx.stroke();
        
        // Draw synchronized yard markers (these scroll with the field)
        if (yard >= 0) {
          ctx.fillStyle = 'hsl(0, 0%, 95%)';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          
          // Left side yard marker (scrolls with field content)
          ctx.save();
          ctx.translate(35, screenY);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(yard.toString(), 0, 0);
          ctx.restore();
          
          // Right side yard marker (scrolls with field content)
          ctx.save();
          ctx.translate(canvasWidth - 35, screenY);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(yard.toString(), 0, 0);
          ctx.restore();
          
          // Center field marker for major yard lines (50, 100, etc.)
          if (yard % 50 === 0 && yard > 0) {
            ctx.fillStyle = 'hsl(0, 0%, 85%)';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(yard.toString(), canvasWidth / 2, screenY - 5);
            ctx.fillStyle = 'hsl(0, 0%, 95%)';
            ctx.font = 'bold 16px Arial';
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
  const drawDefenders = (ctx: CanvasRenderingContext2D, defenders: Array<{ x: number; y: number; speed: number; stamina: number; pattern: string; id: number }>) => {
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

  // Draw UI with achievement notifications and difficulty feedback
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
    
    // Score and game info (restored top UI elements)
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Yards: ${gameState.score}`, 20, 50);
    ctx.fillText(`Coins: ${gameState.coins}`, 20, 75);
    
    // Difficulty indicator (restored)
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = 'hsl(45, 100%, 70%)';
    ctx.fillText(`Level: ${gameState.difficultyLevel}`, 20, 95);
    ctx.fillText(`Time: ${Math.floor(gameState.gameElapsedTime / 1000)}s`, 120, 95);
    
    // Achievement notification
    if (gameState.showAchievement && gameState.currentAchievement) {
      const achX = canvasWidth / 2;
      const achY = 120;
      
      // Achievement background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(achX - 100, achY - 30, 200, 60);
      
      // Achievement border
      ctx.strokeStyle = 'hsl(45, 100%, 60%)';
      ctx.lineWidth = 2;
      ctx.strokeRect(achX - 100, achY - 30, 200, 60);
      
      // Achievement text
      ctx.fillStyle = 'hsl(45, 100%, 70%)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MILESTONE!', achX, achY - 10);
      ctx.fillText(gameState.currentAchievement.message, achX, achY + 10);
      ctx.fillText(`+${gameState.currentAchievement.coins} Coins`, achX, achY + 25);
    }
    
  };

  // High-performance Subway Surfers-style update system
  const updateGame = useCallback(() => {
    if (gameState.isGameOver || gameState.isPaused || !gameState.isPlaying) return;

    setGameState(prevState => {
      const currentTime = Date.now();
      const deltaTime = Math.min(currentTime - prevState.lastFrameTime, 16.67); // Cap at 60fps
      const newState = { ...prevState, lastFrameTime: currentTime, deltaTime };
      
      // Update game timer
      newState.gameElapsedTime = Date.now() - newState.gameStartTime;
      const elapsedSeconds = newState.gameElapsedTime / 1000;
      
      // Progressive difficulty system (Subway Surfers style)
      let newDifficultyLevel = 1;
      let newMaxDefenders = 1;
      let speedMultiplier = 1;
      
      if (elapsedSeconds >= 90) {
        newDifficultyLevel = 7;
        newMaxDefenders = 7;
        speedMultiplier = 2.5; // Cap at challenging but playable level
      } else if (elapsedSeconds >= 75) {
        newDifficultyLevel = 6;
        newMaxDefenders = 6;
        speedMultiplier = 2.3;
      } else if (elapsedSeconds >= 60) {
        newDifficultyLevel = 5;
        newMaxDefenders = 5;
        speedMultiplier = 2.0;
      } else if (elapsedSeconds >= 45) {
        newDifficultyLevel = 4;
        newMaxDefenders = 4;
        speedMultiplier = 1.7;
      } else if (elapsedSeconds >= 30) {
        newDifficultyLevel = 3;
        newMaxDefenders = 3;
        speedMultiplier = 1.4;
      } else if (elapsedSeconds >= 15) {
        newDifficultyLevel = 2;
        newMaxDefenders = 2;
        speedMultiplier = 1.2;
      } else if (elapsedSeconds >= 10) {
        // After 10 seconds, start increasing speed but keep 1 defender
        speedMultiplier = 1.1;
      }
      
      // Trigger difficulty increase effects
      if (newDifficultyLevel > newState.difficultyLevel) {
        newState.lastDifficultyIncrease = newState.gameElapsedTime;
        
        // Show immersive toast notification (no level numbers)
        toast({
          title: "Speed Increased!",
          description: "More defenders incoming - stay sharp!",
          duration: 2000,
        });
      }
      
      newState.difficultyLevel = newDifficultyLevel;
      newState.maxDefenders = newMaxDefenders;
      newState.targetGameSpeed = newState.baseGameSpeed * speedMultiplier;
      
      // Smooth speed transitions for fluid gameplay
      const speedDiff = newState.targetGameSpeed - newState.gameSpeed;
      newState.gameSpeed += speedDiff * 0.1; // Gradual speed change
      
      // AUTOMATIC continuous field scrolling - always moves at constant speed
      // Speed increases over time for difficulty progression (like Subway Surfers)
      newState.fieldOffset += newState.gameSpeed * (deltaTime / 16.67);
      
      // Yard calculation based purely on automatic field scrolling
      // Player's progress is based on time and automatic field movement
      newState.score = Math.floor(newState.fieldOffset / 12); // 12 pixels = 1 yard
      
      // Hide achievement after 3 seconds
      if (newState.showAchievement && Date.now() - (newState.currentAchievement?.timestamp || 0) > 3000) {
        newState.showAchievement = false;
        newState.currentAchievement = null;
      }
      
      // ENDLESS RUNNER PLAYER MOVEMENT: Both horizontal and vertical with smooth interpolation
      const playerLerpSpeed = 0.25;
      newState.player.x += (newState.player.targetX - newState.player.x) * playerLerpSpeed;
      newState.player.y += (newState.player.targetY - newState.player.y) * playerLerpSpeed;
      
      // Movement boundaries - player can move freely within the field to the sidelines
      const horizontalRange = canvasWidth - 35; // Allow movement closer to right sideline
      const verticalRange = canvasHeight - 50;
      
      // Enforce boundaries for both horizontal and vertical movement
      newState.player.x = Math.max(35, Math.min(horizontalRange, newState.player.x));
      newState.player.y = Math.max(25, Math.min(verticalRange, newState.player.y));
      newState.player.targetX = Math.max(35, Math.min(horizontalRange, newState.player.targetX));
      newState.player.targetY = Math.max(25, Math.min(verticalRange, newState.player.targetY));
      
      // Performance-optimized stamina system
      const staminaDrain = (0.06 + (elapsedSeconds / 1000) * 0.02) * (deltaTime / 16.67);
      newState.player.stamina = Math.max(0, newState.player.stamina - staminaDrain);
      
      // Player speed affected by stamina
      newState.player.speed = newState.player.stamina <= 0 ? 0.85 : Math.max(0.85, newState.player.stamina / 100);
      
      // Yard-based milestone system with smooth speed increases
      const currentHundreds = Math.floor(newState.score / 100);
      if (currentHundreds > Math.floor(newState.lastMilestone / 100)) {
        newState.lastMilestone = newState.score;
        
        // Smooth yard-based difficulty progression
        const yardDifficultyBonus = Math.min(0.8, currentHundreds * 0.05);
        newState.targetGameSpeed = (newState.baseGameSpeed * speedMultiplier) + yardDifficultyBonus;
        
        const achievementMessage = `${currentHundreds * 100} Yards!`;
        const achievement = {
          id: `milestone_${currentHundreds}`,
          message: achievementMessage,
          coins: 10,
          timestamp: Date.now()
        };
        
        newState.achievements.push(achievement);
        newState.currentAchievement = { message: achievementMessage, coins: 10, timestamp: Date.now() };
        newState.showAchievement = true;
        newState.coins += 10;
        
        toast({
          title: "Milestone Achievement!",
          description: `${achievementMessage} - Speed increased!`,
          duration: 3000,
        });
      }
      
      // Count active defenders
      newState.activeDefenderCount = newState.defenders.length;
      
      // Smooth AI movement with performance optimization
      newState.defenders = newState.defenders.map(defender => {
        const dx = newState.player.x - defender.x;
        const dy = newState.player.y - defender.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update pattern timer with delta time
        defender.patternTimer += deltaTime / 16.67;
        
        // Check if defender is behind player
        const isBehindPlayer = defender.y > newState.player.y;
        
        // Performance-optimized stamina drain
        if (isBehindPlayer) {
          defender.stamina = Math.max(0, defender.stamina - 0.8 * (deltaTime / 16.67));
        } else {
          defender.stamina = Math.max(0, defender.stamina - 0.1 * (deltaTime / 16.67));
        }
        
        // Difficulty-based AI behavior
        const aiAccuracy = Math.min(0.9, 0.3 + (newState.difficultyLevel * 0.1)); // More accurate at higher levels
        const aiSpeed = 1 + (newState.difficultyLevel * 0.2); // Faster at higher levels
        
        // Calculate effective speed
        let staminaFactor = defender.stamina <= 0 ? 0.75 : 1;
        let behindFactor = isBehindPlayer ? 0.6 : 1;
        let effectiveSpeed = defender.speed * staminaFactor * behindFactor * aiSpeed;
        
        // Apply movement patterns (less predictable at higher difficulty)
        let patternOffsetX = 0;
        let patternOffsetY = 0;
        
        switch (defender.pattern) {
          case 'zigzag':
            patternOffsetX = Math.sin(defender.patternTimer * 0.1) * (30 / newState.difficultyLevel);
            break;
          case 'curved':
            patternOffsetX = Math.cos(defender.patternTimer * 0.05) * (20 / newState.difficultyLevel);
            patternOffsetY = Math.sin(defender.patternTimer * 0.08) * (10 / newState.difficultyLevel);
            break;
          case 'aggressive':
            const aggressiveBoost = distance < 100 ? (1.2 + newState.difficultyLevel * 0.1) : 1;
            patternOffsetX = Math.sin(defender.patternTimer * 0.15) * (15 / newState.difficultyLevel);
            effectiveSpeed *= aggressiveBoost;
            break;
        }
        
        // AI tracking based on difficulty (imperfect at low levels)
        if (distance > 5) {
          const chaseSpeed = effectiveSpeed;
          const accelerationFactor = Math.min(2, distance / 100);
          
          // Add inaccuracy at lower difficulty levels
          const targetX = newState.player.x + patternOffsetX + (Math.random() - 0.5) * (100 * (1 - aiAccuracy));
          const targetY = newState.player.y + patternOffsetY;
          const adjustedDx = targetX - defender.x;
          const adjustedDy = targetY - defender.y;
          const adjustedDistance = Math.sqrt(adjustedDx * adjustedDx + adjustedDy * adjustedDy);
          
          if (adjustedDistance > 0) {
            defender.x += (adjustedDx / adjustedDistance) * chaseSpeed * accelerationFactor * aiAccuracy;
            defender.y += (adjustedDy / adjustedDistance) * chaseSpeed * accelerationFactor * aiAccuracy;
          }
        }
        
        // Independent field movement - defenders move with field regardless of player
        // Field scrolling is completely separate from player movement
        defender.y += newState.gameSpeed * (isBehindPlayer ? 1.5 : 1) * (deltaTime / 16.67);
        
        return defender;
      });
      
      // Add collision detection between defenders to prevent overlapping
      for (let i = 0; i < newState.defenders.length; i++) {
        for (let j = i + 1; j < newState.defenders.length; j++) {
          const defenderA = newState.defenders[i];
          const defenderB = newState.defenders[j];
          
          const dx = defenderA.x - defenderB.x;
          const dy = defenderA.y - defenderB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 35; // Minimum distance between defenders
          
          if (distance < minDistance && distance > 0) {
            // Calculate separation force
            const separationForce = (minDistance - distance) / 2;
            const normalX = dx / distance;
            const normalY = dy / distance;
            
            // Apply separation force to both defenders
            defenderA.x += normalX * separationForce * 0.5;
            defenderA.y += normalY * separationForce * 0.5;
            defenderB.x -= normalX * separationForce * 0.5;
            defenderB.y -= normalY * separationForce * 0.5;
            
            // Keep defenders within field bounds
            defenderA.x = Math.max(30, Math.min(canvasWidth - 30, defenderA.x));
            defenderB.x = Math.max(30, Math.min(canvasWidth - 30, defenderB.x));
          }
        }
      }
      
      // Improved AI despawning - remove defenders far off screen to prevent memory issues
      const visibleDefenders = newState.defenders.filter(d => d.y < canvasHeight + 150 && d.y > -150);
      
      // Return unused defenders to pool for memory efficiency
      newState.defenders.filter(d => d.y >= canvasHeight + 150 || d.y <= -150)
        .forEach(d => returnDefenderToPool(d.id));
      
      newState.defenders = visibleDefenders;
      newState.activeDefenderCount = newState.defenders.length;
      
      // Spawn defenders based on difficulty level and time
      const shouldSpawn = newState.activeDefenderCount < newState.maxDefenders && 
                         Math.random() < (0.02 + newState.difficultyLevel * 0.005);
      
      if (shouldSpawn) {
        const speedVariation = 1 + (newState.difficultyLevel * 0.3) + Math.random() * 0.5;
        const newDefender = getDefenderFromPool(
          Math.random() * (canvasWidth - 40) + 20,
          -30,
          1.2 * speedVariation
        );
        if (newDefender) {
          newState.defenders.push(newDefender);
          newState.activeDefenderCount++;
        }
      }
      
      // Independent collectible movement - moves with field scrolling only
      newState.collectibles = newState.collectibles.map(item => ({
        ...item,
        y: item.y + newState.gameSpeed * (deltaTime / 16.67) // Field-based movement only
      })).filter(item => item.y < canvasHeight + 50);
      
      // Spawn collectibles
      const collectibleChance = 0.008 + (newState.player.stamina < 30 ? 0.012 : 0);
      if (Math.random() < collectibleChance) {
        const newCollectible = {
          x: Math.random() * (canvasWidth - 60) + 30,
          y: -20,
          targetX: Math.random() * (canvasWidth - 60) + 30,
          targetY: -20,
          type: (Math.random() > 0.7 || newState.player.stamina < 25) ? 'lightning' : 'coin' as 'lightning' | 'coin',
          id: newState.collectibleIdCounter++
        };
        newState.collectibles.push(newCollectible);
      }
      
      // Collision detection for collectibles
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
      
      // Collision detection for defenders
      const collision = newState.defenders.some(defender => {
        const dx = defender.x - newState.player.x;
        const dy = defender.y - newState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 20;
      });
      
      if (collision) {
        newState.isGameOver = true;
        newState.isPlaying = false;
        setTimeout(() => setGameOverModalOpen(true), 100);
      }
      
      return newState;
    });
  }, [gameState.isGameOver, gameState.isPaused, gameState.isPlaying, getDefenderFromPool, setGameOverModalOpen, toast]);

  // Optimized 60fps game loop with frame rate limiting
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing for better visuals
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // High-performance canvas clearing
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Optimized rendering order for performance
    drawField(ctx, gameState.fieldOffset, gameState.score);
    drawCollectibles(ctx, gameState.collectibles);
    drawDefenders(ctx, gameState.defenders);
    drawPlayer(ctx, gameState.player);
    drawUI(ctx);
    
    // Optimized game over screen rendering
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
    
    // Smooth 60fps animation loop
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updateGame]);

  // Mouse and touch handlers for cross-platform support
  const getInputPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvasWidth / rect.width);
    const y = (clientY - rect.top) * (canvasHeight / rect.height);
    
    return { x, y };
  };

  // Player controls both horizontal and vertical movement
  const updatePlayerPosition = (x: number, y: number) => {
    setGameState(prevState => ({
      ...prevState,
      player: {
        ...prevState.player,
        targetX: Math.max(35, Math.min(canvasWidth - 35, x)),
        targetY: Math.max(25, Math.min(canvasHeight - 25, y)) // Allow full vertical movement
      }
    }));
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.isGameOver) {
      setGameOverModalOpen(true);
      return;
    }
    
    if (!gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
    
    const pos = getInputPosition(e);
    if (!pos) return;
    
    updatePlayerPosition(pos.x, pos.y);
        // Update player target positions (field scrolling remains independent)
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.isGameOver || !gameState.isPlaying) return;
    
    const pos = getInputPosition(e);
    if (!pos) return;
    
    updatePlayerPosition(pos.x, pos.y);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartRef.current = null;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState.isGameOver) {
      setGameOverModalOpen(true);
      return;
    }
    
    if (!gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
    
    const pos = getInputPosition(e);
    if (!pos) return;
    
    mouseDownRef.current = true;
    updatePlayerPosition(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState.isGameOver || !gameState.isPlaying || !mouseDownRef.current) return;
    
    const pos = getInputPosition(e);
    if (!pos) return;
    
    updatePlayerPosition(pos.x, pos.y);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    mouseDownRef.current = false;
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    mouseDownRef.current = false;
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
              className="border-2 border-field-lines rounded-lg shadow-lg touch-none bg-field-green cursor-pointer"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-foreground/70 text-sm">
              Drag or click to move • Collect ⚡ for stamina • Avoid defenders
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