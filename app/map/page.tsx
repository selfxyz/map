import MapChart from "@/components/map/home-map";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Coverage map",
  description: "World map of Self coverage",
  metadataBase: new URL('https://self.xyz'),
};

export default function GlobalMap() {
  return (
    <>
      <main className={`main relative h-full-screen`}>
        <MapChart />
      </main>
    </>
  );
}
