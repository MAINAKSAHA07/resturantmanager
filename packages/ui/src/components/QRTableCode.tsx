'use client';

import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export interface QRTableCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export function QRTableCode({ url, size = 256, className = '' }: QRTableCodeProps) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="p-4 bg-white rounded-lg border border-brand-200">
        <QRCodeCanvas value={url} size={size} includeMargin />
      </div>
      <div className="text-center">
        <p className="text-xs text-brand-600 break-all max-w-md">{url}</p>
      </div>
    </div>
  );
}

