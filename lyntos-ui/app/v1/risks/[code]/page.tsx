import RiskDetailClient from "@/components/v1/RiskDetailClient";

export default async function RiskDetailPage({ params }: { params: any }) {
  const p = await params; // (next15) params can be Promise
  const code = ((p?.code ?? "") as string).toUpperCase();
  return <RiskDetailClient code={code} />;
}
