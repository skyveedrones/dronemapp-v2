import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('mapit-demo-banner-dismissed');
    return !dismissed;
  });

  const handleDismiss = () => {
    localStorage.setItem('mapit-demo-banner-dismissed', 'true');
    setIsVisible(false);
  };

  const handleGetStarted = () => {
    // Scroll to sign up or redirect to pricing
    window.location.href = '/pricing';
  };

  if (!isVisible) return null;

  return (
    <Card className="mb-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
      <div className="p-4 flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            Welcome to the Mapit Demo!
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            You're viewing a read-only demonstration project. Explore the media gallery, interactive GPS maps, 
            flight organization, and professional PDF reports. Sign up to upload your own drone footage and unlock all features!
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleGetStarted}
            >
              Get Started Free
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </Card>
  );
}

// Export a function to reset the banner (for testing)
export function resetDemoBanner() {
  localStorage.removeItem('mapit-demo-banner-dismissed');
}
