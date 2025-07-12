import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import GameOverModal from './GameOverModal';

interface GameState {
  player: { 
    x: number; 
    y: number; 
    stamina: number; 
    speed: number; 
    targetX: number; 
    targetY: number;
    isJumping: boolean;
    jumpStartTime: number;
    jumpCooldownEnd: number;
    lastTapTime: number;
  };
  defenders: Array<{ 
    x: number; 
    y: number; 
    speed: number; 
    stamina: number; 
    id: number; 
    pattern: string; 
    patternTimer: number; 
    targetX: number; 
    targetY: number;
    isDiving: boolean;
    diveStartTime: number;
    diveTargetX: number;
    diveTargetY: number;
    hasDived: boolean;
    isDown: boolean;
  }>;
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
const defenderPool: Array<{ x: number; y: number; speed: number; stamina: number; id: number; pattern: string; patternTimer: number; targetX: number; targetY: number; isDiving: boolean; diveStartTime: number; diveTargetX: number; diveTargetY: number; hasDived: boolean; isDown: boolean; active: boolean }> = [];
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
    player: { 
      x: 200, 
      y: 500, 
      stamina: 100, 
      speed: 1.0, 
      targetX: 200, 
      targetY: 500,
      isJumping: false,
      jumpStartTime: 0,
      jumpCooldownEnd: 0,
      lastTapTime: 0
    },
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
        targetX: 0, targetY: 0, isDiving: false, diveStartTime: 0, diveTargetX: 0, diveTargetY: 0, 
        hasDived: false, isDown: false, active: false
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
      defender.isDiving = false;
      defender.diveStartTime = 0;
      defender.diveTargetX = 0;
      defender.diveTargetY = 0;
      defender.hasDived = false;
      defender.isDown = false;
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
      player: { 
        x: canvasWidth / 2, 
        y: canvasHeight - 100, 
        stamina: 100, 
        speed: 1.0, 
        targetX: canvasWidth / 2, 
        targetY: canvasHeight - 100,
        isJumping: false,
        jumpStartTime: 0,
        jumpCooldownEnd: 0,
        lastTapTime: 0
      },
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

  // Field scrolling with FIXED sidelines and SCROLLING horizontal lines
  const drawField = (ctx: CanvasRenderingContext2D, offset: number, currentYards: number) => {
    // Field background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'hsl(120, 45%, 25%)');
    gradient.addColorStop(1, 'hsl(120, 45%, 20%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // FIXED SIDELINES - Stay in place covering whole canvas
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

  // Draw player with jump animation only
  const drawPlayer = (ctx: CanvasRenderingContext2D, player: { x: number; y: number; stamina: number; speed: number; isJumping: boolean; jumpStartTime: number }) => {
    const time = Date.now() / 100; // Animation timer
    const runCycle = Math.sin(time) * 0.3; // Running animation cycle
    
    // FORWARD LEAP ANIMATION - Calculate jump height and forward motion
    const currentTime = Date.now();
    const jumpProgress = player.isJumping ? Math.min(1, (currentTime - player.jumpStartTime) / 600) : 0;
    const jumpHeight = player.isJumping ? Math.sin(jumpProgress * Math.PI) * 20 : 0; // Higher arc for forward leap
    const jumpScale = player.isJumping ? 1 + jumpHeight * 0.03 : 1; // More dramatic scaling
    const shadowOffset = jumpHeight * 1.2; // More pronounced shadow separation
    const forwardLean = player.isJumping ? jumpProgress * 0.3 : 0; // Forward leaning during jump
    
    // Player team colors (blue team)
    const helmetColor = 'hsl(220, 85%, 55%)'; // Blue helmet
    const jerseyColor = 'hsl(220, 70%, 45%)'; // Blue jersey
    const pantsColor = 'hsl(220, 50%, 35%)'; // Darker blue pants
    const skinColor = 'hsl(30, 50%, 70%)'; // Skin tone
    
    // Stamina affects player appearance
    const staminaFactor = player.stamina / 100;
    const glowIntensity = staminaFactor > 0.5 ? 15 : staminaFactor > 0.25 ? 8 : 0;
    
    // FORWARD LEAP VISUAL EFFECTS
    if (player.isJumping) {
      ctx.shadowColor = 'hsl(60, 100%, 70%)'; // Golden glow when jumping
      ctx.shadowBlur = 25 + jumpHeight; // Dynamic glow intensity
    } else if (glowIntensity > 0) {
      ctx.shadowColor = helmetColor;
      ctx.shadowBlur = glowIntensity;
    }
    
    
    // Apply jump position offset
    const drawY = player.y - jumpHeight;
    
    // MOTION TRAIL for forward leap
    if (player.isJumping) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `hsla(60, 100%, 70%, ${0.4 - i * 0.1})`;
        const trailOffset = i * 8;
        ctx.beginPath();
        ctx.ellipse(player.x, drawY + trailOffset, 6 - i, 8 - i, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw player shadow on ground (moves forward during jump)
    if (player.isJumping) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      const shadowStretch = 1 + jumpHeight * 0.1; // Shadow stretches during leap
      ctx.ellipse(player.x, player.y + shadowOffset, 8 * shadowStretch, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Save context for transformations
    ctx.save();
    ctx.translate(player.x, drawY);
    ctx.rotate(forwardLean); // Slight forward lean during leap
    ctx.scale(jumpScale, jumpScale);
    ctx.translate(-player.x, -drawY);
    
    // BODY (jersey) - oval shaped from top-down
    ctx.fillStyle = jerseyColor;
    ctx.beginPath();
    ctx.ellipse(player.x, drawY, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ARMS - animated running motion (extended during forward leap)
    const armMotion = player.isJumping ? runCycle * 3 + forwardLean * 10 : runCycle * 8;
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = jerseyColor;
    ctx.lineWidth = 2;
    
    // Left arm (reaches forward during leap)
    ctx.beginPath();
    const leftArmExtension = player.isJumping ? 2 : 0;
    ctx.ellipse(player.x - 10 - leftArmExtension, drawY + armMotion - leftArmExtension, 3, player.isJumping ? 9 : 8, Math.PI * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Right arm (reaches forward during leap)
    ctx.beginPath();
    const rightArmExtension = player.isJumping ? 2 : 0;
    ctx.ellipse(player.x + 10 + rightArmExtension, drawY - armMotion - rightArmExtension, 3, player.isJumping ? 9 : 8, -Math.PI * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // LEGS - animated running motion (extended during forward leap)
    ctx.fillStyle = pantsColor;
    const legMotion = player.isJumping ? runCycle * 2 + forwardLean * 8 : runCycle * 6;
    
    // Left leg (extends back during leap)
    ctx.beginPath();
    const leftLegExtension = player.isJumping ? 3 : 0;
    ctx.ellipse(player.x - 6, drawY + 8 + legMotion + leftLegExtension, 4, player.isJumping ? 12 : 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Right leg (extends forward during leap)
    ctx.beginPath();
    const rightLegExtension = player.isJumping ? 3 : 0;
    ctx.ellipse(player.x + 6, drawY + 8 - legMotion - rightLegExtension, 4, player.isJumping ? 12 : 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // HELMET - team colored with face mask
    ctx.fillStyle = staminaFactor > 0.5 ? helmetColor : staminaFactor > 0.25 ? 'hsl(30, 85%, 55%)' : 'hsl(0, 85%, 55%)';
    ctx.beginPath();
    ctx.ellipse(player.x, drawY - 8, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet shine/highlight
    ctx.fillStyle = 'hsla(0, 0%, 100%, 0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x - 3, drawY - 10, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Face mask
    ctx.strokeStyle = 'hsl(0, 0%, 80%)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x - 4, drawY - 4);
    ctx.lineTo(player.x + 4, drawY - 4);
    ctx.moveTo(player.x, drawY - 8);
    ctx.lineTo(player.x, drawY - 2);
    ctx.stroke();
    
    // SHOULDER PADS
    ctx.fillStyle = jerseyColor;
    ctx.beginPath();
    ctx.ellipse(player.x - 8, drawY - 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(player.x + 8, drawY - 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Restore context
    ctx.restore();
    ctx.shadowBlur = 0;
  };

  // Draw defenders with realistic dive and fall states
  const drawDefenders = (ctx: CanvasRenderingContext2D, defenders: Array<{ x: number; y: number; speed: number; stamina: number; pattern: string; id: number; isDiving: boolean; diveStartTime: number; isDown: boolean }>) => {
    defenders.forEach(defender => {
      const time = Date.now() / 120; // Slightly different animation speed for defenders
      const runCycle = Math.sin(time + defender.id) * 0.3; // Individual animation cycles
      
      // FORWARD DIVE ANIMATION - Calculate dive motion and visual state
      const currentTime = Date.now();
      const diveProgress = defender.isDiving ? Math.min(1, (currentTime - defender.diveStartTime) / 600) : 0;
      const diveStretch = defender.isDiving ? 1 + diveProgress * 0.8 : 1; // More dramatic stretch during forward dive
      const diveHeight = defender.isDiving ? Math.sin(diveProgress * Math.PI) * 6 : 0; // Lower dive for forward lunge
      const diveLean = defender.isDiving ? diveProgress * 0.5 : 0; // Forward lean during dive
      
      // Defender team colors (red team)
      const helmetColor = 'hsl(15, 80%, 45%)'; // Red helmet
      const jerseyColor = 'hsl(15, 70%, 40%)'; // Red jersey
      const pantsColor = 'hsl(15, 50%, 30%)'; // Darker red pants
      const skinColor = 'hsl(30, 50%, 70%)'; // Skin tone
      
      // Speed-based visual effects
      const speedIntensity = Math.min(15, defender.speed * 3);
      
      // FALLEN DEFENDER VISUAL EFFECTS
      if (defender.isDown) {
        ctx.shadowColor = 'hsl(0, 0%, 40%)'; // Gray shadow for fallen defenders
        ctx.shadowBlur = 5;
        ctx.globalAlpha = 0.6; // Fade fallen defenders
      } else if (defender.isDiving) {
        ctx.shadowColor = 'hsl(0, 85%, 60%)'; // Intense red glow when diving
        ctx.shadowBlur = 30 + diveProgress * 20; // Increasing intensity during dive
      } else {
        ctx.shadowColor = helmetColor;
        ctx.shadowBlur = speedIntensity;
      }
      
      // Apply dive/fall position offset and scaling
      const drawY = defender.y - diveHeight;
      
      // DUST/IMPACT EFFECT for fallen defenders
      if (defender.isDown) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `hsla(30, 50%, 60%, ${0.3 - i * 0.1})`;
          const dustOffset = i * 6;
          ctx.beginPath();
          ctx.ellipse(defender.x + dustOffset - 6, drawY + 15, 4 - i, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // FORWARD DIVE MOTION TRAILS (only when actively diving)
      if (defender.isDiving && !defender.isDown) {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `hsla(0, 85%, 60%, ${0.5 - i * 0.1})`;
          const trailOffset = i * 12; // Longer trails for forward motion
          ctx.beginPath();
          ctx.ellipse(defender.x, drawY + trailOffset, 6 - i, 10 - i, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Save context for transformation
      ctx.save();
      ctx.translate(defender.x, drawY);
      if (defender.isDown) {
        ctx.rotate(Math.PI / 2); // Rotate 90 degrees for fallen defender
        ctx.scale(0.8, 0.6); // Flatten fallen defender
      } else {
        ctx.rotate(diveLean); // Forward lean during dive
        ctx.scale(diveStretch, defender.isDiving ? 0.7 : 1); // Flatten and stretch during forward dive
      }
      ctx.translate(-defender.x, -drawY);
      
      // BODY (jersey) - oval shaped from top-down
      ctx.fillStyle = jerseyColor;
      ctx.beginPath();
      ctx.ellipse(defender.x, drawY, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // ARMS - animated running motion (fully extended forward during dive)
      const armMotion = defender.isDiving ? 0 : runCycle * 7; // No arm movement during dive
      ctx.fillStyle = skinColor;
      ctx.strokeStyle = jerseyColor;
      ctx.lineWidth = 2;
      
      // Left arm (fully extended forward during dive)
      ctx.beginPath();
      const leftArmX = defender.isDiving ? defender.x - 18 : defender.x - 9;
      const leftArmY = defender.isDiving ? drawY - 8 : drawY + armMotion;
      ctx.ellipse(leftArmX, leftArmY, 3, defender.isDiving ? 12 : 7, defender.isDiving ? Math.PI * 0.4 : Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Right arm (fully extended forward during dive)
      ctx.beginPath();
      const rightArmX = defender.isDiving ? defender.x + 18 : defender.x + 9;
      const rightArmY = defender.isDiving ? drawY - 8 : drawY - armMotion;
      ctx.ellipse(rightArmX, rightArmY, 3, defender.isDiving ? 12 : 7, defender.isDiving ? -Math.PI * 0.4 : -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // LEGS - animated running motion (streamlined during forward dive)
      ctx.fillStyle = pantsColor;
      const legMotion = defender.isDiving ? 0 : runCycle * 5; // Legs together during dive
      
      // Left leg (streamlined behind during dive)
      ctx.beginPath();
      const leftLegX = defender.isDiving ? defender.x - 3 : defender.x - 5;
      const leftLegY = defender.isDiving ? drawY + 18 : drawY + 7 + legMotion;
      ctx.ellipse(leftLegX, leftLegY, defender.isDiving ? 3 : 3, defender.isDiving ? 15 : 9, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Right leg (streamlined behind during dive)
      ctx.beginPath();
      const rightLegX = defender.isDiving ? defender.x + 3 : defender.x + 5;
      const rightLegY = defender.isDiving ? drawY + 18 : drawY + 7 - legMotion;
      ctx.ellipse(rightLegX, rightLegY, defender.isDiving ? 3 : 3, defender.isDiving ? 15 : 9, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // HELMET - red team colored with face mask
      ctx.fillStyle = helmetColor;
      ctx.beginPath();
      ctx.ellipse(defender.x, drawY - 7, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Helmet shine/highlight
      ctx.fillStyle = 'hsla(0, 0%, 100%, 0.3)';
      ctx.beginPath();
      ctx.ellipse(defender.x - 3, drawY - 9, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Face mask
      ctx.strokeStyle = 'hsl(0, 0%, 80%)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(defender.x - 3, drawY - 4);
      ctx.lineTo(defender.x + 3, drawY - 4);
      ctx.moveTo(defender.x, drawY - 7);
      ctx.lineTo(defender.x, drawY - 2);
      ctx.stroke();
      
      // SHOULDER PADS
      ctx.fillStyle = jerseyColor;
      ctx.beginPath();
      ctx.ellipse(defender.x - 7, drawY - 3, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(defender.x + 7, drawY - 3, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Enhanced motion effects for forward diving defenders
      if (defender.speed > 2 || defender.isDiving) {
        ctx.fillStyle = defender.isDiving ? 'hsla(15, 80%, 45%, 0.6)' : 'hsla(15, 80%, 45%, 0.3)';
        ctx.beginPath();
        const trailLength = defender.isDiving ? 20 : 8;
        const trailWidth = defender.isDiving ? 15 : 8;
        ctx.ellipse(defender.x, drawY + 12, trailWidth, defender.isDiving ? 8 : 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Additional forward dive trail
        if (defender.isDiving) {
          ctx.fillStyle = 'hsla(0, 85%, 60%, 0.4)';
          ctx.beginPath();
          ctx.ellipse(defender.x, drawY + 25, 12, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Restore context and reset alpha
      ctx.restore();
      ctx.globalAlpha = 1.0; // Reset alpha for next defender
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
      
      // JUMP MECHANICS WITH FORWARD MOMENTUM
      
      // Update jump state with forward movement
      if (newState.player.isJumping) {
        const jumpDuration = 600; // 0.6 seconds for full jump
        const jumpProgress = Math.min(1, (currentTime - newState.player.jumpStartTime) / jumpDuration);
        
        if (jumpProgress >= 1) {
          newState.player.isJumping = false;
        } else {
          // FORWARD MOMENTUM during jump - move player forward
          const forwardDistance = 60; // Total forward distance during jump
          const forwardSpeed = (forwardDistance / jumpDuration) * (deltaTime / 16.67);
          
          // Move player upward on screen (negative Y) during jump
          newState.player.y -= forwardSpeed;
          newState.player.targetY -= forwardSpeed;
          
          // Keep player within boundaries
          newState.player.y = Math.max(25, newState.player.y);
          newState.player.targetY = Math.max(25, newState.player.targetY);
        }
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
      
      // Smooth AI movement with performance optimization and DIVE MECHANICS
      newState.defenders = newState.defenders.map(defender => {
        const dx = newState.player.x - defender.x;
        const dy = newState.player.y - defender.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update pattern timer with delta time
        defender.patternTimer += deltaTime / 16.67;
        
        // Check if defender is behind player
        const isBehindPlayer = defender.y > newState.player.y;
        
        // ONE-TIME DIVE LOGIC - Each defender can only dive once
        if (!defender.isDiving && !defender.hasDived && !defender.isDown && distance < 50 && Math.random() < 0.08) {
          defender.isDiving = true;
          defender.hasDived = true; // Mark as having attempted dive
          defender.diveStartTime = currentTime;
          // Target position AHEAD of player for forward lunge
          defender.diveTargetX = newState.player.x;
          defender.diveTargetY = newState.player.y - 40; // Dive forward past player position
        }
        
        // Update dive state with smooth forward momentum
        if (defender.isDiving) {
          const diveProgress = Math.min(1, (currentTime - defender.diveStartTime) / 600); // 0.6 second dive
          
          if (diveProgress >= 1) {
            // DIVE COMPLETE - Defender falls and stays down
            defender.isDiving = false;
            defender.isDown = true; // Defender is now on the ground permanently
          } else {
            // SMOOTH FORWARD DIVE MOTION
            const diveSpeed = 6; // Fast forward dive speed
            const targetDx = defender.diveTargetX - defender.x;
            const targetDy = defender.diveTargetY - defender.y;
            const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
            
            if (targetDistance > 2) {
              // Smooth interpolated movement toward dive target
              const lerpFactor = 0.15; // Smooth movement
              defender.x += targetDx * lerpFactor * (deltaTime / 16.67);
              defender.y += targetDy * lerpFactor * (deltaTime / 16.67);
            }
            
            // Additional forward field momentum during dive
            defender.y += newState.gameSpeed * 1.2 * (deltaTime / 16.67);
          }
        } else if (!defender.isDown) {
          // Normal AI movement when not diving
          // Performance-optimized stamina drain
          if (isBehindPlayer) {
            defender.stamina = Math.max(0, defender.stamina - 0.8 * (deltaTime / 16.67));
          } else {
            defender.stamina = Math.max(0, defender.stamina - 0.1 * (deltaTime / 16.67));
          }
          
          // Difficulty-based AI behavior
          const aiAccuracy = Math.min(0.9, 0.3 + (newState.difficultyLevel * 0.1)); // More accurate at higher levels
          const aiSpeed = 1 + (newState.difficultyLevel * 0.2); // Faster at higher levels
          
          // Calculate effective speed - 50% speed reduction when behind player
          let staminaFactor = defender.stamina <= 0 ? 0.75 : 1;
          let behindFactor = isBehindPlayer ? 0.5 : 1; // 50% speed reduction when behind
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
        } else if (defender.isDown) {
          // DEFENDER IS DOWN - Only move with field, no AI movement
          defender.y += newState.gameSpeed * (deltaTime / 16.67);
        }
          
          // Independent field movement - defenders move with field regardless of player
          // Field scrolling is completely separate from player movement
          defender.y += newState.gameSpeed * (isBehindPlayer ? 1.5 : 1) * (deltaTime / 16.67);
        }
        
        
        // TRACK WHEN PLAYER GETS IN FRONT OF DEFENDER - spawn reinforcements
        const wasBehind = defender.y < newState.player.y; // Defender was ahead of player
        const playerNowAhead = defender.y > newState.player.y + 20; // Player now ahead with buffer
        
        if (wasBehind && playerNowAhead && Math.random() < 0.8) { // 80% chance to spawn when player gets ahead
          const numberOfNewDefenders = Math.floor(Math.random() * 6) + 1; // Spawn 1-6 defenders
          
          for (let i = 0; i < numberOfNewDefenders; i++) {
            const speedVariation = 1 + (newState.difficultyLevel * 0.3) + Math.random() * 0.5;
            const spawnX = Math.random() * (canvasWidth - 40) + 20;
            const spawnY = -30 - (i * 25); // Stagger spawn positions
            
            const newDefender = getDefenderFromPool(spawnX, spawnY, 1.2 * speedVariation);
            if (newDefender) {
              newState.defenders.push(newDefender);
              newState.activeDefenderCount++;
            }
          }
        }

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
      
      // DEFENDER BEHIND PLAYER SPAWN SYSTEM
      // Check if any defender is behind the player and spawn additional defenders
      const defendersBehindPlayer = newState.defenders.filter(d => d.y > newState.player.y + 30);
      
      if (defendersBehindPlayer.length > 0 && Math.random() < 0.15) { // 15% chance when defender is behind
        const numberOfNewDefenders = Math.floor(Math.random() * 5) + 1; // Spawn 1-5 defenders
        
        for (let i = 0; i < numberOfNewDefenders; i++) {
          // Only spawn if we haven't exceeded total defender limits
          if (newState.activeDefenderCount < newState.maxDefenders + 3) { // Allow slight overflow for this feature
            const speedVariation = 1 + (newState.difficultyLevel * 0.3) + Math.random() * 0.5;
            const spawnX = Math.random() * (canvasWidth - 40) + 20;
            const spawnY = -50 - (i * 30); // Stagger spawn positions vertically
            
            const newDefender = getDefenderFromPool(spawnX, spawnY, 1.2 * speedVariation);
            if (newDefender) {
              newState.defenders.push(newDefender);
              newState.activeDefenderCount++;
            }
          }
        }
      }
      
      // Only despawn defenders that reach the bottom of the canvas
      const activeDefenders = newState.defenders.filter(d => d.y < canvasHeight + 50);
      
      // Return defenders that went off bottom to pool for memory efficiency
      newState.defenders.filter(d => d.y >= canvasHeight + 50)
        .forEach(d => returnDefenderToPool(d.id));
      
      newState.defenders = activeDefenders;
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
      
      // IMPROVED COLLISION DETECTION - Check for successful dive tackles
      if (!newState.player.isJumping) {
        const divingDefenders = newState.defenders.filter(d => d.isDiving);
        const successfulDive = divingDefenders.some(defender => {
          const dx = defender.x - newState.player.x;
          const dy = defender.y - newState.player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Successful dive collision range
          return distance < 22;
        });
        
        if (successfulDive) {
          // SUCCESSFUL DIVE ENDS GAME IMMEDIATELY
          newState.isGameOver = true;
          newState.isPlaying = false;
          setTimeout(() => setGameOverModalOpen(true), 100);
        }
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

  // JUMP MECHANIC - Double-tap or right-click for forward leap
  const handleJump = () => {
    const currentTime = Date.now();
    setGameState(prevState => {
      // Check cooldown (1.5 seconds for balanced gameplay)
      if (currentTime < prevState.player.jumpCooldownEnd) {
        return prevState; // Still on cooldown
      }
      
      // Already jumping
      if (prevState.player.isJumping) {
        return prevState;
      }
      
      return {
        ...prevState,
        player: {
          ...prevState.player,
          isJumping: true,
          jumpStartTime: currentTime,
          jumpCooldownEnd: currentTime + 1500 // 1.5 second cooldown
        }
      };
    });
  };

  // Touch handlers with double-tap jump and follow movement
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.isGameOver) {
      setGameOverModalOpen(true);
      return;
    }
    
    if (!gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
    
    const currentTime = Date.now();
    
    // DOUBLE-TAP DETECTION FOR JUMP
    if (currentTime - gameState.player.lastTapTime < 300) { // 300ms window for double tap
      handleJump();
      setGameState(prev => ({ ...prev, player: { ...prev.player, lastTapTime: 0 } }));
      return;
    }
    
    // Record tap time for double-tap detection
    setGameState(prev => ({ ...prev, player: { ...prev.player, lastTapTime: currentTime } }));
    
    const pos = getInputPosition(e);
    if (!pos) return;
    
    updatePlayerPosition(pos.x, pos.y);
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

  // Mouse handlers with right-click jump and follow movement
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState.isGameOver) {
      setGameOverModalOpen(true);
      return;
    }
    
    if (!gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
    
    // RIGHT-CLICK JUMP
    if (e.button === 2) { // Right mouse button
      handleJump();
      return;
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

  // Right-click context menu prevention
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
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
              onContextMenu={handleContextMenu}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-foreground/70 text-sm">
              Drag to move • Double-tap/Right-click for FORWARD LEAP • Time your jumps to avoid diving defenders!
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