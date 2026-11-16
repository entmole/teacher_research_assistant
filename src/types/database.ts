/**
 * Supabase 테이블 타입. supabase/migrations 의 스키마와 일치해야 한다.
 * (Supabase CLI 연결 후에는 `supabase gen types typescript` 결과로 교체 가능)
 */
export type TeacherType = "homeroom" | "specialist";

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  teacher_type: TeacherType;
  specialist_subjects: string[];
  created_at: string;
  updated_at: string;
};

export type SchoolSettingsRow = {
  owner_id: string;
  atpt_code: string;
  atpt_name: string;
  school_code: string;
  school_name: string;
  created_at: string;
  updated_at: string;
};

export type ClassroomRow = {
  id: string;
  owner_id: string;
  school_year: number;
  grade: number;
  class_nm: string;
  created_at: string;
};

export type TimetableOverrideRow = {
  id: string;
  owner_id: string;
  classroom_id: string;
  date: string;
  period: number;
  subject: string;
  memo: string;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomEventRow = {
  id: string;
  owner_id: string;
  date: string;
  title: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        { id: string; teacher_type?: TeacherType; specialist_subjects?: string[] }
      >;
      school_settings: Table<
        SchoolSettingsRow,
        {
          owner_id: string;
          atpt_code: string;
          atpt_name: string;
          school_code: string;
          school_name: string;
        }
      >;
      classrooms: Table<
        ClassroomRow,
        { owner_id: string; school_year: number; grade: number; class_nm: string }
      >;
      timetable_overrides: Table<
        TimetableOverrideRow,
        {
          owner_id: string;
          classroom_id: string;
          date: string;
          period: number;
          subject: string;
          memo?: string;
          is_cancelled?: boolean;
        }
      >;
      custom_events: Table<CustomEventRow, { owner_id: string; date: string; title: string }>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
