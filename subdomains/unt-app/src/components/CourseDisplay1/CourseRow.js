import React, { useContext, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { AppContext } from '../../contexts/AppContext';
import CourseInfo from './CourseInfo';
import SemesterView from './SemesterView/SemesterView';

const ItemTypes = {
  ROW: 'row',
};

const CourseRow = ({ course, index, moveRow }) => {
  const { activeCourse } = useContext(AppContext);
  const ref = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ItemTypes.ROW,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ROW,
    item: () => ({ id: course.main_course_id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  const isSelected = !!activeCourse && activeCourse.main_course_id === course.main_course_id;

  return (
    <div
        ref={ref}
        style={{ opacity }}
        data-handler-id={handlerId}
        className={`course-row ${isSelected ? 'active' : ''}`}
    >
      <CourseInfo course={course} isSelected={isSelected} />
      <SemesterView course={course} isActiveRow={isSelected} />
    </div>
  );
};

export default React.memo(CourseRow);
