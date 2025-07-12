// AI Learning System for Adaptive Defensive Behavior
interface PlayerBehaviorData {
  averageX: number;
  averageY: number;
  movementPatterns: string[];
  jumpFrequency: number;
  preferredSide: 'left' | 'right' | 'center';
  reactionTime: number;
  escapeDirections: string[];
  coinCollectionPattern: string[];
  speedChanges: number[];
}

interface AILearningState {
  playerBehavior: PlayerBehaviorData;
  difficultyModifier: number;
  adaptationLevel: number;
  learningHistory: Array<{
    timestamp: number;
    playerAction: string;
    aiResponse: string;
    success: boolean;
  }>;
}

class AILearningSystem {
  private learningState: AILearningState;
  private movementHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  private jumpHistory: Array<{ timestamp: number; success: boolean }> = [];
  private collectionHistory: Array<{ x: number; y: number; type: string; timestamp: number }> = [];

  constructor() {
    this.learningState = {
      playerBehavior: {
        averageX: 200,
        averageY: 300,
        movementPatterns: [],
        jumpFrequency: 0,
        preferredSide: 'center',
        reactionTime: 500,
        escapeDirections: [],
        coinCollectionPattern: [],
        speedChanges: []
      },
      difficultyModifier: 1.0,
      adaptationLevel: 0,
      learningHistory: []
    };
  }

  // Track player movement for pattern analysis
  trackPlayerMovement(x: number, y: number, timestamp: number) {
    this.movementHistory.push({ x, y, timestamp });
    
    // Keep only recent history (last 100 movements)
    if (this.movementHistory.length > 100) {
      this.movementHistory.shift();
    }

    this.analyzeMovementPatterns();
  }

  // Track player jumps
  trackPlayerJump(timestamp: number, success: boolean) {
    this.jumpHistory.push({ timestamp, success });
    
    if (this.jumpHistory.length > 50) {
      this.jumpHistory.shift();
    }

    this.analyzeJumpPatterns();
  }

  // Track collectible collection
  trackCollectibleCollection(x: number, y: number, type: string, timestamp: number) {
    this.collectionHistory.push({ x, y, type, timestamp });
    
    if (this.collectionHistory.length > 30) {
      this.collectionHistory.shift();
    }

    this.analyzeCollectionPatterns();
  }

  // Analyze movement patterns
  private analyzeMovementPatterns() {
    if (this.movementHistory.length < 10) return;

    const recent = this.movementHistory.slice(-20);
    
    // Calculate average position
    const avgX = recent.reduce((sum, pos) => sum + pos.x, 0) / recent.length;
    const avgY = recent.reduce((sum, pos) => sum + pos.y, 0) / recent.length;
    
    this.learningState.playerBehavior.averageX = avgX;
    this.learningState.playerBehavior.averageY = avgY;

    // Determine preferred side
    if (avgX < 150) {
      this.learningState.playerBehavior.preferredSide = 'left';
    } else if (avgX > 250) {
      this.learningState.playerBehavior.preferredSide = 'right';
    } else {
      this.learningState.playerBehavior.preferredSide = 'center';
    }

    // Analyze movement directions
    const directions = [];
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].x - recent[i-1].x;
      const dy = recent[i].y - recent[i-1].y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        directions.push(dx > 0 ? 'right' : 'left');
      } else {
        directions.push(dy > 0 ? 'down' : 'up');
      }
    }

    this.learningState.playerBehavior.escapeDirections = directions.slice(-10);
  }

  // Analyze jump patterns
  private analyzeJumpPatterns() {
    if (this.jumpHistory.length < 5) return;

    const recentJumps = this.jumpHistory.slice(-10);
    const timeIntervals = [];
    
    for (let i = 1; i < recentJumps.length; i++) {
      timeIntervals.push(recentJumps[i].timestamp - recentJumps[i-1].timestamp);
    }

    this.learningState.playerBehavior.jumpFrequency = timeIntervals.length > 0 
      ? 60000 / (timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length)
      : 0;
  }

  // Analyze collection patterns
  private analyzeCollectionPatterns() {
    if (this.collectionHistory.length < 5) return;

    const patterns = this.collectionHistory.map(item => `${item.type}_${Math.floor(item.x / 50)}_${Math.floor(item.y / 50)}`);
    this.learningState.playerBehavior.coinCollectionPattern = patterns.slice(-10);
  }

  // Get adaptive AI parameters based on learned behavior
  getAdaptiveAIParams(score: number, gameTime: number) {
    const baseMultiplier = Math.min(3.0, 1.0 + (score / 500) * 0.5);
    
    // Progressive difficulty after 500 yards
    const progressiveMultiplier = score >= 500 ? 1.5 + (score - 500) / 1000 : 1.0;
    
    // Adaptation based on player behavior
    const adaptationMultiplier = 1.0 + (this.learningState.adaptationLevel * 0.1);
    
    return {
      difficultyMultiplier: baseMultiplier * progressiveMultiplier * adaptationMultiplier,
      spawnRate: score >= 500 ? Math.min(10, 5 + Math.floor((score - 500) / 200)) : 3,
      predictiveAccuracy: Math.min(0.9, 0.3 + (this.learningState.adaptationLevel * 0.1)),
      blockingBehavior: score >= 500,
      targetPrediction: this.predictPlayerMovement(),
      adaptedPatterns: this.getAdaptedMovementPatterns()
    };
  }

  // Predict where the player will move next
  private predictPlayerMovement() {
    if (this.movementHistory.length < 5) {
      return { x: this.learningState.playerBehavior.averageX, y: this.learningState.playerBehavior.averageY };
    }

    const recent = this.movementHistory.slice(-5);
    const velocityX = (recent[recent.length - 1].x - recent[0].x) / 4;
    const velocityY = (recent[recent.length - 1].y - recent[0].y) / 4;

    return {
      x: recent[recent.length - 1].x + velocityX * 2,
      y: recent[recent.length - 1].y + velocityY * 2
    };
  }

  // Get adapted movement patterns for AI
  private getAdaptedMovementPatterns() {
    const patterns = [];
    
    // Counter preferred side
    if (this.learningState.playerBehavior.preferredSide === 'left') {
      patterns.push('block_left', 'force_right');
    } else if (this.learningState.playerBehavior.preferredSide === 'right') {
      patterns.push('block_right', 'force_left');
    } else {
      patterns.push('surround', 'pincer_movement');
    }

    // Counter escape directions
    const mostCommonEscape = this.getMostCommonEscape();
    if (mostCommonEscape) {
      patterns.push(`counter_${mostCommonEscape}`);
    }

    return patterns;
  }

  private getMostCommonEscape() {
    const escapes = this.learningState.playerBehavior.escapeDirections;
    if (escapes.length === 0) return null;

    const counts = escapes.reduce((acc, dir) => {
      acc[dir] = (acc[dir] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  // Update adaptation level based on AI success
  updateAdaptation(success: boolean, playerAction: string, aiResponse: string) {
    this.learningState.learningHistory.push({
      timestamp: Date.now(),
      playerAction,
      aiResponse,
      success
    });

    if (this.learningState.learningHistory.length > 100) {
      this.learningState.learningHistory.shift();
    }

    // Calculate recent success rate
    const recentHistory = this.learningState.learningHistory.slice(-20);
    const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;

    // Adjust adaptation level
    if (successRate > 0.7) {
      this.learningState.adaptationLevel = Math.min(10, this.learningState.adaptationLevel + 0.1);
    } else if (successRate < 0.3) {
      this.learningState.adaptationLevel = Math.max(0, this.learningState.adaptationLevel - 0.05);
    }
  }

  // Get strategic positions for blocking collectibles
  getCollectibleBlockingPositions(collectibles: Array<{ x: number; y: number; type: string }>) {
    const blockingPositions = [];
    const prediction = this.predictPlayerMovement();

    for (const collectible of collectibles) {
      const distance = Math.sqrt(
        Math.pow(collectible.x - prediction.x, 2) + 
        Math.pow(collectible.y - prediction.y, 2)
      );

      // If collectible is in predicted path, create blocking position
      if (distance < 100) {
        blockingPositions.push({
          x: collectible.x + (Math.random() - 0.5) * 40,
          y: collectible.y - 30,
          priority: 1 / distance // Higher priority for closer collectibles
        });
      }
    }

    return blockingPositions.sort((a, b) => b.priority - a.priority);
  }

  // Export learning state for persistence
  exportLearningState() {
    return JSON.stringify(this.learningState);
  }

  // Import learning state from persistence
  importLearningState(stateJson: string) {
    try {
      this.learningState = JSON.parse(stateJson);
    } catch (error) {
      console.warn('Failed to import learning state:', error);
    }
  }
}

export { AILearningSystem, type PlayerBehaviorData, type AILearningState };
