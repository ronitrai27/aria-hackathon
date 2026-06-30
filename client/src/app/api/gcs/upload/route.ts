import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

// Default bucket name from user requirements
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "araia-project";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in form data" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    console.log(`[GCS Upload] Initiating upload for file: ${fileName} to bucket: ${BUCKET_NAME}`);

    // If GCS credentials are provided in the environment, run the actual SDK logic
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_CLIENT_EMAIL) {
      const storage = new Storage({
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        projectId: process.env.GCS_PROJECT_ID,
      });

      const bucket = storage.bucket(BUCKET_NAME);
      const blob = bucket.file(fileName);

      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.type,
        },
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        blobStream.on("error", (err) => reject(err));
        blobStream.on("finish", () => {
          const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
          resolve(publicUrl);
        });
        blobStream.end(buffer);
      });

      const publicUrl = await uploadPromise;
      console.log(`[GCS Upload] File successfully uploaded to GCS: ${publicUrl}`);

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully to Google Cloud Storage",
        fileName,
        bucket: BUCKET_NAME,
        url: publicUrl,
        mode: "production",
      });
    } else {
      // Fallback/Demo mode (so that it runs cleanly without crashing the demo when local credentials aren't set)
      console.log("[GCS Upload] GCS credentials not configured. Running in Demo Mode.");
      
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      const fakePublicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
      console.log(`[GCS Upload] [DEMO] Simulated successful upload to: ${fakePublicUrl}`);

      return NextResponse.json({
        success: true,
        message: "Simulated successful upload to Google Cloud Storage (Demo Mode)",
        fileName,
        bucket: BUCKET_NAME,
        url: fakePublicUrl,
        mode: "demo",
      });
    }
  } catch (error: any) {
    console.error("[GCS Upload] Error uploading file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to Google Cloud Storage" },
      { status: 500 }
    );
  }
}
