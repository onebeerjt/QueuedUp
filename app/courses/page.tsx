import Link from 'next/link';

import CourseCard from '@/app/components/courses/CourseCard';
import { COURSES } from '@/lib/course-data';

export default function CoursesPage(): JSX.Element {
  return (
    <main className="page">
      <section className="homeNavCard" style={{ maxWidth: 'none' }}>
        <div>
          <p className="homeNavEyebrow">Film Courses</p>
          <h2>Discovery Journeys</h2>
          <p>Start with a classic, end somewhere weird.</p>
        </div>
        <Link href="/discover" className="primaryButton" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Open Discover
        </Link>
      </section>

      <section className="coursesGrid">
        {COURSES.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}
      </section>
    </main>
  );
}
