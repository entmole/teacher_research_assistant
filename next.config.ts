import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 화면이 로그인한 교사별 동적 화면이므로 Cache Components 는 쓰지 않고,
  // NEIS 응답만 fetch 의 revalidate 옵션으로 캐시한다.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
