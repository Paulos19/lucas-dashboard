import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  profileImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Não autorizado");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url = (file as any).ufsUrl || file.url;
      console.log("Upload de foto concluído com sucesso:", { userId: metadata.userId, url });
      return { uploadedBy: metadata.userId, url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
