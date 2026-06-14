import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * 회원가입 완료 안내 페이지.
 *
 * 앱 톤(일본어 + K CLUB 운영자 가입)에 맞춰 작성.
 * 기존 스타터 킷의 영어 기본 문구를 일본어로 교체.
 */
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">登録が完了しました 🎉</CardTitle>
              <CardDescription>K CLUBへようこそ！</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                アカウントの作成が完了しました。マイページからサークル・部活動の登録・管理を始めましょう。
              </p>
              {/* 다음 행동 안내 — 마이페이지로 진입 */}
              <Button asChild className="h-11 w-full rounded-full">
                <Link href="/mypage">マイページへ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
