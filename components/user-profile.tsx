"use client";

import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Identity = {
  id: string;
  provider: string;
  identity_data?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
};

export function UserProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [identities, setIdentities] = useState<Identity[]>([]);

  useEffect(() => {
    if (user) {
      // Get current identities from user object
      const userIdentities = (user.identities || []) as Identity[];
      setIdentities(userIdentities);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      google: "Google",
      keycloak: "Keycloak",
      email: "Email",
    };
    return names[provider] || provider;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">請先登入</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>個人資訊</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={user.email}
            />
            <AvatarFallback>
              {user.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">
              {user.user_metadata?.name || user.email}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Identity Section */}
        {/* <div className="space-y-3">
          <div className="space-y-2">
            {identities.length > 0 ? (
              identities.map((identity) => (
                <div
                  key={identity.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getProviderDisplayName(identity.provider)}
                    </Badge>
                    {identity.identity_data?.email && (
                      <span className="text-sm text-muted-foreground">
                        {identity.identity_data.email}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    已綁定
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                目前沒有已綁定的帳號
              </p>
            )}
          </div>
        </div> */}

        <Button variant="destructive" onClick={handleLogout} className="w-full">
          登出
        </Button>
      </CardContent>
    </Card>
  );
}
