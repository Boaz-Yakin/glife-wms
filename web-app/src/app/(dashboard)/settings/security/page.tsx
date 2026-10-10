"use client"

import * as React from "react"
import { 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  QrCode, 
  KeyRound, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  Info
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

interface TotpFactor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
}

export default function SecuritySettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [factors, setFactors] = React.useState<TotpFactor[]>([])
  
  // Enrollment dialog state
  const [enrollDialogOpen, setEnrollDialogOpen] = React.useState(false)
  const [enrolling, setEnrolling] = React.useState(false)
  const [enrollData, setEnrollData] = React.useState<{
    id: string
    qrCode: string
    secret: string
  } | null>(null)
  const [verifyCode, setVerifyCode] = React.useState("")
  const [verifying, setVerifying] = React.useState(false)
  const [copiedSecret, setCopiedSecret] = React.useState(false)

  // Unenroll dialog state
  const [unenrollFactorId, setUnenrollFactorId] = React.useState<string | null>(null)
  const [unenrolling, setUnenrolling] = React.useState(false)

  // Fetch factors
  const loadFactors = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        toast.error("Failed to load 2FA factors: " + error.message)
      } else {
        const totpList = (data.totp || []) as TotpFactor[]
        setFactors(totpList)
      }
    } catch (err: any) {
      toast.error("An error occurred while loading security settings.")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  React.useEffect(() => {
    loadFactors()
  }, [loadFactors])

  // Start enrollment
  const handleStartEnroll = async () => {
    setEnrolling(true)
    setEnrollDialogOpen(true)
    setVerifyCode("")
    setEnrollData(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Glife WMS Backoffice",
        issuer: "Glife WMS",
      })

      if (error) {
        toast.error("Failed to generate OTP setup: " + error.message)
        setEnrollDialogOpen(false)
        return
      }

      setEnrollData({
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      })
    } catch (err: any) {
      toast.error("An unexpected error occurred during OTP enrollment.")
      setEnrollDialogOpen(false)
    } finally {
      setEnrolling(false)
    }
  }

  // Verify and activate enrollment
  const handleConfirmEnroll = async () => {
    const code = verifyCode.trim().replace(/[^0-9]/g, "")
    if (code.length !== 6 || !enrollData) {
      toast.error("Please enter the 6-digit verification code.")
      return
    }

    setVerifying(true)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      })

      if (challengeError) {
        toast.error("Challenge creation failed: " + challengeError.message)
        setVerifying(false)
        return
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challenge.id,
        code: code,
      })

      if (verifyError) {
        toast.error("Verification failed: Incorrect code. Check the code in your app.")
        setVerifying(false)
        return
      }

      toast.success("Google Authenticator successfully enrolled!", {
        description: "A 2-step verification code will be required on your next login.",
      })
      setEnrollDialogOpen(false)
      setEnrollData(null)
      loadFactors()
    } catch (err: any) {
      toast.error("An error occurred during verification.")
    } finally {
      setVerifying(false)
    }
  }

  // Unenroll factor
  const handleConfirmUnenroll = async () => {
    if (!unenrollFactorId) return
    setUnenrolling(true)

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: unenrollFactorId,
      })

      if (error) {
        toast.error("Failed to disable 2FA: " + error.message)
      } else {
        toast.success("Two-factor authentication has been disabled.")
        setUnenrollFactorId(null)
        loadFactors()
      }
    } catch (err: any) {
      toast.error("An error occurred while removing the authenticator.")
    } finally {
      setUnenrolling(false)
    }
  }

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret)
    setCopiedSecret(true)
    toast.info("Secret key copied to clipboard.")
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const activeFactor = factors.find((f) => f.status === "verified")

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security & 2-Factor Authentication</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure two-step verification using Google Authenticator to protect your account.
        </p>
      </div>

      {/* Main OTP Status Card */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${activeFactor ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Authenticator (TOTP)</CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Zero SMS cost. Generates time-based one-time passwords directly on your phone.
                </CardDescription>
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : activeFactor ? (
              <Badge className="bg-emerald-600 text-white font-medium hover:bg-emerald-700">Active</Badge>
            ) : (
              <Badge variant="secondary" className="text-slate-600 font-medium">Inactive</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-6 flex justify-center text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Checking security status...
            </div>
          ) : activeFactor ? (
            <div className="rounded-lg border bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-800">
                      {activeFactor.friendly_name || "Google Authenticator"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enrolled: {new Date(activeFactor.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive self-start sm:self-auto text-xs"
                  onClick={() => setUnenrollFactorId(activeFactor.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Disable 2FA
                </Button>
              </div>
              <p className="text-xs text-emerald-700 bg-emerald-50/80 p-2.5 rounded-md border border-emerald-100 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                Two-step verification is active. You will be prompted for your 6-digit code upon sign in.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-semibold text-slate-800">Two-Factor Authentication is not yet set up.</p>
                <p className="text-xs text-muted-foreground">
                  Adding an authenticator app adds an extra layer of defense against unauthorized account access.
                </p>
              </div>
              <Button 
                onClick={handleStartEnroll} 
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Set Up Google Authenticator (Scan QR)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guide & Benefit Card */}
      <Card className="border shadow-sm bg-slate-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Key Advantages of App-Based Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border shadow-2xs space-y-1">
              <span className="font-semibold text-slate-900 block">💰 Zero Carrier Fees</span>
              <p className="text-muted-foreground">
                Unlike SMS text messages that charge per delivery, TOTP algorithms run on-device with zero messaging costs.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-2xs space-y-1">
              <span className="font-semibold text-slate-900 block">📶 Works Offline</span>
              <p className="text-muted-foreground">
                Codes are generated locally on your smartphone every 30 seconds, even in dead zones or airplane mode.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-2xs space-y-1">
              <span className="font-semibold text-slate-900 block">🛡️ Robust Security Standard</span>
              <p className="text-muted-foreground">
                Protected against SIM-swapping attacks using standard RFC 6238 time-synchronized cryptographic hashes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              Set Up Google Authenticator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Open your authenticator app on your phone and follow the instructions below.
            </DialogDescription>
          </DialogHeader>

          {enrolling || !enrollData ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
              Generating setup key...
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Step 1 */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">1</span>
                  Scan this QR code with Google Authenticator
                </div>
                
                <div className="flex justify-center p-3 bg-white border rounded-xl shadow-2xs">
                  <img
                    src={enrollData.qrCode}
                    alt="Google OTP QR Code"
                    className="w-48 h-48 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block text-center">
                    Can't scan? Enter this secret key manually:
                  </span>
                  <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-md font-mono text-xs justify-between">
                    <span className="truncate tracking-wider text-slate-700">{enrollData.secret}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleCopySecret(enrollData.secret)}
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">2</span>
                  Enter the 6-digit verification code from the app
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="enroll-verify" className="text-xs text-slate-600">6-Digit Code</Label>
                  <Input
                    id="enroll-verify"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    className="h-11 text-center text-2xl tracking-[0.3em] font-mono font-semibold"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ""))}
                    disabled={verifying}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEnrollDialogOpen(false)}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConfirmEnroll}
              disabled={verifying || verifyCode.trim().length !== 6}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Verifying...
                </>
              ) : (
                "Verify & Activate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <Dialog open={!!unenrollFactorId} onOpenChange={(open) => !open && setUnenrollFactorId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disabling Google Authenticator will remove the 2-step verification requirement, leaving your account protected by password only. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnenrollFactorId(null)}
              disabled={unenrolling}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmUnenroll}
              disabled={unenrolling}
            >
              {unenrolling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Disabling...
                </>
              ) : (
                "Confirm Disable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
