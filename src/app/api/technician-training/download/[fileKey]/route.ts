import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getTechnicianTrainingFile } from "@/lib/s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  const { fileKey } = await params;
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = await getTechnicianTrainingFile(fileKey);
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Create a new response with the file
    const response = new NextResponse(file as any);
    
    // Set appropriate headers
    response.headers.set("Content-Type", "application/octet-stream");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${fileKey.split("/").pop()}"`
    );

    return response;
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 