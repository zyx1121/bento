"use client";

import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export default function HeaderBar() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/api/auth/callback`,
      },
    });
  };

  const handleAvatarClick = () => {
    router.push("/me");
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Navigation links */}
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              訂單
            </Link>
            <Link href="/restaurant" className="font-semibold text-lg">
              店家
            </Link>
          </nav>

          {/* Right side - User area */}
          <div className="flex items-center">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <button
                onClick={handleAvatarClick}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                <Avatar>
                  <AvatarImage
                    src={user.user_metadata?.avatar_url}
                    alt={user.email}
                  />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <Button
                onClick={handleLogin}
                className="animate-in fade-in duration-200"
              >
                登入
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
