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
    
    // 단순 유효성 검사
    if (!phone || phone.length < 10) {
      toast.error("올바른 핸드폰 번호를 입력해주세요. (예: 01012345678)")
      return
    }
    if (!password) {
      toast.error("비밀번호를 입력해주세요.")
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
        toast.error("아이디 또는 비밀번호가 일치하지 않습니다.")
        setLoading(false)
        return
      }
      
      const role = data.user?.user_metadata?.role
      if (role === 'PICKER' || role === 'INSPECTOR') {
        await supabase.auth.signOut()
        toast.error("접근 권한 에러", {
          description: "해당 계정은 데스크탑 백오피스(어드민)에 접근할 권한이 없습니다. 모바일 앱을 이용해 주세요."
        })
        setLoading(false)
        return
      }
      
      toast.success("로그인 성공!", {
        description: "관리자 대시보드로 이동합니다."
      })
      
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error("서버 통신 오류", {
        description: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
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
              "실시간 재고 추적부터 S-Shape 최적 피킹 동선까지.<br />
              스마트한 물류 센터 운영의 새로운 표준을 경험하세요."
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
              로그인
            </h1>
            <p className="text-sm text-slate-500">
              등록된 핸드폰 번호와 비밀번호를 입력하세요.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700">핸드폰 번호</Label>
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
                  <Label htmlFor="password" className="text-slate-700">비밀번호</Label>
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
                  시스템 접속하기
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          
          <p className="px-8 text-center text-sm text-slate-500 mt-8">
            계정이 없으신가요? 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
