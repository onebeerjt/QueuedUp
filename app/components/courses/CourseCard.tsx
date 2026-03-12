import Link from 'next/link';

import type { Course } from '@/lib/course-data';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps): JSX.Element {
  return (
    <article className="courseCard">
      <p className="homeNavEyebrow">{course.theme}</p>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <Link href={`/courses/${course.slug}`} className="primaryButton" style={{ textDecoration: 'none', display: 'inline-flex' }}>
        Open Journey
      </Link>
    </article>
  );
}
