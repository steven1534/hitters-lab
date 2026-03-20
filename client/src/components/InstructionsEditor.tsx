import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Type, List, ListOrdered, Heading2 } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface InstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function InstructionsEditor({ value, onChange, onSave, isSaving }: InstructionsEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'text';
    
    const newText = 
      value.substring(0, start) + 
      before + selectedText + after + 
      value.substring(end);
    
    onChange(newText);

    // Restore cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + before.length + selectedText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const formatters = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertMarkdown('**', '**'),
      shortcut: 'Ctrl+B',
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => insertMarkdown('*', '*'),
      shortcut: 'Ctrl+I',
    },
    {
      icon: Underline,
      label: 'Underline',
      action: () => insertMarkdown('<u>', '</u>'),
      shortcut: 'Ctrl+U',
    },
    {
      icon: Heading2,
      label: 'Heading',
      action: () => insertMarkdown('## ', ''),
      shortcut: 'Ctrl+H',
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => insertMarkdown('- ', ''),
      shortcut: 'Ctrl+L',
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => insertMarkdown('1. ', ''),
      shortcut: 'Ctrl+Shift+L',
    },
  ];

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px'];

  const insertFontSize = (size: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'text';
    
    const newText = 
      value.substring(0, start) + 
      `<span style="font-size: ${size}">` + selectedText + '</span>' +
      value.substring(end);
    
    onChange(newText);
  };

  return (
    <div className="space-y-3">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg border border-border">
        <div className="flex gap-1 flex-wrap">
          {formatters.map((formatter) => {
            const Icon = formatter.icon;
            return (
              <Button
                key={formatter.label}
                variant="outline"
                size="sm"
                onClick={formatter.action}
                title={`${formatter.label} (${formatter.shortcut})`}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        {/* Font Size Dropdown */}
        <div className="flex gap-1 border-l border-border pl-2 ml-2">
          <select
            onChange={(e) => insertFontSize(e.target.value)}
            defaultValue="16px"
            className="h-8 px-2 text-sm border border-border rounded bg-background"
            title="Font size"
          >
            <option value="" disabled>
              Font Size
            </option>
            {fontSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Preview Toggle */}
        <div className="flex gap-1 border-l border-border pl-2 ml-auto">
          <Button
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        placeholder="Enter drill instructions here. You can format the text as you want."
        className="w-full min-h-[250px] p-4 border-2 border-dashed border-primary rounded-lg bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      />

      {/* Live Preview */}
      {showPreview && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Preview:</h4>
          <div className="p-4 bg-muted rounded-lg border border-border min-h-[120px]">
            <Streamdown>{value || '(empty)'}</Streamdown>
          </div>
        </div>
      )}

      {/* Formatting Help */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
        <p className="font-semibold">Markdown Syntax:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><code className="bg-background px-1 rounded">**text**</code> for bold</li>
          <li><code className="bg-background px-1 rounded">*text*</code> for italic</li>
          <li><code className="bg-background px-1 rounded">## Heading</code> for headings</li>
          <li><code className="bg-background px-1 rounded">- item</code> for bullet lists</li>
        </ul>
      </div>
    </div>
  );
}
