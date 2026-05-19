"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// 오픈 리다이렉트 방지: next 파라미터는 안전한 상대 경로일 때만 사용
// 외부 URL(https://evil.com)이나 protocol-relative URL(//evil.com)은 차단
function sanitizeNext(rawNext: string | null): string | null {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/")) return null;
  if (rawNext.startsWith("//")) return null;
  return rawNext;
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // 로그인 전 가려던 경로(?next=)가 있으면 그곳으로, 없으면 서클 목록으로 이동
      const next = sanitizeNext(searchParams.get("next"));
      router.push(next ?? "/circles");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>メールアドレスとパスワードでログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">パスワード</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    パスワードをお忘れですか?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              アカウントをお持ちでないですか?{" "}
              <Link
                href="/auth/sign-up"
                className="text-foreground font-semibold underline underline-offset-4"
              >
                新規登録
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
