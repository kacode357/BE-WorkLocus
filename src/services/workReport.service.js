const WorkReport = require("../models/workReport.model");
const WorkType = require("../models/workType.model");
const Attendance = require("../models/attendance.model");
const { WORK_REPORT_MESSAGES } = require("../constants/workReport.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");
const createWorkReportService = async ({ userId, reportData }) => {
    try {
        const { work_type_name, description } = reportData;
        if (!work_type_name || !description) {
            return { status: 400, ok: false, message: WORK_REPORT_MESSAGES.CREATE_INFO_MISSING };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendanceRecord = await Attendance.findOne({ user_id: userId, work_date: today });
        if (!attendanceRecord) {
            return { status: 400, ok: false, message: WORK_REPORT_MESSAGES.MUST_CHECK_IN_FIRST };
        }
        if (attendanceRecord.check_out_time) {
            return { status: 400, ok: false, message: WORK_REPORT_MESSAGES.CANNOT_REPORT_AFTER_CHECK_OUT };
        }
        let workType = await WorkType.findOne({ name: work_type_name });
        if (!workType) {
            workType = await WorkType.create({ name: work_type_name, description: '' });
        }
        const newReport = await WorkReport.create({
            attendance_id: attendanceRecord._id,
            user_id: userId,
            work_type_id: workType._id,
            description,
        });
        const populatedReport = await WorkReport.findById(newReport._id).populate('work_type_id', 'name');
        return { status: 201, ok: true, message: WORK_REPORT_MESSAGES.CREATE_SUCCESS, data: populatedReport };
    } catch (error) {
        console.error("ERROR in createWorkReportService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const getMyTodaysReportsService = async ({ userId }) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reports = await WorkReport.find({
            user_id: userId,
            created_at: { $gte: today },
            is_deleted: false,
        })
        .populate('work_type_id', 'name')
        .sort({ created_at: 'desc' });
        return { status: 200, ok: true, message: WORK_REPORT_MESSAGES.GET_TODAY_REPORTS_SUCCESS, data: reports };
    } catch (error) {
        console.error("ERROR in getMyTodaysReportsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const updateWorkReportService = async ({ reportId, userId, updateData }) => {
    try {
        const { work_type_name, description } = updateData;
        const report = await WorkReport.findOne({ _id: reportId, user_id: userId, is_deleted: false });
        if (!report) {
            return { status: 404, ok: false, message: WORK_REPORT_MESSAGES.UPDATE_NOT_FOUND };
        }
        const attendanceRecord = await Attendance.findById(report.attendance_id);
        if (attendanceRecord && attendanceRecord.check_out_time) {
            return { status: 403, ok: false, message: WORK_REPORT_MESSAGES.CANNOT_UPDATE_AFTER_CHECK_OUT };
        }
        if (description) {
            report.description = description;
        }
        if (work_type_name) {
            let workType = await WorkType.findOne({ name: work_type_name });
            if (!workType) {
                workType = await WorkType.create({ name: work_type_name });
            }
            report.work_type_id = workType._id;
        }
        await report.save();
        const populatedReport = await report.populate('work_type_id', 'name');
        return { status: 200, ok: true, message: WORK_REPORT_MESSAGES.UPDATE_SUCCESS, data: populatedReport };
    } catch (error) {
        console.error("ERROR in updateWorkReportService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const deleteWorkReportService = async ({ reportId, userId }) => {
    try {
        const report = await WorkReport.findOne({ _id: reportId, user_id: userId, is_deleted: false });
        if (!report) {
            return { status: 404, ok: false, message: WORK_REPORT_MESSAGES.DELETE_NOT_FOUND };
        }
        const attendanceRecord = await Attendance.findById(report.attendance_id);
        if (attendanceRecord && attendanceRecord.check_out_time) {
            return { status: 403, ok: false, message: WORK_REPORT_MESSAGES.CANNOT_DELETE_AFTER_CHECK_OUT };
        }
        report.is_deleted = true;
        await report.save();
        return { status: 200, ok: true, message: WORK_REPORT_MESSAGES.DELETE_SUCCESS };
    } catch (error) {
        console.error("ERROR in deleteWorkReportService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getReportsByAttendanceIdService = async ({ attendanceId }) => {
    try {
        // Tìm tất cả các báo cáo có attendance_id tương ứng và chưa bị xóa
        const reports = await WorkReport.find({
            attendance_id: attendanceId,
            is_deleted: false,
        })
        .populate('work_type_id', 'name') // Lấy cả tên của loại công việc
        .sort({ created_at: 'desc' }); // Sắp xếp mới nhất lên đầu

        // Nếu không tìm thấy báo cáo nào
        if (!reports) {
            return {
                status: 200,
                ok: true,
                message: WORK_REPORT_MESSAGES.GET_REPORTS_SUCCESS,
                data: {
                    reports: [],
                    totalReports: 0,
                },
            };
        }

        // Trả về danh sách báo cáo và tổng số lượng
        return {
            status: 200,
            ok: true,
            message: WORK_REPORT_MESSAGES.GET_REPORTS_SUCCESS,
            data: {
                reports: reports,
                totalReports: reports.length,
            },
        };
    } catch (error) {
        console.error("ERROR in getReportsByAttendanceIdService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
module.exports = {
    createWorkReportService,
    getMyTodaysReportsService,
    updateWorkReportService,
    deleteWorkReportService,
      getReportsByAttendanceIdService,
};
