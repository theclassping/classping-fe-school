export interface ActivityImage {
  id: number;
  student_id: number | null;
  image_data: {
    id: string;
    size: number;
    width: number;
    height: number;
    storage: string;
    filename: string;
    object_key: string;
    content_type: string;
  };
  image_url: string;
  caption: string;
  position: number;
}

export interface ActivityStudent {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  date_of_birth: string;
  gender: string;
  nickname: string;
  location_id: number | null;
  enroll_date: string;
}

export interface ActivityDetail {
  id: number;
  class_teacher_id: number;
  class_id: number;
  class_name: string;
  name: string;
  description: string;
  activity_date: string;
  is_publish: boolean;
  activity_images: ActivityImage[];
  activity_students: ActivityStudent[];
  created_at: string;
  updated_at: string;
}