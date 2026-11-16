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
  ai_enabled: boolean;
  style_rules: string;
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

export type SubjectRow = {
  id: string;
  owner_id: string;
  school_year: number;
  grade: number;
  name: string;
  created_at: string;
};

export type UnitRow = {
  id: string;
  owner_id: string;
  subject_id: string;
  order_no: number;
  title: string;
  created_at: string;
};

export type LessonRow = {
  id: string;
  owner_id: string;
  unit_id: string;
  order_no: number;
  title: string;
  created_at: string;
};

export type ProgressRecordRow = {
  id: string;
  owner_id: string;
  classroom_id: string;
  lesson_id: string;
  taught_on: string;
  created_at: string;
};

export type StudentRow = {
  id: string;
  owner_id: string;
  classroom_id: string;
  student_number: number;
  is_active: boolean;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  owner_id: string;
  subject_id: string;
  unit_id: string | null;
  title: string;
  criteria_a: string;
  criteria_b: string;
  criteria_c: string;
  created_at: string;
  updated_at: string;
};

export type Grade = "A" | "B" | "C";

export type AssessmentResultRow = {
  id: string;
  owner_id: string;
  assessment_id: string;
  student_id: string;
  grade: Grade | null;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        {
          id: string;
          teacher_type?: TeacherType;
          specialist_subjects?: string[];
          ai_enabled?: boolean;
          style_rules?: string;
        }
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
      subjects: Table<
        SubjectRow,
        { owner_id: string; school_year: number; grade: number; name: string }
      >;
      units: Table<
        UnitRow,
        { owner_id: string; subject_id: string; order_no: number; title: string }
      >;
      lessons: Table<
        LessonRow,
        { owner_id: string; unit_id: string; order_no: number; title: string }
      >;
      progress_records: Table<
        ProgressRecordRow,
        { owner_id: string; classroom_id: string; lesson_id: string; taught_on: string }
      >;
      students: Table<
        StudentRow,
        { owner_id: string; classroom_id: string; student_number: number; is_active?: boolean }
      >;
      assessments: Table<
        AssessmentRow,
        {
          owner_id: string;
          subject_id: string;
          unit_id?: string | null;
          title: string;
          criteria_a?: string;
          criteria_b?: string;
          criteria_c?: string;
        }
      >;
      assessment_results: Table<
        AssessmentResultRow,
        {
          owner_id: string;
          assessment_id: string;
          student_id: string;
          grade?: Grade | null;
          comment?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      save_unit: {
        Args: {
          p_subject_id: string;
          p_unit_id: string | null;
          p_title: string;
          p_lessons: string[];
        };
        Returns: string;
      };
      consume_ai_request: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_student_count: {
        Args: { p_classroom_id: string; p_count: number };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
