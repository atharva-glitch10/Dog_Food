import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 px-4">
      {/* Glowing 404 */}
      <div className="relative">
        <span
          className="text-[10rem] font-black leading-none select-none"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.4))',
          }}
        >
          404
        </span>
        <div
          className="absolute inset-0 blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }}
        />
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="text-2xl font-extrabold text-white">Page Not Found</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          The page you're looking for doesn't exist, has been moved, or the URL
          contains a typo.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary text-sm py-2.5 px-5 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <Link to="/" className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2">
          <Home className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  );
};
