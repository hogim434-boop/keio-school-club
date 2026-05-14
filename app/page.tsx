import { Hero } from "@/components/hero";
import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/lib/utils";

// 랜딩 페이지 — T-010 (Phase 1.1) 에서 KCircle 본 디자인(인기 서클 카드 + 검색바 + 카테고리 탭) 으로 교체 예정
// 헤더는 app/layout.tsx 의 공통 Header 가 담당하므로 본 페이지에서는 본문만
export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center gap-20">
        <div className="flex max-w-5xl flex-1 flex-col gap-20 p-5">
          <Hero />
          <section className="flex flex-1 flex-col gap-6 px-4">
            <h2 className="mb-4 text-xl font-medium">Next steps</h2>
            {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
          </section>
        </div>

        <footer className="mx-auto flex w-full items-center justify-center gap-8 border-t py-16 text-center text-xs">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
