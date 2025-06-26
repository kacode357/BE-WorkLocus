const Attendance = require("../models/attendance.model");
const { ATTENDANCE_MESSAGES } = require("../constants/attendance.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

// HÀM MỚI: Kiểm tra trạng thái chấm công trong ngày
const getAttendanceStatusService = async ({ userId }) => {
    try {
        // Lấy ngày hôm nay, set về đầu ngày (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Bước 1: Tìm BẤT KỲ bản ghi chấm công nào của hôm nay
        // Bỏ điều kiện check_out_time: null để tìm cả record đã check-out rồi
        const todaysAttendance = await Attendance.findOne({
            user_id: userId,
            work_date: today,
        });

        // Bước 2: Phân tích kết quả tìm được
        if (!todaysAttendance) {
            // TRẠNG THÁI 1: Chưa check-in trong ngày
            return {
                status: 200,
                ok: true,
                message: ATTENDANCE_MESSAGES.NOT_YET_CHECKED_IN,
                data: {
                    status: 'NOT_CHECKED_IN', // Trạng thái rõ ràng
                    isCheckedIn: false,
                    isCheckedOut: false,
                },
            };
        }

        if (todaysAttendance.check_out_time) {
            // TRẠNG THÁI 2: Đã check-out
            return {
                status: 200,
                ok: true,
                message: ATTENDANCE_MESSAGES.ALREADY_CHECKED_OUT,
                data: {
                    status: 'CHECKED_OUT', // Trạng thái rõ ràng
                    isCheckedIn: true,
                    isCheckedOut: true,
                    checkInTime: todaysAttendance.check_in_time,
                    checkOutTime: todaysAttendance.check_out_time,
                    totalWorkTime: todaysAttendance.total_work_time,
                },
            };
        } else {
            // TRẠNG THÁI 3: Đã check-in và đang làm việc
            return {
                status: 200,
                ok: true,
                message: ATTENDANCE_MESSAGES.ALREADY_CHECKED_IN,
                data: {
                    status: 'CHECKED_IN', // Trạng thái rõ ràng
                    isCheckedIn: true,
                    isCheckedOut: false,
                    checkInTime: todaysAttendance.check_in_time,
                },
            };
        }
    } catch (error) {
        console.error("ERROR in getAttendanceStatusService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};


const checkInService = async ({ userId, checkInData }) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            user_id: userId,
            work_date: today,
        });

        if (existingAttendance) {
            return { status: 409, ok: false, message: ATTENDANCE_MESSAGES.ALREADY_CHECKED_IN };
        }

        const newAttendance = await Attendance.create({
            user_id: userId,
            check_in_time: new Date(),
            work_date: today,
            check_in_latitude: checkInData.latitude,
            check_in_longitude: checkInData.longitude,
        });

        return { status: 201, ok: true, message: ATTENDANCE_MESSAGES.CHECK_IN_SUCCESS, data: newAttendance };
    } catch (error) {
        console.error("ERROR in checkInService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const checkOutService = async ({ userId, checkOutData }) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendanceRecord = await Attendance.findOne({
            user_id: userId,
            work_date: today,
        });

        if (!attendanceRecord) {
            return { status: 404, ok: false, message: ATTENDANCE_MESSAGES.NOT_YET_CHECKED_IN };
        }

        if (attendanceRecord.check_out_time) {
            return { status: 409, ok: false, message: ATTENDANCE_MESSAGES.ALREADY_CHECKED_OUT };
        }

        const checkOutTime = new Date();
        attendanceRecord.check_out_time = checkOutTime;
        attendanceRecord.check_out_latitude = checkOutData.latitude;
        attendanceRecord.check_out_longitude = checkOutData.longitude;

        const checkInTime = attendanceRecord.check_in_time;
        const durationMs = checkOutTime - checkInTime;

        const totalMinutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        attendanceRecord.total_work_time = `${hours} giờ ${minutes} phút`;
        
        await attendanceRecord.save();

        return { status: 200, ok: true, message: ATTENDANCE_MESSAGES.CHECK_OUT_SUCCESS, data: attendanceRecord };
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
    getAttendanceStatusService, // Thêm hàm mới vào export
    checkInService,
    checkOutService,
    getMyAttendanceHistoryService,
};
