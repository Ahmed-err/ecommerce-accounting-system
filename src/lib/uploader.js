import { useRef, useState } from "react";

const endpointFolderMap = {
  productImage: "products",
  paymentProof: "expenses",
  expenseReceipt: "expenses",
  bannerImage: "banners",
  avatar: "avatars",
  employeePhoto: "employees",
  storeImage: "store",
  reviewImage: "reviews",
};

function toErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err?.message === "string") return err.message;
  return fallback;
}

export function UploadButton({
  endpoint,
  content,
  className = "",
  onClientUploadComplete,
  onUploadError,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastFile, setLastFile] = useState(null);

  const buttonText = uploading
    ? `${content?.button?.({ ready: false }) || "Uploading"} ${progress}%`
    : content?.button?.({ ready: true }) || "Upload";

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    setLastFile(file);

    const folder = endpointFolderMap[endpoint];
    if (!folder) {
      const err = new Error(`Unknown upload endpoint: ${endpoint}`);
      onUploadError?.(err);
      setUploading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      setProgress(35);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      setProgress(80);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed, please try again");
      }

      setProgress(100);
      onClientUploadComplete?.([
        {
          url: data.url,
          publicId: data.publicId,
          serverData: data,
        },
      ]);
    } catch (error) {
      onUploadError?.(new Error(toErrorMessage(error, "Upload failed, please try again")));
    } finally {
      setTimeout(() => setProgress(0), 400);
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        className={className || "rounded-md bg-amber-500 px-3 py-2 font-semibold text-black"}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {buttonText}
      </button>
      {content?.allowedContent ? (
        <p className="text-xs text-muted-foreground">{content.allowedContent}</p>
      ) : null}
      {uploading ? (
        <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-amber-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {!uploading && lastFile ? (
        <button
          type="button"
          className="text-xs text-amber-400 hover:text-amber-300"
          onClick={() => upload(lastFile)}
        >
          Retry upload
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0] || null)}
      />
    </div>
  );
}

export function UploadDropzone(props) {
  return <UploadButton {...props} />;
}
