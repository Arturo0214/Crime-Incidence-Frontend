import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getCurrentWeek } from '../../utils/dateUtils';
import { fetchAttendance } from '../../actions/attendanceActions';

const Gabinete = () => {
    const { user } = useSelector(state => state.user);
    const { loading } = useSelector(state => state.attendance);
    const dispatch = useDispatch();
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

    useEffect(() => {
        if (user) {
            dispatch(fetchAttendance());
        }
    }, [dispatch, user]);

    const handleWeekChange = (week) => {
        setSelectedWeek(week);
    };

    return (
        <div>
            {/* Render gabinete content */}
        </div>
    );
};

export default Gabinete; 