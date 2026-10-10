"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Package2, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [phone, setPhone] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  
  // Google OTP (MFA) State
  const [mfaFactorId, setMfaFactorId] = React.useState<string | null>(null)
  const [mfaChallengeId, setMfaChallengeId] = React.useState<string | null>(null)
  const [otpCode, setOtpCode] = React.useState("")
  const [mfaLoading, setMfaLoading] = React.useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanPhone = phone.trim().replace(/[^0-9]/g, "")
    const cleanPassword = password.trim()

    // Simple validation
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid phone number. (e.g. 01012345678)")
      return
    }
    if (!cleanPassword) {
      toast.error("Please enter your password.")
      return
    }

    setLoading(true)
    
    try {
      // Convert phone number to virtual email
      const virtualEmail = `${cleanPhone}@glife.com`
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: cleanPassword,
      })
      
      if (error) {
        console.error("Login attempt failed:", error)
        toast.error(`Login Failed: ${error.message}`)
        setLoading(false)
        return
      }

      // 2단계 인증(Google OTP) 등록 여부 확인
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find(f => f.status === 'verified')
        if (totp) {
          const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
          if (chErr) {
            toast.error("2FA Setup Error: " + chErr.message)
            setLoading(false)
            return
          }
          setMfaFactorId(totp.id)
          setMfaChallengeId(challenge.id)
          setLoading(false)
          toast.info("Two-Factor Authentication Required", {
            description: "Please enter the 6-digit code from your Google Authenticator app."
          })
          return
        }
      }
      
      const role = data.user?.user_metadata?.role
      if (role === 'PICKER' || role === 'INSPECTOR') {
        await supabase.auth.signOut()
        toast.error("Access Denied", {
          description: "This account does not have permission to access the desktop back-office. Please use the mobile app."
        })
        setLoading(false)
        return
      }
      
      toast.success("Login Successful!", {
        description: "Redirecting to the dashboard."
      })
      
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error("Server Connection Error", {
        description: "A temporary error occurred. Please try again later."
      })
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = otpCode.trim().replace(/[^0-9]/g, "")

    if (!cleanCode || cleanCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code.")
      return
    }

    if (!mfaFactorId || !mfaChallengeId) {
      toast.error("2FA session expired. Please sign in again.")
      return
    }

    setMfaLoading(true)

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: cleanCode,
      })

      if (verifyError) {
        toast.error("Verification Failed", {
          description: "The code is invalid or has expired. Please try again."
        })
        setMfaLoading(false)
        return
      }

      // Check role
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.user_metadata?.role

      if (role === 'PICKER' || role === 'INSPECTOR') {
        await supabase.auth.signOut()
        toast.error("Access Denied", {
          description: "This account does not have permission to access the desktop back-office."
        })
        setMfaFactorId(null)
        setMfaChallengeId(null)
        setOtpCode("")
        setMfaLoading(false)
        return
      }

      toast.success("Verification Successful!", {
        description: "Redirecting to the dashboard."
      })

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error("An error occurred during verification.")
      setMfaLoading(false)
    }
  }

  const handleCancelMfa = async () => {
    await supabase.auth.signOut()
    setMfaFactorId(null)
    setMfaChallengeId(null)
    setOtpCode("")
    toast.info("Login attempt cancelled.")
  }

  return (
    <div translate="no" className="notranslate container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* 왼쪽 브랜딩 영역 */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-slate-900" />
        {/* 장식용 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-slate-900/20" />
        
        <div className="relative z-20 flex items-center gap-3 font-bold text-2xl tracking-tight">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <Package2 className="h-6 w-6 text-white" />
          </div>
          WMS Admin
        </div>
        
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-4">
            <p className="text-2xl font-semibold leading-relaxed text-slate-100">
              "From real-time inventory tracking to S-Shape optimized picking routes.<br />
              Experience the new standard of smart warehouse operations."
            </p>
            <footer className="text-sm text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Enterprise Grade Warehouse Management System
            </footer>
          </blockquote>
        </div>
      </div>
      
      {/* 오른쪽 로그인 폼 영역 */}
      <div className="lg:p-8 flex items-center justify-center h-full bg-background">
        {mfaFactorId ? (
          /* Step 2: Google OTP (MFA) 인증 화면 */
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[360px]">
            <div className="flex flex-col space-y-2 text-center mb-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-2 border border-blue-100 shadow-sm">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                2-Step Verification
              </h1>
              <p className="text-sm text-slate-500">
                Enter the 6-digit one-time code from your Google Authenticator app.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700 text-sm font-medium">
                  Verification Code (6-digits)
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="h-13 text-center text-3xl tracking-[0.4em] font-mono transition-all focus-visible:ring-blue-600 font-semibold"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={mfaLoading}
                />
                <p className="text-xs text-muted-foreground text-center">
                  A new one-time code is generated every 30 seconds.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center gap-2" 
                disabled={mfaLoading || otpCode.length !== 6}
              >
                {mfaLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Verify & Access System
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
                onClick={handleCancelMfa}
                disabled={mfaLoading}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Sign in with another account (Cancel)
              </Button>
            </form>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                If you lost your authenticator device or cannot verify, please contact your system administrator.
              </span>
            </div>
          </div>
        ) : (
          /* Step 1: Phone + Password Form */
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center mb-4">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Login
              </h1>
              <p className="text-sm text-slate-500">
                Please enter your registered phone number and password.
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01012345678"
                    className="h-11 transition-all focus-visible:ring-blue-600"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} // numbers only
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10 transition-all focus-visible:ring-blue-600"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Access System
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

            </form>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>2-Step Verification Supported:</strong> Accounts with Google Authenticator configured will automatically require an OTP code.
              </span>
            </div>
            
            <p className="px-8 text-center text-sm text-slate-500 mt-4">
              Don't have an account? Contact your administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
