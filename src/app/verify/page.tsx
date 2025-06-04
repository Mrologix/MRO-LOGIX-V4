"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function VerifyForm() {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  
  useEffect(() => {
    if (!userId) {
      router.push('/register');
    }
  }, [userId, router]);
  
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 6) {
      toast.error("Please enter a valid 6-digit PIN");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          pin,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      toast.success("Email verified successfully!");
      router.push('/signin');
      
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleResendPin = async () => {
    if (!userId) {
      toast.error("User ID not found");
      return;
    }
    
    try {
      const response = await fetch('/api/resend-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend PIN');
      }
      
      toast.success("New PIN sent to your email");
      
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend PIN');
    }
  };
  
  return (
    <div className="container max-w-md mx-auto py-20">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold">Verify Your Email</h1>
        <p className="text-muted-foreground">
          We&apos;ve sent a 6-digit PIN to your email address. Please enter it below to verify your account.
        </p>
        
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter 6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={6}
            className="text-center text-xl tracking-widest"
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>
        
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the PIN? <button onClick={handleResendPin} className="text-primary hover:underline cursor-pointer">Resend PIN</button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="container max-w-md mx-auto py-20 text-center">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
} 