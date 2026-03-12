/**
 * Global Background Component
 * Provides the dynamic aerial/grid background used throughout the site
 * Includes the hero drone image with overlay and grid pattern
 */

export function GlobalBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      {/* Background Image */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/LbBUqIxtVRausZSp.jpg"
        alt="Aerial drone photography background"
        className="w-full h-full object-cover opacity-20"
        aria-hidden="true"
      />
      {/* Gradient Overlay - subtle darkening for text readability */}
      <div className="absolute inset-0 bg-background/80" />
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 grid-pattern" />
    </div>
  );
}

export default GlobalBackground;
