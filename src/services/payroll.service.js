const User = require('../models/user.model');
const Attendance = require('../models/attendance.model');
const PerformanceReview = require('../models/performanceReview.model');
const Payroll = require('../models/payroll.model');
const PerformanceBonus = require('../models/performanceBonus.model');
const sendEmail = require('../utils/sendEmail');
const { PAYROLL_MESSAGES } = require('../constants/payroll.messages');
const { ADMIN_MESSAGES } = require('../constants/admin.messages');
const { GENERAL_MESSAGES } = require('../constants/auth.messages');

// Trả về mảng các ngày T2-T7 trong tháng (loại CN)
function getWorkingDaysInMonth(year, month) {
    let days = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
        if (d.getDay() !== 0) days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}
// Chênh giờ giữa 2 time
function hoursDiff(start, end) {
    if (!start || !end) return 0;
    return (end - start) / (1000 * 60 * 60);
}

const calculatePayrollService = async (payrollInput) => {
    try {
        const {
            user_id,
            month,
            year,
            diligence_required_days,
            diligence_bonus_amount,
            other_bonus,
            ot_multiplier, // nhập số, ví dụ 1.2 (mặc định 1.2 nếu không nhập)
            dev_mode
        } = payrollInput;

        if (!user_id || !month || !year || diligence_required_days === undefined || diligence_bonus_amount === undefined) {
            return { status: 400, ok: false, message: PAYROLL_MESSAGES.INFO_MISSING };
        }

        // Lấy user
        const user = await User.findById(user_id);
        if (!user) return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };

        // Check payroll cũ
        const existingPayroll = await Payroll.findOne({ user_id, month, year });
        if (existingPayroll) {
            return {
                status: 409,
                ok: false,
                message: `Lương cho nhân viên này trong tháng ${month}/${year} đã được tính trước đó.`
            };
        }

        // Bonus hiệu quả
        const bonusRules = await PerformanceBonus.find({ is_active: true });
        if (!bonusRules || bonusRules.length === 0) {
            return { status: 500, ok: false, message: "Lỗi hệ thống: Chưa có cấu hình tiền thưởng hiệu quả nào được thiết lập." };
        }
        const performance_bonus_config = bonusRules.reduce((config, rule) => {
            config[rule.grade] = rule.bonus_amount;
            return config;
        }, {});

        // Lấy đánh giá hiệu quả
        const review = await PerformanceReview.findOne({ user_id, month, year });
        if (!review) {
            return { status: 400, ok: false, message: PAYROLL_MESSAGES.REVIEW_NOT_FOUND(month, year) };
        }

        // Tham số chuẩn
        const MIN_HOUR_FOR_FULL_DAY = 8 + 10 / 60; // 8.1667h
        const OT_MULTIPLIER = (typeof ot_multiplier === 'number' && ot_multiplier > 0) ? ot_multiplier : 1.2;

        // Lấy attendance
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const attendances = await Attendance.find({
            user_id,
            is_deleted: false,
            work_date: { $gte: startDate, $lte: endDate }
        });

        // Ngày làm việc
        let working_dates = [];
        if (dev_mode) {
            working_dates = attendances.map(a => a.work_date);
        } else {
            working_dates = getWorkingDaysInMonth(year, month);
        }

        // Map attendance theo ngày yyyy-mm-dd
        let dayMap = {};
        attendances.forEach(atd => {
            const d = atd.work_date.toISOString().slice(0, 10);
            dayMap[d] = atd;
        });

        let working_days = 0;
        let overtime_hours = 0;
        let lateness_count = 0;
        let lateness_details = [];
        let lacking_days = 0;
        let all_day_details = [];

        for (let day of working_dates) {
            const dayStr = (typeof day === "string") ? day : day.toISOString().slice(0, 10);
            const atd = dayMap[dayStr];
            let totalHours = 0;
            let isLate = false;
            let lateTypes = [];

            if (atd) {
                const m = atd.morning || {};
                const a = atd.afternoon || {};

                let m_in = m.check_in_time ? new Date(m.check_in_time) : null;
                let m_out = m.check_out_time ? new Date(m.check_out_time) : null;
                let a_in = a.check_in_time ? new Date(a.check_in_time) : null;
                let a_out = a.check_out_time ? new Date(a.check_out_time) : null;

                let morningHours = hoursDiff(m_in, m_out);
                let afternoonHours = hoursDiff(a_in, a_out);

                // Đi trễ sáng (>8:00)
                if (m_in && (m_in.getHours() > 8 || (m_in.getHours() === 8 && m_in.getMinutes() > 0))) {
                    isLate = true;
                    lateness_count++;
                    lateTypes.push("late-morning");
                    lateness_details.push({
                        date: dayStr,
                        ca: "morning",
                        hour: m_in.getHours(),
                        minute: m_in.getMinutes(),
                        lateType: "late-morning"
                    });
                }
                // Đi trễ chiều (>13:00)
                if (a_in && (a_in.getHours() > 13 || (a_in.getHours() === 13 && a_in.getMinutes() > 0))) {
                    isLate = true;
                    lateness_count++;
                    lateTypes.push("late-afternoon");
                    lateness_details.push({
                        date: dayStr,
                        ca: "afternoon",
                        hour: a_in.getHours(),
                        minute: a_in.getMinutes(),
                        lateType: "late-afternoon"
                    });
                }

                totalHours = (morningHours > 0 ? morningHours : 0) + (afternoonHours > 0 ? afternoonHours : 0);

                if (totalHours >= MIN_HOUR_FOR_FULL_DAY) {
                    working_days++;
                } else {
                    lacking_days++;
                }
                if (totalHours > MIN_HOUR_FOR_FULL_DAY) {
                    overtime_hours += (totalHours - MIN_HOUR_FOR_FULL_DAY);
                }
            } else {
                lacking_days++;
            }

            all_day_details.push({
                date: dayStr,
                totalHours,
                isLate,
                lateTypes
            });
        }

        // Dùng OT bù thiếu ngày trước, dư mới tính tiền
        let hour_need_to_bu = lacking_days * MIN_HOUR_FOR_FULL_DAY;
        let ot_to_bu = Math.min(overtime_hours, hour_need_to_bu);
        working_days += Math.floor(ot_to_bu / MIN_HOUR_FOR_FULL_DAY);
        overtime_hours -= ot_to_bu;

        let diligence_bonus = (working_days >= diligence_required_days) ? diligence_bonus_amount : 0;
        const base_salary = working_days * user.base_salary_per_day;
        let ot_salary = overtime_hours * (user.base_salary_per_day / 8) * OT_MULTIPLIER;
        const performance_bonus = performance_bonus_config[review.grade] || 0;
        const total_salary = base_salary + diligence_bonus + performance_bonus + ot_salary + (other_bonus || 0);

        const payrollData = {
            user_id, month, year,
            working_days,
            diligence_required_days,
            base_salary_per_day: user.base_salary_per_day,
            base_salary,
            diligence_bonus,
            performance_bonus,
            other_bonus: other_bonus || 0,
            total_salary,
            ot_hours: Math.round(overtime_hours * 100) / 100,
            ot_salary: Math.round(ot_salary),
            lateness_count,
            lateness_details,
            status: 'pending',
            all_day_details
        };

        const newPayroll = await Payroll.create(payrollData);
        const finalPayroll = await Payroll.findById(newPayroll._id).populate('user_id', 'full_name email');

        // Email chi tiết lượt đi trễ
        let latenessHtml = '';
        if (lateness_details.length > 0) {
            latenessHtml = `
                <p>Các lượt đi trễ:</p>
                <ul>
                    ${lateness_details.map(late =>
                        `<li>${late.date} - ${late.ca === "morning" ? "Trễ sáng" : "Trễ chiều"} (${late.hour.toString().padStart(2, '0')}:${late.minute.toString().padStart(2, '0')})</li>`
                    ).join('')}
                </ul>
            `;
        }

        try {
            const emailSubject = `[WorkLocus] Bảng lương tháng ${month}/${year} của bạn`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Thông Báo Lương Tháng ${month}/${year}</h2>
                    <p>Xin chào <strong>${user.full_name}</strong>,</p>
                    <p>Chi tiết bảng lương tháng ${month}/${year}:</p>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                        <thead style="background-color: #f2f2f2;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Diễn giải</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Số tiền (VNĐ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Đơn giá lương ngày</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${user.base_salary_per_day.toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Số ngày công thực tế</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${working_days}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Lương cơ bản</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${base_salary.toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng chuyên cần (đủ ${diligence_required_days} ngày)</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${diligence_bonus.toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng hiệu quả (hạng ${review.grade})</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${performance_bonus.toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Thưởng/Phụ cấp khác</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${(other_bonus || 0).toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Số giờ làm thêm thực nhận</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.round(overtime_hours * 100) / 100} giờ</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Tiền làm thêm giờ (hệ số ${OT_MULTIPLIER})</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">+ ${Math.round(ot_salary).toLocaleString('vi-VN')}</td>
                            </tr>
                            <tr style="background-color: #f2f2f2;">
                                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">TỔNG THỰC LÃNH</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 1.1em;">${total_salary.toLocaleString('vi-VN')}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p>Số lượt đi trễ trong tháng: <b>${lateness_count}</b></p>
                    ${latenessHtml}
                    <p>Lương sẽ được thanh toán theo chính sách của công ty.</p>
                </div>
            `;
            await sendEmail(user.email, emailSubject, emailHtml);
            console.log(`✅ Gửi mail lương thành công cho ${user.email}`);
        } catch (emailError) {
            console.error(`❌ Lỗi khi gửi mail lương cho ${user.email}:`, emailError);
        }

        return { status: 201, ok: true, message: PAYROLL_MESSAGES.CALCULATION_SUCCESS, data: finalPayroll };

    } catch (error) {
        console.error("ERROR in calculatePayrollService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

// Tìm kiếm payrolls
const searchPayrollsService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, user_id, month, year } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = {};

        if (keyword) {
            const users = await User.find({
                full_name: { $regex: keyword, $options: 'i' }
            }).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length === 0) {
                return { status: 200, ok: true, message: "Không tìm thấy nhân viên nào.", data: { records: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 } } };
            }
            queryConditions.user_id = { $in: userIds };
        }
        if (user_id) queryConditions.user_id = user_id;
        if (month) queryConditions.month = month;
        if (year) queryConditions.year = year;

        const totalRecords = await Payroll.countDocuments(queryConditions);
        const records = await Payroll.find(queryConditions)
            .populate('user_id', 'full_name email role')
            .sort({ year: -1, month: -1, created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: "Tìm kiếm lịch sử lương thành công.",
            data: {
                records,
                pagination: { currentPage: page, totalPages: Math.ceil(totalRecords / limit), totalRecords },
            },
        };
    } catch (error) {
        console.error("ERROR in searchPayrollsService:", error);
        return { status: 500, ok: false, message: "Lỗi hệ thống khi tìm kiếm lịch sử lương." };
    }
};

module.exports = {
    calculatePayrollService,
    searchPayrollsService,
};
