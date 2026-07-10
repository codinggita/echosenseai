import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadImageToStorage } from '../../lib/storage';
import { toast } from 'sonner';
import { Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';

const Section = ({ title, description, children }) => (
  <div className="mb-8">
    <div className="mb-4">
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export default function BrandingSidebar({ config, onChange, businessId }) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const path = `businesses/${businessId}/assets/logo_${Date.now()}`;
      const url = await uploadImageToStorage(file, path);
      onChange('logoUrl', url);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fonts = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Outfit', value: 'Outfit, sans-serif' },
    { label: 'System UI', value: 'system-ui, sans-serif' },
    { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  ];

  return (
    <div className="pb-10">
      
      {/* 1. Identity */}
      <Section title="Organization Identity" description="Basic information about your organization.">
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-dashed border-border bg-secondary/50 flex items-center justify-center overflow-hidden relative shrink-0">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                className="hidden" 
                accept="image/*"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="w-full text-xs">
                  <UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload Logo
                </Button>
                {config.logoUrl && (
                  <Button variant="outline" size="sm" onClick={() => onChange('logoUrl', '')} className="px-2 text-destructive hover:bg-destructive/10">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG up to 2MB.</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Organization Name</Label>
          <Input 
            value={config.orgName || ''} 
            onChange={(e) => onChange('orgName', e.target.value)} 
            placeholder="e.g. Acme Corp" 
          />
        </div>
      </Section>
      
      <hr className="border-border/40 my-6" />

      {/* 2. Brand Theme */}
      <Section title="Brand Theme" description="Colors used across the kiosk interface.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Primary Accent</Label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.primaryColor?.startsWith('#') ? config.primaryColor : '#0f172a'} 
                onChange={(e) => {
                  onChange('primaryColor', e.target.value);
                  onChange('accentColor', e.target.value);
                }}
                className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" 
              />
              <Input 
                value={config.primaryColor || ''} 
                onChange={(e) => {
                  onChange('primaryColor', e.target.value);
                  onChange('accentColor', e.target.value);
                }}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.backgroundColor?.startsWith('#') ? config.backgroundColor : '#ffffff'} 
                onChange={(e) => onChange('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" 
              />
              <Input 
                value={config.backgroundColor || ''} 
                onChange={(e) => onChange('backgroundColor', e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Surface (Cards)</Label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.surfaceColor?.startsWith('#') ? config.surfaceColor : '#ffffff'} 
                onChange={(e) => onChange('surfaceColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" 
              />
              <Input 
                value={config.surfaceColor || ''} 
                onChange={(e) => onChange('surfaceColor', e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Text Color</Label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.textColor?.startsWith('#') ? config.textColor : '#0f172a'} 
                onChange={(e) => onChange('textColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" 
              />
              <Input 
                value={config.textColor || ''} 
                onChange={(e) => onChange('textColor', e.target.value)}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>
        </div>
      </Section>

      <hr className="border-border/40 my-6" />

      {/* 3. Typography */}
      <Section title="Typography & Styling" description="Global layout properties.">
        <div className="space-y-2">
          <Label>Body Font</Label>
          <select 
            value={config.bodyFont || 'Inter, sans-serif'} 
            onChange={(e) => onChange('bodyFont', e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {fonts.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Border Radius</Label>
          <select 
            value={config.borderRadius || '0.75rem'} 
            onChange={(e) => onChange('borderRadius', e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="0rem">None (Square)</option>
            <option value="0.375rem">Small</option>
            <option value="0.75rem">Medium</option>
            <option value="1.5rem">Large</option>
            <option value="9999px">Full (Pill)</option>
          </select>
        </div>
      </Section>

      <hr className="border-border/40 my-6" />

      {/* 4. Welcome Screen */}
      <Section title="Welcome Screen" description="The first screen customers see.">
        <div className="space-y-2">
          <Label>Headline</Label>
          <Input 
            value={config.kioskTitle || ''} 
            onChange={(e) => onChange('kioskTitle', e.target.value)} 
            placeholder="How was your experience?" 
          />
        </div>
        <div className="space-y-2">
          <Label>Subheadline</Label>
          <Input 
            value={config.kioskMessage || ''} 
            onChange={(e) => onChange('kioskMessage', e.target.value)} 
            placeholder="Tap the microphone and speak briefly." 
          />
        </div>
      </Section>

      <hr className="border-border/40 my-6" />

      {/* 5. Thank You Screen */}
      <Section title="Thank You Screen" description="Displayed after successful submission.">
        <div className="space-y-2">
          <Label>Headline</Label>
          <Input 
            value={config.thankyouHeadline || ''} 
            onChange={(e) => onChange('thankyouHeadline', e.target.value)} 
            placeholder="Thank you!" 
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={config.thankyouDescription || ''} 
            onChange={(e) => onChange('thankyouDescription', e.target.value)} 
            placeholder="Your feedback has been securely analyzed." 
            className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
          />
        </div>
        
        <div className="flex items-start md:items-center justify-between p-4 border border-border rounded-lg bg-secondary/30 flex-col md:flex-row gap-4 mt-6">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Request Customer Contact</Label>
            <p className="text-xs text-muted-foreground w-full max-w-xs">Ask customers for their email or phone number for follow-ups.</p>
          </div>
          <div 
            onClick={() => onChange('collectContact', !config.collectContact)}
            className={`flex-shrink-0 h-6 w-11 rounded-full relative cursor-pointer transition-colors duration-200 border ${config.collectContact ? 'bg-primary border-primary' : 'bg-secondary border-border'}`}
          >
            <div className={`absolute top-[1px] w-4 h-4 rounded-full bg-background transition-all duration-200 shadow-sm ${config.collectContact ? 'left-[22px]' : 'left-[2px]'}`}></div>
          </div>
        </div>
      </Section>
    </div>
  );
}
