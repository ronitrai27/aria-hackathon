"use client";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStoreUser } from "@/hooks/useStoreUser";
import { useUserStore } from "@/hooks/useUserStore";
import OnboardCard from "@/modules/auth/OnboardCard";
import { api } from "../../../../../convex/_generated/api";

const AuthCallback = () => {
  const { isAuthenticated, isLoading: isStoreLoading } = useStoreUser();
  const router = useRouter();
  const user = useQuery(api.user.getCurrentUser);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // Wait for syncing to finish
    if (isStoreLoading) return;

    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    if (user === undefined) return;

    if (user !== null) {
      setUser(user);
      router.push("/home/agent");
    } else {
      router.push("/");
    }
  }, [isStoreLoading, isAuthenticated, user, router, setUser]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <OnboardCard
        duration={3000}
        step1="Welcome Aboard"
        step2="Creating Environment"
        step3="Checking auth-token"
      />
    </div>
  );
};

export default AuthCallback;
