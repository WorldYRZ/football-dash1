import GameCanvas from '@/components/GameCanvas';
import GameNav from '@/components/GameNav';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted relative scanlines">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-pixel text-primary mb-6 tracking-wider uppercase neon-text animate-neon-pulse">
            Football Dash
          </h1>
          <div className="arcade-panel p-4 mb-4 mx-auto max-w-md">
            <p className="text-sm font-pixel text-accent mb-2 uppercase">
              {'>> Retro Football Adventure <<'}
            </p>
            <p className="text-xs font-pixel text-muted-foreground">
              Dodge defenders • Collect power-ups • Score big!
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <GameNav />
          <GameCanvas />
        </div>
      </div>
    </div>
  );
};

export default Index;
