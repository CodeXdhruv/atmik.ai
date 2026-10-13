"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdminStore } from "@/store/adminStore";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ─── Forgot Password Modal ────────────────────────────────────────────────────
function ForgotPasswordModal({
  isOpen,
  onClose,
  prefillEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefillEmail: string;
}) {
  const [resetEmail, setResetEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setSent(true);
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"
          ? "No account found with this email."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : err.message || "Failed to send reset email.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSent(false);
      setResetEmail(prefillEmail);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-primary-navy/30 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-[420px] bg-white border border-border-custom rounded-card shadow-soft p-10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-5 right-5 text-primary-navy/30 hover:text-primary-navy/70 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <AnimatePresence mode="wait">
                {sent ? (
                  /* ── Success state ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-5">
                      <CheckCircle size={28} className="text-green-500" />
                    </div>
                    <h3 className="font-heading text-xl font-extrabold text-primary-navy mb-2">
                      Check your inbox
                    </h3>
                    <p className="font-ui text-sm text-primary-navy/55 font-medium leading-relaxed">
                      A password reset link has been sent to{" "}
                      <span className="font-bold text-primary-navy/80">{resetEmail}</span>.
                      {" "}Check your spam folder if you don&apos;t see it.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-8 w-full py-3.5 bg-primary-navy text-white rounded-button text-sm font-bold font-ui shadow-soft hover:bg-primary-navy/90 cursor-pointer transition-all duration-200"
                    >
                      Back to Sign In
                    </button>
                  </motion.div>
                ) : (
                  /* ── Reset form ── */
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Header */}
                    <div className="mb-7 text-center">
                      <div className="w-12 h-12 rounded-full bg-accent-gold/10 flex items-center justify-center mx-auto mb-4">
                        <Mail size={22} className="text-accent-gold" />
                      </div>
                      <h3 className="font-heading text-xl font-extrabold text-primary-navy">
                        Forgot your password?
                      </h3>
                      <p className="font-ui text-sm text-primary-navy/55 mt-1.5 font-medium">
                        Enter your admin email and we&apos;ll send you a reset link.
                      </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary-navy/80 uppercase tracking-wide font-ui">
                          Email Address
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-primary-navy/40">
                            <Mail size={17} />
                          </span>
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="admin@gmail.com"
                            className="w-full pl-11 pr-4 py-3.5 bg-background border border-border-custom rounded-input text-sm font-semibold text-primary-navy placeholder-primary-navy/40 focus:border-accent-gold/40 outline-none transition-colors font-ui"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-primary-navy text-white rounded-button text-sm font-bold font-ui shadow-soft hover:bg-primary-navy/90 cursor-pointer transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-60"
                      >
                        {loading ? "Sending…" : "Send Reset Link"}
                      </button>
                    </form>

                    <button
                      onClick={handleClose}
                      className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-primary-navy/50 hover:text-primary-navy/80 transition-colors cursor-pointer font-ui"
                    >
                      <ArrowLeft size={13} />
                      Back to Sign In
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { login } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const token = await user.getIdToken();
      const res = await fetch('https://atmik-ai-backend.swatantra-backend.workers.dev/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        await signOut(auth);
        const serverMsg = data?.error || `Server error (${res.status})`;
        throw new Error(serverMsg);
      }

      if (data.role !== 'ADMIN') {
        await signOut(auth);
        throw new Error("Access denied: this account does not have admin privileges.");
      }

      login({
        id: data.id,
        name: user.email?.split('@')[0] || "Admin",
        email: user.email || "",
        role: data.role as 'ADMIN' | 'USER',
        token: token
      });

      toast.success("Login successful!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 select-none">
      <Toaster position="top-right" />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        prefillEmail={email}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[485px] bg-white border border-border-custom rounded-card shadow-soft p-12"
      >
        <div className="mb-9 flex flex-col items-center text-center">
          {/* Logo Section */}
          <div className="flex items-center justify-center mb-8">
            <h1 className="font-logo text-5xl text-black tracking-wide" style={{ fontFamily: 'Samarkan, serif' }}>
              Atmik AI
            </h1>
          </div>

          <h3 className="font-heading text-2xl font-extrabold text-primary-navy leading-tight">
            Sign in to your account
          </h3>
          <p className="font-ui text-sm text-primary-navy/55 mt-2 font-medium">
            Enter your credentials to access the admin panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-navy/80 uppercase tracking-wide font-ui">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-primary-navy/40">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                className="w-full pl-11 pr-4 py-3.5 bg-background border border-border-custom rounded-input text-sm font-semibold text-primary-navy placeholder-primary-navy/40 focus:border-accent-gold/40 outline-none transition-colors font-ui"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary-navy/80 uppercase tracking-wide font-ui">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-primary-navy/40">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3.5 bg-background border border-border-custom rounded-input text-sm font-semibold text-primary-navy placeholder-primary-navy/40 focus:border-accent-gold/40 outline-none transition-colors font-ui"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary-navy/40 hover:text-primary-navy/70 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-accent-gold hover:underline font-bold font-ui cursor-pointer bg-transparent border-none p-0"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember_me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border-custom text-primary-navy focus:ring-accent-gold cursor-pointer"
            />
            <label htmlFor="remember_me" className="ml-3 text-sm font-semibold text-primary-navy/70 font-ui cursor-pointer select-none">
              Remember me
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-navy text-white hover:bg-primary-navy/90 rounded-button text-sm font-bold font-ui shadow-soft hover:shadow-md cursor-pointer transition-all duration-200 flex justify-center items-center gap-2"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4">
          {/* Demo Login Button Removed for Security */}
        </div>

        <p className="text-xs text-center font-semibold text-primary-navy/55 mt-10 font-ui">
          Don&apos;t have an account? <a href="#" className="text-accent-gold font-bold hover:underline">Contact Super Admin</a>
        </p>
      </motion.div>
    </div>
  );
}
