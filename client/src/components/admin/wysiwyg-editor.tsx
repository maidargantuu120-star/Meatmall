import React, { useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { HelpTooltip } from "./help-tooltip";
import { helpIllustrations } from "@/assets/help";
import { MediaGallery } from "./media-gallery";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Undo,
  Redo,
  X,
} from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Input,
} from "@/components/ui";

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function WysiwygEditor({ content, onChange }: WysiwygEditorProps) {
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full h-auto",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () =>
    editor.chain().focus().toggleMark("underline").run();

  const setLink = () => {
    if (linkUrl) {
      // if a URL is provided, create a link
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
      setIsLinkPopoverOpen(false);
    } else {
      // if no URL is provided and a link exists, remove it
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsLinkPopoverOpen(false);
    }
  };

  const handleMediaSelect = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
    setIsMediaGalleryOpen(false);
  };

  const toggleHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const toggleBulletList = () => {
    editor.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor.chain().focus().toggleOrderedList().run();
  };

  // Text alignment will be implemented in future updates
  const alignLeft = () => {
    // Not implemented in default tiptap starter kit
    console.log("Text align left not implemented");
  };

  const alignCenter = () => {
    // Not implemented in default tiptap starter kit
    console.log("Text align center not implemented");
  };

  const alignRight = () => {
    // Not implemented in default tiptap starter kit
    console.log("Text align right not implemented");
  };

  const undo = () => {
    editor.chain().focus().undo().run();
  };

  const redo = () => {
    editor.chain().focus().redo().run();
  };

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
        <div className="flex items-center mr-2">
          <HelpTooltip
            content={
              <div>
                <p className="font-medium mb-1">Редактор үйлдлүүд:</p>
                <p className="mb-2">
                  Текстээ сонгоод дараах үйлдлүүдийг хийх боломжтой:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Текст форматлах (Bold, Italic, Underline)</li>
                  <li>Гарчиг оруулах (H1, H2)</li>
                  <li>Жагсаалт үүсгэх</li>
                  <li>Зураг оруулах</li>
                  <li>Линк оруулах</li>
                </ul>
              </div>
            }
            illustration={helpIllustrations.wysiwyg}
            size="sm"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className={editor.isActive("bold") ? "bg-gray-200" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className={editor.isActive("italic") ? "bg-gray-200" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleUnderline}
          className={editor.isActive("underline") ? "bg-gray-200" : ""}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <span className="border-r mx-1 h-6"></span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHeading(1)}
          className={
            editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
          }
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleHeading(2)}
          className={
            editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
          }
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <span className="border-r mx-1 h-6"></span>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleBulletList}
          className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleOrderedList}
          className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <span className="border-r mx-1 h-6"></span>

        <Button variant="ghost" size="sm" onClick={alignLeft}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={alignCenter}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={alignRight}>
          <AlignRight className="h-4 w-4" />
        </Button>

        <span className="border-r mx-1 h-6"></span>

        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={editor.isActive("link") ? "bg-gray-200" : ""}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="font-medium">Линк оруулах</div>
              <div className="space-y-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="URL (https://example.com)"
                />
                <div className="flex space-x-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLinkPopoverOpen(false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Цуцлах
                  </Button>
                  <Button size="sm" onClick={setLink}>
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Линк оруулах
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMediaGalleryOpen(true)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        <span className="border-r mx-1 h-6"></span>

        <Button variant="ghost" size="sm" onClick={undo}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo}>
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 min-h-[200px]"
      />

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center bg-white rounded-md shadow-lg border p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBold}
              className={editor.isActive("bold") ? "bg-gray-200" : ""}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleItalic}
              className={editor.isActive("italic") ? "bg-gray-200" : ""}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleUnderline}
              className={editor.isActive("underline") ? "bg-gray-200" : ""}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={editor.isActive("link") ? "bg-gray-200" : ""}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 space-y-4">
                  <div className="font-medium">Линк оруулах</div>
                  <div className="space-y-2">
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="URL (https://example.com)"
                    />
                    <div className="flex space-x-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLinkPopoverOpen(false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Цуцлах
                      </Button>
                      <Button size="sm" onClick={setLink}>
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Линк оруулах
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </BubbleMenu>
      )}

      {isMediaGalleryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Зургийн сан</h2>
              <div className="ml-2">
                <HelpTooltip
                  content={
                    <div>
                      <p className="font-medium mb-1">Зургийн сан:</p>
                      <p className="mb-2">
                        Контент дотор оруулах зургаа сонгоно уу:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Зураг дээр дарж сонгоно</li>
                        <li>
                          Шинэ зураг нэмэх бол "Шинэ зураг" товч дээр дарна
                        </li>
                        <li>
                          Зураг хуулагдсаны дараа "Зураг оруулах" товч дээр
                          дарна
                        </li>
                      </ul>
                    </div>
                  }
                  illustration={helpIllustrations.mediaUpload}
                  size="md"
                  side="right"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMediaGalleryOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <MediaGallery onSelect={handleMediaSelect} selectable={true} />
          </div>
        </div>
      )}
    </div>
  );
}
