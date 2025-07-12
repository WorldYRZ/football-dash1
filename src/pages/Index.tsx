import GameCanvas from '@/components/GameCanvas';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
            Football Dash
          </h1>
          <p className="text-xl text-foreground/80 mb-2">
            Run through defenders in this endless football adventure
          </p>
          <p className="text-foreground/60">
            Collect lightning bolts, avoid tackles, score yards!
          </p>
        </div>
        
        <GameCanvas />
      </div>
    </div>
  );
};

export default Index;
