import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button } from '@/components/ui/button'; // Adjust import based on your setup
import { Loader2, Check } from 'lucide-react'; // Adjust import based on your setup

// Define the props interface
interface ProcessButtonProps {
  onProcess: () => Promise<void>;
}

// Define the ref interface
interface ProcessButtonRef {
  reset: () => void;
}

// Wrap the component with forwardRef
const ProcessButton = forwardRef<ProcessButtonRef, ProcessButtonProps>(({ onProcess }, ref) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'complete'>('idle');

  const handleProcess = async () => {
    if (status === 'loading' || status === 'complete') return;

    setStatus('loading');
    try {
      await onProcess();
      setStatus('complete');
    } catch (error) {
      console.error('Process failed:', error);
      setStatus('idle');
    }
  };

  const resetButton = () => {
    setStatus('idle');
  };

  // Expose the reset method to the parent via the ref
  useImperativeHandle(ref, () => ({
    reset: resetButton,
  }));

  return (
    <div className="">
      <Button
        onClick={handleProcess}
        disabled={status === 'loading'}
        className={`relative min-w-[120px] transition-all ${
          status === 'complete' ? 'bg-green-400 hover:bg-green-500 text-white' : ''
        }`}
      >
        {status === 'idle' && 'Load model'}
        {status === 'loading' && (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </>
        )}
        {status === 'complete' && (
          <>
            <Check className="mr-2 h-4 w-4" />
            Model loaded
          </>
        )}
      </Button>

      {/* The reset button is commented out, as the parent will now handle it */}
      {/* {status === "complete" && (
        <Button variant="outline" size="sm" onClick={resetButton}>
          Reset
        </Button>
      )} */}
    </div>
  );
});

export default ProcessButton;
