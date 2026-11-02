"use client";

import * as React from "react";
import { Camera, Check, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AvatarUploaderProps {
  value: string;
  onChange: (url: string) => void;
  name?: string | null;
}

export function AvatarUploader({ value, onChange, name }: AvatarUploaderProps) {
  const [showInput, setShowInput] = React.useState(false);
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : "C";

  return (
    <div className="flex items-center gap-4">
      <div className="relative group shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-heading font-black text-xl shadow-2xs">
          {value ? (
            <img
              src={value}
              alt={name || "Avatar"}
              className="w-full h-full object-cover"
              onError={() => onChange("")}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowInput(!showInput)}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
          title="Change profile avatar"
        >
          <Camera className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {showInput ? (
          <div className="space-y-1">
            <Label htmlFor="avatar_input" className="text-[11px] font-semibold text-muted-foreground">
              Avatar Image Direct URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="avatar_input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://..."
                className="text-xs h-8"
              />
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="px-2 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Change profile photo
            </button>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              JPG, PNG or hosted WebP image URL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
