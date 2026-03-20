import { useNotification } from '@/contexts/NotificationContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useNotification();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#DC143C]" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-red-800';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full ${getBackgroundColor(
            toast.type
          )}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1">
            <h3 className={`font-semibold ${getTextColor(toast.type)}`}>{toast.title}</h3>
            {toast.message && <p className={`text-sm mt-1 ${getTextColor(toast.type)}`}>{toast.message}</p>}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className={`flex-shrink-0 ${getTextColor(toast.type)} hover:opacity-70 transition-opacity`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
