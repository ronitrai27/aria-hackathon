import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="h-screen w-full  relative flex items-center justify-center overflow-hidden px-4">
      <div className="z-10 relative max-w-full">
        <SignUp
          forceRedirectUrl="/auth/callback"
          signInForceRedirectUrl="/auth/callback"
        />
      </div>
    </div>
  );
}
