import { NextResponse } from "next/server";
import { apiClient } from "@/lib/apiClient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await apiClient.get<any>(`/overview/search?q=${encodeURIComponent(q)}`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search" },
      { status: 500 }
    );
  }
}
