import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: 'Login - Better CRM',
  description: 'Sign in to access your clinic workspace.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-surface-container-lowest selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      {/* Dynamic Background Elements - strictly constrained to viewport */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Avoid large blurs causing horizontal scroll */}
        <div className="absolute -left-10 top-0 h-[30vh] w-[30vw] rounded-full bg-primary/5 blur-[100px] sm:blur-[120px]" />
        <div className="absolute -right-10 bottom-0 h-[40vh] w-[40vw] rounded-full bg-secondary/5 blur-[100px] sm:blur-[120px]" />
      </div>

      <div className="relative flex w-full max-w-md flex-col justify-center px-6 mx-auto">
        <div className="animate-in flex flex-col items-center">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-primary">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
            </svg>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Sign in to manage patient lab reports
            </p>
          </div>
        </div>

        <div className="animate-in-delay-1 mt-10 rounded-3xl bg-surface p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-outline-variant/30 sm:p-8">
          <LoginForm />
        </div>
        
        <div className="animate-in-delay-2 mt-8 text-center text-xs text-on-surface-variant">
          <p>Secure clinic access portal</p>
          <p className="mt-1 opacity-70">&copy; {new Date().getFullYear()} Better CRM</p>
        </div>
      </div>
    </div>
  );
}