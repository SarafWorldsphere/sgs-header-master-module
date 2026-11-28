export default function ClassTeachersSection({ classTeachers }) {
  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Class Teachers</h2>
      </div>
<div className="table-scroll-wrapper">
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Teacher</th>
            <th>Section</th>
            <th>Academic Year</th>
          </tr>
        </thead>

        <tbody>
          {classTeachers.map((item, index) => (
            <tr key={index}>
              <td>{item.class_name}</td>
              <td>{item.class_teacher_name}</td>
              <td>{item.section_name}</td>
              <td>{item.academic_year}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}