import React from 'react';

// Helper for parsing bold text (**text**)
const parseBold = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
};

export const MarkdownText: React.FC<{text: string, className?: string}> = ({text, className = ''}) => {
  if (!text) return null;
  const lines = text.split('\n');
  
  return (
    <div className={`space-y-1.5 text-sm leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        
        // Handle lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
           return (
             <div key={idx} className="flex gap-2 pl-1">
                <span className="text-primary mt-2 w-1.5 h-1.5 rounded-full bg-current block shrink-0"></span>
                <span className="flex-1 text-gray-700">{parseBold(trimmed.substring(2))}</span>
             </div>
           )
        }
        return <p key={idx} className="text-gray-700">{parseBold(line)}</p>;
      })}
    </div>
  );
};

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({children, className = ''}) => (
  <div className={`bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 p-5 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-5 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white hover:bg-emerald-500 shadow-lg shadow-emerald-200 hover:shadow-emerald-300",
    secondary: "bg-secondary text-white hover:bg-amber-500 shadow-lg shadow-amber-200",
    outline: "border-2 border-gray-100 text-gray-600 hover:border-primary hover:text-primary bg-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed shadow-none transform-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`w-full bg-gray-50/50 border border-gray-100 text-gray-800 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all font-medium placeholder:text-gray-400 ${props.className}`}
  />
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-primary"></div>
  </div>
);

export const ProgressBar: React.FC<{current: number, max: number, color?: string}> = ({current, max, color = 'bg-primary'}) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="h-2.5 w-full bg-gray-100/80 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700 ease-out rounded-full`} style={{width: `${percent}%`}} />
    </div>
  );
}