import { useRef, useState } from "react";
import styled from "styled-components";
import { uploadFiles } from "@/api";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Label = styled.div`
  font-size: 13px;
  color: rgba(186, 206, 255, 0.85);
`;

const DropZone = styled.div<{ $active: boolean }>`
  border: 1px dashed ${({ $active }) => ($active ? "#4ade80" : "rgba(48, 97, 219, 0.4)")};
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: ${({ $active }) => ($active ? "rgba(74, 222, 128, 0.08)" : "rgba(8, 14, 28, 0.5)")};
  transition: all 0.2s;

  &:hover {
    border-color: rgba(48, 97, 219, 0.7);
    background: rgba(48, 97, 219, 0.06);
  }

  input {
    display: none;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: rgba(186, 206, 255, 0.55);
  }
`;

const Preview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Thumb = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(48, 97, 219, 0.25);
  background: #0a0f1e;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.4);
    color: white;
    font-size: 20px;
    pointer-events: none;
  }
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(255, 80, 80, 0.6);
  }
`;

const Uploading = styled.div`
  font-size: 12px;
  color: #4ade80;
  text-align: center;
`;

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
};

export default function MediaUpload({ value, onChange, label }: Props) {
  const [active, setActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (selected.length === 0) return;

    setUploading(true);
    try {
      const urls = await uploadFiles(selected);
      onChange([...value, ...urls]);
    } catch (e: any) {
      alert(e.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  const isVideo = (url: string) => url.match(/\.(mp4|webm|mov|avi)$/i);

  return (
    <Wrapper>
      {label && <Label>{label}</Label>}
      <DropZone
        $active={active}
        onDragOver={(e) => { e.preventDefault(); setActive(true); }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => { e.preventDefault(); setActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Uploading>上传中…</Uploading>
        ) : (
          <p>拖拽图片/视频到此处，或点击选择文件</p>
        )}
      </DropZone>
      {value.length > 0 && (
        <Preview>
          {value.map((url, idx) => (
            <Thumb key={idx}>
              {isVideo(url) ? (
                <>
                  <video src={url} />
                  <div className="play-icon">▶</div>
                </>
              ) : (
                <img src={url} />
              )}
              <RemoveBtn onClick={() => remove(idx)}>×</RemoveBtn>
            </Thumb>
          ))}
        </Preview>
      )}
    </Wrapper>
  );
}
