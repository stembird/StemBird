'use client';

import { DESIGN_COLOR_PRESETS } from '@/lib/cvDesign';
import { extraFieldsForTemplate } from '@/lib/cvTemplateExtras';
import type { CVDesign } from '@/types/careerDocuments';

const FONT_SIZES: Array<NonNullable<CVDesign['fontSize']>> = ['sm', 'md', 'lg'];
const SPACING = [
  { label: 'Tight', value: 1.3 },
  { label: 'Normal', value: 1.45 },
  { label: 'Relaxed', value: 1.7 },
] as const;

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-md border px-2 text-xs ${
        active ? 'border-foreground bg-foreground text-background' : 'bg-background hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export default function CVDesignToolbar({
  design,
  templateName,
  onChange,
}: {
  design: CVDesign;
  templateName?: string;
  onChange: (next: CVDesign) => void;
}) {
  const extras = extraFieldsForTemplate(templateName);
  const hidden = design.hiddenSections || [];

  const patch = (partial: Partial<CVDesign>) => onChange({ ...design, ...partial });

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/20 px-4 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Colour</span>
        {DESIGN_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => patch({ primaryColor: color })}
            className={`h-5 w-5 rounded-full border ${
              design.primaryColor === color ? 'ring-2 ring-offset-1 ring-foreground' : 'border-black/10'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          type="color"
          aria-label="Custom colour"
          value={design.primaryColor && /^#[0-9a-fA-F]{6}$/.test(design.primaryColor) ? design.primaryColor : '#111827'}
          onChange={(event) => patch({ primaryColor: event.target.value })}
          className="h-6 w-6 cursor-pointer rounded border bg-transparent p-0"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Font</span>
        <Chip active={design.fontFamily !== 'serif'} onClick={() => patch({ fontFamily: 'sans' })}>Sans</Chip>
        <Chip active={design.fontFamily === 'serif'} onClick={() => patch({ fontFamily: 'serif' })}>Serif</Chip>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Size</span>
        {FONT_SIZES.map((size) => (
          <Chip key={size} active={(design.fontSize || 'md') === size} onClick={() => patch({ fontSize: size })}>
            {size.toUpperCase()}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Spacing</span>
        {SPACING.map((option) => (
          <Chip
            key={option.value}
            active={(design.lineSpacing || 1.45) === option.value}
            onClick={() => patch({ lineSpacing: option.value })}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Show</span>
          {extras.map((field) => {
            const visible = !hidden.includes(field.key);
            return (
              <label key={field.key} className="flex items-center gap-1 text-[11px] text-foreground">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => {
                    const next = visible
                      ? [...hidden, field.key]
                      : hidden.filter((key) => key !== field.key);
                    patch({ hiddenSections: next });
                  }}
                />
                {field.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
