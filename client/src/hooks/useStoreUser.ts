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
  const { isLoaded, isSignedIn } = useUser();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.user.createUser);

  useEffect(() => {
    if (!isSignedIn) {
      setUserId(null);
      return;
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
  }, [isSignedIn, storeUser]);

  return {
    isLoading: !isLoaded || (isSignedIn && userId === null),
    isAuthenticated: isSignedIn && userId !== null,
    userId,
  };
}
