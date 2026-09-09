"use client";

import React from 'react';

export default function PrintButton({ label = "Print to PDF (Ctrl+P)" }) {
  return (
    <button 
      onClick={() => window.print()} 
      className="btn-secondary" 
      style={{ padding: "0.5rem 1.5rem" }}
    >
      {label}
    </button>
  );
}
