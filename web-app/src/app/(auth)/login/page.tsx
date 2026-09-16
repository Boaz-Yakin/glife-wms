"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Package2, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react"
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
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number. (e.g. 01012345678)")
      return
    }
    if (!password) {
      toast.error("Please enter your password.")
      return
    }

    setLoading(true)
    
    try {
      // 핸드폰 번호를 가상 이메일로 변환 (Option A 적용)
      const virtualEmail = `${phone.replace(/[^0-9]/g, "")}@glife.com`
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      })
      
      if (error) {
        toast.error("Invalid phone number or password.")
        setLoading(false)
        return
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

  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
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
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} // 숫자만 입력되도록 필터링
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
          
          <p className="px-8 text-center text-sm text-slate-500 mt-8">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
