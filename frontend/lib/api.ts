const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function generateCarousel(topic: string, brandId?: string) {
  const res = await fetch(`${BASE}/api/carousel/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, brand_id: brandId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getCarouselStatus(jobId: string) {
  const res = await fetch(`${BASE}/api/carousel/status/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
