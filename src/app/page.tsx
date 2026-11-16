import { redirect } from "next/navigation";

/** 첫 화면은 시간표. 비로그인 사용자는 proxy 가 로그인 화면으로 보낸다. */
export default function HomePage() {
  redirect("/timetable");
}
