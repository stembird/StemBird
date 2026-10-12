"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";
import "react-quill-new/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] rounded-md border border-input bg-background p-4 text-muted-foreground">
      Loading editor...
    </div>
  )
});

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter content here...",
  label,
  required = false,
  className = "",
}: RichTextEditorProps) => {
  const [editorValue, setEditorValue] = useState(value);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleChange = (content: string) => {
    setEditorValue(content);
    onChange(content);
  };

  // Define toolbar options with more formatting options
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "link",
    "image",
    "blockquote",
    "code",
    "code-block"
  ];

  if (!isMounted) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <div className="min-h-[200px] rounded-md border border-input bg-background p-4 text-muted-foreground">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="rounded-md border border-input bg-background">
        <ReactQuill
          theme="snow"
          value={editorValue}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="min-h-[200px]"
        />
      </div>
    </div>
  );
};

export default RichTextEditor;