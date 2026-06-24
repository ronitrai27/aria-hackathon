import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Custom hook to store the authenticated Clerk user into Convex.
 * Returns:
 * - isLoading: true if auth or syncing with DB is still in progress.
 * - isAuthenticated: true if the user is authenticated and successfully stored/verified in Convex.
 * - userId: the Convex Id of the synced user record.
 */
export function useStoreUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.user.createUser);

  useEffect(() => {
    if (!isSignedIn) {
      setUserId(null);
      localStorage.removeItem("aria_clerk_user_id");
      localStorage.removeItem("aria_convex_site_url");
      localStorage.removeItem("aria_user_name");
      return;
    }

    if (user?.id) {
      localStorage.setItem("aria_clerk_user_id", user.id);
      const fullName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        user.emailAddresses?.[0]?.emailAddress ||
        "User";
      localStorage.setItem("aria_user_name", fullName);
    }
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (convexSiteUrl) {
      localStorage.setItem("aria_convex_site_url", convexSiteUrl);
    }

    const syncUser = async () => {
      try {
        const id = await storeUser();
        setUserId(id);
      } catch (error) {
        console.error("Error syncing Clerk user to Convex:", error);
      }
    };

    syncUser();
  }, [isSignedIn, user, storeUser]);

  return {
    isLoading: !isLoaded || (isSignedIn && userId === null),
    isAuthenticated: isSignedIn && userId !== null,
    userId,
  };
}
