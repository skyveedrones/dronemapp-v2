import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface DemoTourProps {
  onComplete?: () => void;
}

export function DemoTour({ onComplete }: DemoTourProps) {
  useEffect(() => {
    // Check if user has already seen the tour
    const hasSeenTour = localStorage.getItem('mapit-demo-tour-seen');
    if (hasSeenTour) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        steps: [
          {
            element: '#demo-welcome',
            popover: {
              title: 'Welcome to MAPIT Demo!',
              description: 'Take a quick tour to see how MAPIT helps you organize and analyze drone footage with GPS mapping.',
              side: 'bottom',
              align: 'start'
            }
          },
          {
            element: '#media-gallery',
            popover: {
              title: 'Media Gallery',
              description: 'View all your drone photos and videos in one place. Each item shows GPS location, capture time, and file details.',
              side: 'top',
              align: 'start'
            }
          },
          {
            element: '#project-map',
            popover: {
              title: 'Interactive GPS Map',
              description: 'See exactly where each photo was taken. Click markers to view photos, and watch flight paths automatically connect your GPS points.',
              side: 'left',
              align: 'start'
            }
          },
          {
            element: '#project-actions',
            popover: {
              title: 'Project Actions',
              description: 'Generate professional PDF reports, export GPS data in multiple formats (KML, GPX, CSV), and manage your project settings.',
              side: 'bottom',
              align: 'end'
            }
          },
          {
            element: '#flight-list',
            popover: {
              title: 'Flight Organization',
              description: 'Organize media by flight sessions. Track pilot info, flight dates, and LAANC authorizations for each mission.',
              side: 'right',
              align: 'start'
            }
          },
          {
            popover: {
              title: 'Ready to Get Started?',
              description: 'Sign up now to upload your own drone footage, create unlimited projects, and unlock all features. This demo is read-only, but your account will have full access!',
              side: 'top',
              align: 'center'
            }
          }
        ],
        onDestroyStarted: () => {
          // Mark tour as seen
          localStorage.setItem('mapit-demo-tour-seen', 'true');
          if (onComplete) onComplete();
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return null;
}

// Export a function to reset the tour (for testing or user request)
export function resetDemoTour() {
  localStorage.removeItem('mapit-demo-tour-seen');
}
