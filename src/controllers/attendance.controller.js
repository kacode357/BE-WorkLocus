const AttendanceService = require("../services/attendance.service");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in attendance controller:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

// CONTROLLER MỚI:
const getAttendanceStatusController = (req, res) => {
    const userId = req.user._id;
    handleRequest(() => AttendanceService.getAttendanceStatusService({ userId }), res);
};

const checkInController = (req, res) => {
    const userId = req.user._id;
    const { latitude, longitude, reason, shift } = req.body;
    handleRequest(
        () => AttendanceService.checkInService({ userId, checkInData: { latitude, longitude, reason, shift } }),
        res
    );
};

const checkOutController = (req, res) => {
    const userId = req.user._id;
    const { latitude, longitude, reason, shift } = req.body;
    handleRequest(
        () => AttendanceService.checkOutService({ userId, checkOutData: { latitude, longitude, reason, shift } }),
        res
    );
};

const getMyAttendanceHistoryController = (req, res) => {
    const userId = req.user._id;
    const { searchCondition = {}, pageInfo = {} } = req.body;
    handleRequest(() => AttendanceService.getMyAttendanceHistoryService({ userId, searchCondition, pageInfo }), res);
};
const logTaskController = (req, res) => {
    const userId = req.user._id;
    const { taskId } = req.body;
    handleRequest(() => AttendanceService.logTaskToAttendanceService({ userId, taskId }), res);
};
module.exports = {
    logTaskController,
    getAttendanceStatusController,
    checkInController,
    checkOutController,
    getMyAttendanceHistoryController,
};
