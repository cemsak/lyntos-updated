import React from "react";

export default function Avatar({ name }: { name: string }) {
  // Baş harfini gösteren daire avatar
  const initials = name ? name.trim()[0].toUpperCase() : "?";
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#2962ff",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 18,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}