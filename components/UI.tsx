import React from 'react';

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({children, className = ''}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${className}`}>
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
  const baseStyle = "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white hover:bg-emerald-500 shadow-md shadow-emerald-200",
    secondary: "bg-secondary text-white hover:bg-amber-500",
    outline: "border-2 border-gray-200 text-gray-600 hover:border-primary hover:text-primary bg-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${props.className}`}
  />
);

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const ProgressBar: React.FC<{current: number, max: number, color?: string}> = ({current, max, color = 'bg-primary'}) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{width: `${percent}%`}} />
    </div>
  );
}