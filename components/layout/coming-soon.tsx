import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

// 빈 셸 페이지 공통 컴포넌트 — T-002a 에서 도입
// Phase 1.1 이후 실제 페이지 구현이 들어오기 전까지 임시로 표시
// 헤더 메뉴 클릭 시 404 가 나지 않도록 8개 페이지가 모두 이 컴포넌트로 채워짐
interface ComingSoonProps {
  /** 페이지 일본어 제목 (PRD 메뉴 구조와 일치) */
  title: string;
  /** 본 페이지가 무엇을 할지 한 줄 안내 (일본어) */
  description?: string;
  /** 실제 구현 예정 단계 (ROADMAP Task ID 포함, 예: "Phase 1.1 (T-011)") */
  plannedPhase: string;
}

export function ComingSoon({ title, description, plannedPhase }: ComingSoonProps) {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <Construction className="text-muted-foreground h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="outline" className="font-normal">
            {plannedPhase} で公開予定
          </Badge>
        </CardContent>
      </Card>
    </main>
  );
}
