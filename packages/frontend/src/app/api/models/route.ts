import { NextResponse } from "next/server";
import { getModelsData } from "../../../lib/models/getModels";

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await getModelsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Models error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
