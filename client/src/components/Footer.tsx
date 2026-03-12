import { Facebook, Twitter, Linkedin, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  onContactClick?: () => void;
}

const Footer = ({ onContactClick }: FooterProps) => {
  return (
    <footer className="bg-[#050505] border-t border-white/10 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <img 
              src="/images/mapit-logo-new.png" 
              alt="Mapit Logo" 
              className="h-10 w-auto" 
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Precision drone mapping and geospatial intelligence. Elevating project visualization for professionals worldwide.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors"><Twitter size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors"><Linkedin size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors"><Facebook size={20} /></a>
            </div>
          </div>

          {/* Product Map */}
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Mission Planning</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Data Analysis</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Cloud Storage</a></li>
              <li><a href="/pricing" className="hover:text-[#00ff88] transition-colors">Pricing Plans</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="https://www.skyveedrones.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00ff88] transition-colors">About SkyVee</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Success Stories</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-center gap-3 cursor-pointer" onClick={onContactClick}>
                <Mail size={16} className="text-[#00ff88]" />
                <a href="#" onClick={(e) => { e.preventDefault(); onContactClick?.(); }} className="hover:text-[#00ff88] transition-colors">support@skyveedrones.com</a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-[#00ff88]" />
                <span>Based in Dallas, TX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © 2026 Mapit by SkyVee Drones. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
