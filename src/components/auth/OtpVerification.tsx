import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface OtpVerificationProps {
    email: string;
    onBack: () => void;
}

export function OtpVerification({ email, onBack }: OtpVerificationProps) {
    const navigate = useNavigate();
    const { verifyOtp, resendOtp } = useAuth();
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const handleVerify = async () => {
        if (otp.length !== 8) {
            toast.error('Please enter the full 8-digit code.');
            return;
        }

        setIsVerifying(true);
        const { error } = await verifyOtp(email, otp);
        setIsVerifying(false);

        if (error) {
            toast.error(error.message || 'Invalid code. Please try again.');
            return;
        }

        toast.success('Email verified! Welcome!');
        navigate('/');
    };

    const handleResend = async () => {
        setIsResending(true);
        const { error } = await resendOtp(email);
        setIsResending(false);

        if (error) {
            toast.error(error.message || 'Failed to resend code.');
            return;
        }

        toast.success('A new code has been sent to your email.');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center">
                <InputOTP maxLength={8} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                        <InputOTPSlot index={6} />
                        <InputOTPSlot index={7} />
                    </InputOTPGroup>
                </InputOTP>
            </div>

            <Button onClick={handleVerify} className="w-full" disabled={isVerifying || otp.length !== 8}>
                {isVerifying ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                    </>
                ) : (
                    'Verify Code'
                )}
            </Button>

            <div className="flex items-center justify-between text-sm">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-primary hover:underline disabled:opacity-50"
                >
                    {isResending ? 'Resending...' : 'Resend code'}
                </button>
            </div>
        </div>
    );
}
