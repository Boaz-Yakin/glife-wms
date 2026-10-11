"use client"

import * as React from "react"
import Link from "next/link"
import { 
  User, 
  Phone, 
  Lock, 
  ShieldCheck, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  getMyProfileAction, 
  updateMyProfileAction, 
  updateMyPasswordAction, 
  MyProfileData 
} from "./actions"

export default function MyProfilePage() {
  const [profile, setProfile] = React.useState<MyProfileData | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Profile form state
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [savingProfile, setSavingProfile] = React.useState(false)

  // Password form state
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  // Fetch initial profile
  const fetchProfile = React.useCallback(async () => {
    setLoading(true)
    const res = await getMyProfileAction()
    if (res.error || !res.data) {
      toast.error(res.error || "Failed to load profile information.")
    } else {
      setProfile(res.data)
      setFirstName(res.data.first_name || "")
      setLastName(res.data.last_name || "")
      setPhone(res.data.phone || "")
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)

    const formData = new FormData()
    formData.append("first_name", firstName)
    formData.append("last_name", lastName)
    formData.append("phone", phone)

    const res = await updateMyProfileAction(formData)
    if (res.error) {
      toast.error("Update Failed: " + res.error)
    } else {
      toast.success("Account profile updated successfully!", {
        description: "If your phone number was changed, use the new number for your next sign-in.",
      })
      await fetchProfile()
    }
    setSavingProfile(false)
  }

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.")
      return
    }

    setSavingPassword(true)

    const formData = new FormData()
    formData.append("new_password", newPassword)
    formData.append("confirm_password", confirmPassword)

    const res = await updateMyPasswordAction(formData)
    if (res.error) {
      toast.error("Password Change Failed: " + res.error)
    } else {
      toast.success("Password changed successfully!")
      setNewPassword("")
      setConfirmPassword("")
    }
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        Loading account details...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Account</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal profile information and back-office credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Card 1: Basic Profile Information */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                  <CardDescription className="text-xs">
                    Update your full name and registered phone number.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {profile?.role || "USER"}
                </Badge>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  {profile?.status || "ACTIVE"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-xs font-medium">First Name</Label>
                  <Input
                    id="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={savingProfile}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-xs font-medium">Last Name</Label>
                  <Input
                    id="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={savingProfile}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-medium">Phone Number (Login ID)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="01012345678"
                    disabled={savingProfile}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Changing your phone number updates your login identifier accordingly.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium">System Virtual Account (Read-only)</Label>
                  <Input
                    id="email"
                    value={profile?.email || `${phone}@glife.com`}
                    disabled
                    className="bg-slate-50 text-slate-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Unique virtual identifier used by the internal auth system.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={savingProfile}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Profile Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card 2: Change Password */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Change Password</CardTitle>
                <CardDescription className="text-xs">
                  Update your account password to keep your back-office access secure.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-xs font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={savingPassword}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-xs font-medium">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      disabled={savingPassword}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={savingPassword || !newPassword}
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-100"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card 3: 2FA Quick Link Card */}
        <Card className="border shadow-xs bg-slate-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-800 block">Two-Factor Authentication (Google OTP)</span>
                <span className="text-xs text-muted-foreground">
                  Protect your account with Google Authenticator at zero cost.
                </span>
              </div>
            </div>
            <Button size="sm" variant="outline" render={<Link href="/settings/security" />} className="shrink-0 self-start sm:self-auto text-xs">
              Manage 2FA Settings
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
