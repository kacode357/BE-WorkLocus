const Attendance = require("../models/attendance.model");
const Workplace = require("../models/workplace.model");
const Task = require("../models/task.model");
const { ATTENDANCE_MESSAGES } = require("../constants/attendance.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");
const { getDistanceInMeters } = require("../utils/location");

const getAttendanceStatusService = async ({ userId }) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysAttendance = await Attendance.findOne({
            user_id: userId,
            work_date: today,
        });

        if (!todaysAttendance) {
            return {
                status: 200,
                ok: true,
                message: ATTENDANCE_MESSAGES.NOT_YET_CHECKED_IN,
                data: {
                    status: 'NOT_CHECKED_IN',
                    morning: { isCheckedIn: false, isCheckedOut: false },
                    afternoon: { isCheckedIn: false, isCheckedOut: false },
                },
            };
        }

        const morningStatus = todaysAttendance.morning.check_in_time
            ? todaysAttendance.morning.check_out_time
                ? 'CHECKED_OUT'
                : 'CHECKED_IN'
            : 'NOT_CHECKED_IN';

        const afternoonStatus = todaysAttendance.afternoon.check_in_time
            ? todaysAttendance.afternoon.check_out_time
                ? 'CHECKED_OUT'
                : 'CHECKED_IN'
            : 'NOT_CHECKED_IN';

        return {
            status: 200,
            ok: true,
            message: ATTENDANCE_MESSAGES.STATUS_CHECKED,
            data: {
                morning: {
                    status: morningStatus,
                    isCheckedIn: !!todaysAttendance.morning.check_in_time,
                    isCheckedOut: !!todaysAttendance.morning.check_out_time,
                    checkInTime: todaysAttendance.morning.check_in_time,
                    checkOutTime: todaysAttendance.morning.check_out_time,
                    totalWorkTime: todaysAttendance.morning.total_work_time,
                },
                afternoon: {
                    status: afternoonStatus,
                    isCheckedIn: !!todaysAttendance.afternoon.check_in_time,
                    isCheckedOut: !!todaysAttendance.afternoon.check_out_time,
                    checkInTime: todaysAttendance.afternoon.check_in_time,
                    checkOutTime: todaysAttendance.afternoon.check_out_time,
                    totalWorkTime: todaysAttendance.afternoon.total_work_time,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in getAttendanceStatusService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const checkInService = async ({ userId, checkInData }) => {
    try {
        let { latitude, longitude, reason, shift } = checkInData;
        if (!['morning', 'afternoon'].includes(shift)) {
            return { status: 400, ok: false, message: "Ca làm việc không hợp lệ. Phải là 'morning' hoặc 'afternoon'." };
        }

        const numLatitude = parseFloat(latitude);
        const numLongitude = parseFloat(longitude);

        if (isNaN(numLatitude) || isNaN(numLongitude)) {
            return { status: 400, ok: false, message: "Tọa độ latitude hoặc longitude không hợp lệ." };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendanceRecord = await Attendance.findOne({ user_id: userId, work_date: today });

        if (!attendanceRecord) {
            attendanceRecord = await Attendance.create({
                user_id: userId,
                work_date: today,
                morning: {},
                afternoon: {},
            });
        }

        if (attendanceRecord[shift].check_in_time) {
            return { status: 409, ok: false, message: `Bạn đã check-in ca ${shift} hôm nay.` };
        }

        const workplace = await Workplace.findOne();
        if (!workplace) {
            return { status: 400, ok: false, message: "Địa điểm làm việc chưa được thiết lập." };
        }

        const distance = getDistanceInMeters(numLatitude, numLongitude, workplace.latitude, workplace.longitude);
        const MAX_DISTANCE_METERS = 50;

        let updateData = {
            [`${shift}.check_in_time`]: new Date(),
            [`${shift}.check_in_latitude`]: numLatitude,
            [`${shift}.check_in_longitude`]: numLongitude,
            [`${shift}.is_remote_check_in`]: false,
            [`${shift}.check_in_reason`]: null,
        };

        let message = ATTENDANCE_MESSAGES.CHECK_IN_SUCCESS;

        if (distance > MAX_DISTANCE_METERS) {
            if (!reason) {
                return { status: 400, ok: false, message: "Bạn đang ở ngoài phạm vi. Vui lòng cung cấp lý do để check-in." };
            }
            updateData[`${shift}.is_remote_check_in`] = true;
            updateData[`${shift}.check_in_reason`] = reason;
            message = `Check-in từ xa ca ${shift} thành công. Lý do của bạn đã được ghi nhận.`;
        }

        await Attendance.updateOne(
            { _id: attendanceRecord._id },
            { $set: updateData }
        );

        const updatedRecord = await Attendance.findById(attendanceRecord._id);
        return { 
            status: 201, 
            ok: true, 
            message, 
            data: updatedRecord 
        };
    } catch (error) {
        console.error("ERROR in checkInService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const checkOutService = async ({ userId, checkOutData }) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let { latitude, longitude, reason, shift } = checkOutData;

        if (!['morning', 'afternoon'].includes(shift)) {
            return { status: 400, ok: false, message: "Ca làm việc không hợp lệ. Phải là 'morning' hoặc 'afternoon'." };
        }

        const attendanceRecord = await Attendance.findOne({
            user_id: userId,
            work_date: today,
        });

        if (!attendanceRecord) {
            return { status: 404, ok: false, message: ATTENDANCE_MESSAGES.NOT_YET_CHECKED_IN };
        }

        if (!attendanceRecord[shift].check_in_time) {
            return { status: 400, ok: false, message: `Bạn chưa check-in ca ${shift} hôm nay.` };
        }

        if (attendanceRecord[shift].check_out_time) {
            return { status: 409, ok: false, message: `Bạn đã check-out ca ${shift} hôm nay.` };
        }

        const numLatitude = parseFloat(latitude);
        const numLongitude = parseFloat(longitude);

        if (isNaN(numLatitude) || isNaN(numLongitude)) {
            return { status: 400, ok: false, message: "Tọa độ latitude hoặc longitude không hợp lệ." };
        }

        const workplace = await Workplace.findOne();
        let updateData = {
            [`${shift}.check_out_time`]: new Date(),
            [`${shift}.check_out_latitude`]: numLatitude,
            [`${shift}.check_out_longitude`]: numLongitude,
            [`${shift}.is_remote_check_out`]: false,
            [`${shift}.check_out_reason`]: null,
        };

        if (workplace) {
            const distance = getDistanceInMeters(numLatitude, numLongitude, workplace.latitude, workplace.longitude);
            if (distance > 50) {
                if (!reason) {
                    return { status: 400, ok: false, message: "Bạn đang ở ngoài phạm vi. Vui lòng cung cấp lý do để check-out." };
                }
                updateData[`${shift}.is_remote_check_out`] = true;
                updateData[`${shift}.check_out_reason`] = reason;
            }
        }

        const checkOutTime = new Date();
        const durationMs = checkOutTime - attendanceRecord[shift].check_in_time;
        const totalMinutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        updateData[`${shift}.total_work_time`] = `${hours} giờ ${minutes} phút`;

        await Attendance.updateOne(
            { _id: attendanceRecord._id },
            { $set: updateData }
        );

        const updatedRecord = await Attendance.findById(attendanceRecord._id);
        return { 
            status: 200, 
            ok: true, 
            message: ATTENDANCE_MESSAGES.CHECK_OUT_SUCCESS, 
            data: updatedRecord 
        };
    } catch (error) {
        console.error("ERROR in checkOutService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const getMyAttendanceHistoryService = async ({ userId, searchCondition, pageInfo }) => {
    try {
        const { date_from, date_to } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = { user_id: userId };

        if (date_from && date_to) {
            queryConditions.work_date = { $gte: new Date(date_from), $lte: new Date(date_to) };
        } else if (date_from) {
            queryConditions.work_date = { $gte: new Date(date_from) };
        } else if (date_to) {
            queryConditions.work_date = { $lte: new Date(date_to) };
        }

        const totalRecords = await Attendance.countDocuments(queryConditions);
        const records = await Attendance.find(queryConditions)
            .sort({ work_date: 'desc' })
            .skip(skip)
            .limit(limit);

        return {
            status: 200,
            ok: true,
            message: ATTENDANCE_MESSAGES.GET_HISTORY_SUCCESS,
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in getMyAttendanceHistoryService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};



module.exports = {
 
    getAttendanceStatusService,
    checkInService,
    checkOutService,
    getMyAttendanceHistoryService,
};